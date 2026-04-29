// src/lib/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  getAuth,
} from "firebase/auth";
import {
  doc, setDoc, updateDoc, getDoc, getDocs, deleteDoc,
  collection, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import { initializeApp, deleteApp, getApps, FirebaseApp } from "firebase/app";
import { auth, db } from "./firebase";

// ── Permission definitions ────────────────────────────────────────────────────

export const ALL_PERMISSIONS = [
  { key: "page_dashboard", label: "ເຂົ້າຫນ້າ Dashboard",      group: "ໜ້າທີ່ເຂົ້າໄດ້" },
  { key: "page_issues",    label: "ເຂົ້າຫນ້າ ລາຍງານບັນຫາ",   group: "ໜ້າທີ່ເຂົ້າໄດ້" },
  { key: "page_users",     label: "ເຂົ້າຫນ້າ ຈັດການ Users",   group: "ໜ້າທີ່ເຂົ້າໄດ້" },
  { key: "issue_add",      label: "ເພີ່ມ Issue ໃໝ່",           group: "ການຈັດການ Issue" },
  { key: "issue_edit",     label: "ແກ້ໄຂ Issue",               group: "ການຈັດການ Issue" },
  { key: "issue_delete",   label: "ລຶບ Issue",                  group: "ການຈັດການ Issue" },
  { key: "issue_import",   label: "Import Excel",               group: "ການຈັດການ Issue" },
  { key: "issue_export",   label: "Export Excel",               group: "ການຈັດການ Issue" },
  { key: "issue_print",    label: "ພິມລາຍງານ (Print)",          group: "ການຈັດການ Issue" },
  { key: "user_manage",    label: "ສ້າງ/ແກ້ໄຂ/ລຶບ User",       group: "ການຈັດການ User" },
] as const;

export type PermKey = typeof ALL_PERMISSIONS[number]["key"];
export type Permissions = Record<string, boolean>;

export const DEFAULT_PERMISSIONS: Permissions = {
  page_dashboard: false, page_issues: false, page_users: false,
  issue_add: false, issue_edit: false, issue_delete: false,
  issue_import: false, issue_export: false, issue_print: false, user_manage: false,
};

export const ADMIN_PERMISSIONS: Permissions = {
  page_dashboard: true, page_issues: true, page_users: true,
  issue_add: true, issue_edit: true, issue_delete: true,
  issue_import: true, issue_export: true, issue_print: true, user_manage: true,
};

// ── User type ─────────────────────────────────────────────────────────────────

export interface AppUser {
  uid:         string;
  email:       string;
  displayName: string;
  isAdmin:     boolean;
  active:      boolean;
  permissions: Permissions;
  createdAt?:  unknown;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginUser(email: string, password: string): Promise<AppUser> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(cred.user.uid);
  if (!profile) throw new Error("User profile not found");
  if (!profile.active) throw new Error("ບັນຊີນີ້ຖືກປິດໃຊ້ງານ");
  return profile;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// ── Profile CRUD ──────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const isAdmin = data.isAdmin === true || data.role === "admin";
  return {
    uid,
    email:       data.email       ?? "",
    displayName: data.displayName ?? "",
    isAdmin,
    active:      data.active      ?? true,
    permissions: isAdmin
      ? { ...ADMIN_PERMISSIONS }
      : { ...DEFAULT_PERMISSIONS, ...(data.permissions ?? {}) },
    createdAt:   data.createdAt,
  };
}

export async function getAllUsers(): Promise<AppUser[]> {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const isAdmin = data.isAdmin === true || data.role === "admin";
    return {
      uid:         d.id,
      email:       data.email       ?? "",
      displayName: data.displayName ?? "",
      isAdmin,
      active:      data.active      ?? true,
      permissions: isAdmin
        ? { ...ADMIN_PERMISSIONS }
        : { ...DEFAULT_PERMISSIONS, ...(data.permissions ?? {}) },
      createdAt:   data.createdAt,
    };
  });
}

// ── createUser ────────────────────────────────────────────────────────────────
// ແຍກການ create ອອກເປັນ 2 ຂັ້ນຕອນ:
// 1. ສ້າງ Firebase Auth account ດ້ວຍ secondary app (admin session ບໍ່ຫຼຸດ)
// 2. ຂຽນ profile + permissions ພ້ອມກັນ (setDoc ດຽວ ດ້ວຍ admin token)

export async function createUser(data: {
  email:       string;
  password:    string;
  displayName: string;
  isAdmin:     boolean;
  permissions: Permissions;
}): Promise<AppUser> {
  // ດຶງ config ຈາກ main Firebase app
  const mainApp = getApps().find(a => a.name === "[DEFAULT]");
  if (!mainApp) throw new Error("Firebase not initialized");
  const config = mainApp.options;

  const secondaryName = `__tmp_create_${Date.now()}`;
  let secondaryApp: FirebaseApp | null = null;
  let newUid = "";

  try {
    // ── ຂັ້ນຕອນ 1: ສ້າງ Auth account ຜ່ານ secondary app ──────────────────────
    secondaryApp = initializeApp(config, secondaryName);
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth, data.email, data.password
    );
    newUid = cred.user.uid;

    // Sign out secondary ທັນທີ ກ່ອນ ຂຽນ Firestore
    await signOut(secondaryAuth).catch(() => {});

    // ── ຂັ້ນຕອນ 2: ຂຽນ profile + permissions ພ້ອມກັນໃນ setDoc ດຽວ ────────────
    // ລວມ permissions ໃສ່ໃນ setDoc ທັນທີ ເພື່ອຫຼີກລ່ຽງ updateDoc ທີ່ອາດ fail
    // ເນື່ອງຈາກ rules allow create ສໍາລັບ uid ຕົວເອງ ແຕ່ allow update ຕ້ອງການ admin
    const rawPerms = data.isAdmin ? ADMIN_PERMISSIONS : data.permissions;
    // ລ້າງ key ຫວ່າງ ("") ອອກ ເພາະ Firestore ບໍ່ຍອມ empty field key
    const perms: Permissions = Object.fromEntries(
      Object.entries(rawPerms).filter(([k]) => k && k.trim() !== "")
    );
    await setDoc(doc(db, "users", newUid), {
      email:       data.email,
      displayName: data.displayName,
      isAdmin:     data.isAdmin,
      active:      true,
      permissions: perms,
      createdAt:   serverTimestamp(),
    });

    return {
      uid:         newUid,
      email:       data.email,
      displayName: data.displayName,
      isAdmin:     data.isAdmin,
      active:      true,
      permissions: perms,
    };

  } finally {
    if (secondaryApp) {
      await deleteApp(secondaryApp).catch(() => {});
    }
  }
}

// ── updateUserProfile ─────────────────────────────────────────────────────────

export async function updateUserProfile(
  uid: string,
  data: { displayName?: string; isAdmin?: boolean; active?: boolean; permissions?: Permissions }
): Promise<void> {
  const update: Record<string, unknown> = { ...data };
  if (data.isAdmin) update.permissions = ADMIN_PERMISSIONS;
  // ລ້າງ key ຫວ່າງ ("") ອອກຈາກ permissions ກ່ອນ save
  if (update.permissions && typeof update.permissions === "object") {
    update.permissions = Object.fromEntries(
      Object.entries(update.permissions as Permissions).filter(([k]) => k && k.trim() !== "")
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, "users", uid), update as any);
}

export async function toggleUserActive(uid: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, "users", uid), { active });
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}