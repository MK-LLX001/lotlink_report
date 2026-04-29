"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import {
  createUser, updateUserProfile, toggleUserActive, deleteUserProfile,
  ALL_PERMISSIONS, DEFAULT_PERMISSIONS, ADMIN_PERMISSIONS,
  type AppUser, type Permissions,
} from "@/lib/authService";
import {
  Plus, Pencil, Trash2, Power, PowerOff, X,
  AlertCircle, CheckCircle2, Shield, Eye, EyeOff,
  Users, RefreshCw, Crown, Globe, Folder,
  LayoutDashboard, ClipboardList, FileText, BarChart3,
  Settings, Bell, Star, Bookmark, Database,
  ShieldCheck, Tag, Package, Layers, ChevronDown,
  PieChart, TrendingUp, Receipt, Wallet, CreditCard,
  Building2, UserCheck, BarChart2, Activity,
} from "lucide-react";
import { type AppMenu } from "@/lib/menuService";
import { logActivity } from "@/lib/activityService";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, ClipboardList, Users, FileText, BarChart3,
  Settings, Bell, Star, Bookmark, Globe, Database,
  ShieldCheck, Folder, Tag, Package, Layers, ChevronDown,
  PieChart, TrendingUp, Receipt, Wallet, CreditCard,
  Building2, UserCheck, BarChart2, Activity,
};

function DynIcon({ name, size = 13 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? Folder;
  return <Icon size={size} />;
}

const STATIC_PERM_GROUPS = ALL_PERMISSIONS.reduce((acc, p) => {
  if (!acc[p.group]) acc[p.group] = [];
  acc[p.group].push(p);
  return acc;
}, {} as Record<string, typeof ALL_PERMISSIONS[number][]>);

// ── Modal mode: "create" = แค่ email+password, "edit" = แก้ permissions ──
type ModalMode = "create" | "edit" | null;

interface CreateForm {
  email: string;
  password: string;
  displayName: string;
}

interface EditForm {
  displayName: string;
  isAdmin: boolean;
  permissions: Permissions;
}

const BLANK_CREATE: CreateForm = { email: "", password: "", displayName: "" };

export default function UsersPage() {
  const { user: me, perm, menus: authMenus } = useAuth();
  const router = useRouter();

  const [users, setUsers]               = useState<AppUser[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);
  const [modal, setModal]               = useState<ModalMode>(null);
  const [editTarget, setEditTarget]     = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [showPwd, setShowPwd]           = useState(false);
  const [createForm, setCreateForm]     = useState<CreateForm>({ ...BLANK_CREATE });
  const [editForm, setEditForm]         = useState<EditForm | null>(null);

  // ใช้ menus จาก authContext แทนการ subscribe ซ้ำ
  const dynamicMenus: AppMenu[] = authMenus;

  // Realtime users listener — ไม่ต้อง re-fetch หลังทุก action
  const unsubUsersRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!perm("user_manage") && !perm("page_users")) { router.replace("/dashboard"); return; }

    import("firebase/firestore").then(({ collection, query, orderBy, onSnapshot }) => {
      import("@/lib/firebase").then(({ db }) => {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        unsubUsersRef.current = onSnapshot(q, (snap) => {
          const list: AppUser[] = snap.docs.map((d) => {
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
          setUsers(list);
          setLoading(false);
        });
      });
    });

    return () => { unsubUsersRef.current?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Open create modal — ແບບໃໝ່: ກໍ່ຕ້ອງໃສ່ແຕ່ ຊື່ + email + password ──
  const openCreate = () => {
    setCreateForm({ ...BLANK_CREATE });
    setModal("create");
    setError(null);
    setShowPwd(false);
  };

  // ── Open edit modal — ຄ່ອຍຕັ້ງ permissions ທີຫຼັງ ──
  const openEdit = (u: AppUser) => {
    setEditTarget(u);
    const perms: Permissions = { ...DEFAULT_PERMISSIONS, ...u.permissions };
    const seenKeys1 = new Set<string>();
    dynamicMenus
      .filter(m => m.active && m.type === "item" && m.permKey && m.permKey.trim() !== "")
      .forEach(m => { if (!seenKeys1.has(m.permKey)) { seenKeys1.add(m.permKey); if (!(m.permKey in perms)) perms[m.permKey] = false; } });
    setEditForm({ displayName: u.displayName, isAdmin: u.isAdmin, permissions: perms });
    setModal("edit");
    setError(null);
  };

  const closeModal = () => { setModal(null); setEditTarget(null); setEditForm(null); setError(null); };

  // edit form helpers
  const togglePerm = (key: string) => {
    if (!editForm || editForm.isAdmin) return;
    setEditForm(f => f ? { ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } } : f);
  };

  const setAdmin = (v: boolean) => {
    if (!editForm) return;
    if (v) {
      setEditForm(f => f ? { ...f, isAdmin: true, permissions: { ...ADMIN_PERMISSIONS } } : f);
    } else {
      const perms: Permissions = { ...DEFAULT_PERMISSIONS };
      const seenKeys2 = new Set<string>();
      dynamicMenus
        .filter(m => m.active && m.type === "item" && m.permKey && m.permKey.trim() !== "")
        .forEach(m => { if (!seenKeys2.has(m.permKey)) { seenKeys2.add(m.permKey); perms[m.permKey] = false; } });
      setEditForm(f => f ? { ...f, isAdmin: false, permissions: perms } : f);
    }
  };

  const selectAllPerms = (all: boolean) => {
    if (!editForm || editForm.isAdmin) return;
    const p: Permissions = {};
    ALL_PERMISSIONS.forEach(({ key }) => { p[key] = all; });
    const seenKeys3 = new Set<string>();
    dynamicMenus
      .filter(m => m.active && m.type === "item" && m.permKey && m.permKey.trim() !== "")
      .forEach(m => { if (!seenKeys3.has(m.permKey)) { seenKeys3.add(m.permKey); p[m.permKey] = all; } });
    setEditForm(f => f ? { ...f, permissions: p } : f);
  };

  // ── Create: ບັນທຶກ isAdmin=false + ທຸກ permissions=false ──────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.displayName.trim()) { setError("ກະລຸນາໃສ່ຊື່"); return; }
    if (createForm.password.length < 6) { setError("Password ຕ້ອງ 6 ຕົວຂຶ້ນໄປ"); return; }
    setSubmitting(true); setError(null);
    try {
      // ທຸກ permissions = false, isAdmin = false — ຄ່ອຍໄປຕັ້ງທີຫຼັງໃນໜ້າ Edit
      // filter permKey ຫວ່າງອອກ ເພາະ Firestore ບໍ່ຍອມໃຫ້ field key ເປັນ ""
      const allFalsePerms: Permissions = { ...DEFAULT_PERMISSIONS };
      const seenKeys4 = new Set<string>();
      dynamicMenus
        .filter(m => m.active && m.type === "item" && m.permKey && m.permKey.trim() !== "")
        .forEach(m => { if (!seenKeys4.has(m.permKey)) { seenKeys4.add(m.permKey); allFalsePerms[m.permKey] = false; } });

      await createUser({
        email:       createForm.email,
        password:    createForm.password,
        displayName: createForm.displayName,
        isAdmin:     false,
        permissions: allFalsePerms,
      });
      setSuccess(`ສ້າງ user "${createForm.displayName}" ສໍາເລັດ · ສາມາດກໍານົດສິດໄດ້ໃນ Edit`);
      if (me) logActivity({ uid: me.uid, displayName: me.displayName, email: me.email, action: "user_create", detail: createForm.displayName });
      closeModal();

    } catch (e: unknown) {
      const msg = (e as Error).message ?? "";
      setError(msg.includes("email-already-in-use") ? "Email ນີ້ຖືກໃຊ້ແລ້ວ" : "ສ້າງ user ຜິດພາດ: " + msg);
    } finally { setSubmitting(false); }
  };

  // ── Edit: ບັນທຶກ permissions + isAdmin ──────────────────────────────────────
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editForm) return;
    if (!editForm.displayName.trim()) { setError("ກະລຸນາໃສ່ຊື່"); return; }
    setSubmitting(true); setError(null);
    try {
      await updateUserProfile(editTarget.uid, {
        displayName: editForm.displayName,
        isAdmin:     editForm.isAdmin,
        permissions: editForm.permissions,
      });
      setSuccess(`ບັນທຶກ "${editForm.displayName}" ສໍາເລັດ`);
      if (me) logActivity({ uid: me.uid, displayName: me.displayName, email: me.email, action: "user_edit", detail: editForm.displayName });
      closeModal();

    } catch { setError("ແກ້ໄຂ user ຜິດພາດ"); }
    finally { setSubmitting(false); }
  };

  const handleToggleActive = async (u: AppUser) => {
    if (u.uid === me?.uid) { setError("ບໍ່ສາມາດປິດໃຊ້ງານຕົນເອງໄດ້"); return; }
    try {
      await toggleUserActive(u.uid, !u.active);
      setSuccess(`${u.active ? "ປິດ" : "ເປີດ"}ໃຊ້ງານ "${u.displayName}" ສໍາເລັດ`);

    } catch { setError("ດໍາເນີນການຜິດພາດ"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.uid === me?.uid) { setError("ບໍ່ສາມາດລຶບຕົນເອງ"); setDeleteTarget(null); return; }
    try {
      await deleteUserProfile(deleteTarget.uid);
      if (me) logActivity({ uid: me.uid, displayName: me.displayName, email: me.email, action: "user_delete", detail: deleteTarget.displayName });
      setSuccess(`ລຶບ "${deleteTarget.displayName}" ສໍາເລັດ`);
      setDeleteTarget(null);

    } catch { setError("ລຶບ user ຜິດພາດ"); }
  };

  // เรียงลำดับตาม sidebar จริง: section order → parent group order → item order
  const sectionOrderMap = Object.fromEntries(
    dynamicMenus.filter(m => m.type === "section").map(m => [m.id, m.order])
  );
  const groupOrderMap = Object.fromEntries(
    dynamicMenus.filter(m => m.type === "group").map(m => [m.id, m.order])
  );
  const activeMenus = dynamicMenus
    .filter(m => m.active && m.type === "item" && m.permKey && m.permKey.trim() !== "")
    .filter((m, idx, arr) => arr.findIndex(x => x.permKey === m.permKey) === idx)
    .sort((a, b) => {
      const secA = sectionOrderMap[a.sectionId] ?? 999;
      const secB = sectionOrderMap[b.sectionId] ?? 999;
      if (secA !== secB) return secA - secB;
      const grpA = a.parentId ? (groupOrderMap[a.parentId] ?? 999) : -1;
      const grpB = b.parentId ? (groupOrderMap[b.parentId] ?? 999) : -1;
      if (grpA !== grpB) return grpA - grpB;
      return a.order - b.order;
    });

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-blue-500"/>
          <div>
            <h2 className="text-base font-semibold text-slate-800">ຈັດການ Users</h2>
            <p className="text-xs text-slate-400">ສ້າງ user ກ່ອນ · ກໍານົດສິດໃນ Edit ທີຫຼັງ</p>
          </div>
        </div>
        {perm("user_manage") && (
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={15}/> ສ້າງ User ໃໝ່
          </button>
        )}
      </div>

      {/* Banners */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16}/>{error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <CheckCircle2 size={16}/>{success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400">✕</button>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw size={22} className="animate-spin mr-2 text-blue-500"/>
            <span className="text-sm">ກໍາລັງໂຫຼດ...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Users size={40} className="mb-3 opacity-30"/>
            <p className="text-sm">ຍັງບໍ່ມີ User</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ຜູ້ໃຊ້</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">ສິດ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-24">ສະຖານະ</th>
                  <th className="px-4 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.uid} className={`transition-colors hover:bg-slate-50/50 ${!u.active ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                          ${u.isAdmin ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-slate-800">{u.displayName}</p>
                            {u.isAdmin && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[10px] font-semibold">
                                <Crown size={9}/>Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-200 rounded-full text-xs font-medium">
                          <Shield size={10}/>ທຸກສິດ
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {ALL_PERMISSIONS.filter(p => u.permissions[p.key]).map(p => (
                            <span key={p.key} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-medium">
                              {p.label}
                            </span>
                          ))}
                          {activeMenus.filter(m => u.permissions[m.permKey]).map(m => (
                            <span key={m.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-medium">
                              <DynIcon name={m.icon} size={10}/>{m.label}
                            </span>
                          ))}
                          {!ALL_PERMISSIONS.some(p => u.permissions[p.key]) && !activeMenus.some(m => u.permissions[m.permKey]) && (
                            <span className="text-xs text-slate-300 italic">ຍັງບໍ່ໄດ້ກໍານົດສິດ</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                        ${u.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                        {u.active ? <><CheckCircle2 size={10}/>ໃຊ້ງານ</> : <><X size={10}/>ປິດ</>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {perm("user_manage") && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(u)} title="ແກ້ໄຂ / ກໍານົດສິດ"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil size={14}/>
                          </button>
                          <button onClick={() => handleToggleActive(u)} disabled={u.uid === me?.uid}
                            title={u.active ? "ປິດໃຊ້ງານ" : "ເປີດໃຊ້ງານ"}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                              ${u.active ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"}`}>
                            {u.active ? <PowerOff size={14}/> : <Power size={14}/>}
                          </button>
                          <button onClick={() => setDeleteTarget(u)} disabled={u.uid === me?.uid} title="ລຶບ"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && users.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            ທັງໝົດ {users.length} users · Active {users.filter(u => u.active).length}
          </div>
        )}
      </div>

      {/* ══ CREATE Modal — ແບບໃໝ່: ກໍ່ຕ້ອງໃສ່ ຊື່ + email + password ═══════════════ */}
      {modal === "create" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-800">ສ້າງ User ໃໝ່</h3>
                <p className="text-xs text-slate-400 mt-0.5">ກໍານົດສິດໄດ້ໃນ Edit ຫຼັງຈາກສ້າງ</p>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={16}/>
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertCircle size={14}/>{error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">ຊື່ສະແດງ *</label>
                <input value={createForm.displayName}
                  onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                  required placeholder="ຊື່ຜູ້ໃຊ້"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email *</label>
                <input type="email" value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required placeholder="user@example.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"/>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Password *</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required placeholder="ຢ່າງໜ້ອຍ 6 ຕົວ"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"/>
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Shield size={14} className="text-blue-500 mt-0.5 shrink-0"/>
                <p className="text-xs text-blue-700">
                  User ໃໝ່ຈະຖືກສ້າງດ້ວຍ <strong>isAdmin = false</strong> ແລະ <strong>ທຸກ permissions = false</strong>
                  · ສາມາດກໍານົດສິດໄດ້ຫຼັງຈາກສ້າງໂດຍກົດ <strong>Edit ✏️</strong>
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal}
                  className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">
                  ຍົກເລີກ
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {submitting ? "ກໍາລັງສ້າງ..." : "ສ້າງ User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ EDIT Modal — ຕັ້ງ permissions + isAdmin ══════════════════════════════ */}
      {modal === "edit" && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="h-1 bg-gradient-to-r from-violet-500 to-blue-500 rounded-t-2xl" />

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-semibold text-slate-800">ກໍານົດສິດ: {editTarget?.displayName}</h3>
                <p className="text-xs text-slate-400">{editTarget?.email}</p>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={16}/>
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertCircle size={14}/>{error}
                </div>
              )}

              {/* Display name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">ຊື່ສະແດງ</label>
                <input value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"/>
              </div>

              {/* Admin toggle */}
              <div className={`rounded-xl border-2 p-4 transition-all cursor-pointer
                ${editForm.isAdmin ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-slate-50"}`}
                onClick={() => setAdmin(!editForm.isAdmin)}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={editForm.isAdmin} onChange={() => setAdmin(!editForm.isAdmin)}
                    className="w-4 h-4 accent-violet-600 cursor-pointer" onClick={e => e.stopPropagation()}/>
                  <Crown size={16} className={editForm.isAdmin ? "text-violet-600" : "text-slate-400"}/>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Admin (ທຸກສິດ)</p>
                    <p className="text-xs text-slate-500">ສາມາດເຂົ້າທຸກໜ້າ ແລະ ດໍາເນີນການທຸກຢ່າງ</p>
                  </div>
                </div>
              </div>

              {/* Permissions — show only when not admin */}
              {!editForm.isAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">ກໍານົດສິດ</label>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => selectAllPerms(true)}
                        className="text-xs text-blue-600 hover:underline">ເລືອກທັງໝົດ</button>
                      <span className="text-slate-300">·</span>
                      <button type="button" onClick={() => selectAllPerms(false)}
                        className="text-xs text-slate-400 hover:underline">ລ້າງ</button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Dynamic menu permissions */}
                    {activeMenus.length > 0 && (
                      <div className="rounded-xl border border-emerald-200 overflow-hidden">
                        <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 flex items-center gap-2">
                          <Globe size={12} className="text-emerald-600"/>
                          <p className="text-xs font-semibold text-emerald-700">ເມນູ Dynamic</p>
                        </div>
                        <div className="p-3 space-y-1">
                          {activeMenus.map((m) => (
                            <label key={m.id}
                              className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-emerald-50/50 transition-colors group">
                              <input type="checkbox"
                                checked={!!editForm.permissions[m.permKey]}
                                onChange={() => togglePerm(m.permKey)}
                                className="w-4 h-4 accent-emerald-600 cursor-pointer"/>
                              <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <DynIcon name={m.icon} size={12}/>
                              </div>
                              <span className={`text-sm flex-1 ${editForm.permissions[m.permKey] ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                                {m.label}
                              </span>
                              {editForm.permissions[m.permKey] && <CheckCircle2 size={13} className="text-emerald-500 shrink-0"/>}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Static permission groups */}
                    {Object.entries(STATIC_PERM_GROUPS).map(([group, items]) => (
                      <div key={group} className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                          <p className="text-xs font-semibold text-slate-600">{group}</p>
                        </div>
                        <div className="p-3 space-y-1">
                          {items.map(({ key, label }) => (
                            <label key={key}
                              className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 transition-colors">
                              <input type="checkbox"
                                checked={!!editForm.permissions[key]}
                                onChange={() => togglePerm(key)}
                                className="w-4 h-4 accent-blue-600 cursor-pointer"/>
                              <span className={`text-sm ${editForm.permissions[key] ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                                {label}
                              </span>
                              {editForm.permissions[key] && <CheckCircle2 size={13} className="ml-auto text-blue-500 shrink-0"/>}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">
                  ຍົກເລີກ
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-violet-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-60">
                  {submitting ? "ກໍາລັງບັນທຶກ..." : "ບັນທຶກສິດ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500"/>
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">ລຶບ User ນີ້?</h3>
            <p className="text-sm text-slate-600 mb-1 font-medium">{deleteTarget.displayName}</p>
            <p className="text-xs text-red-400 mb-5">ການກະທໍານີ້ບໍ່ສາມາດຍ້ອນຄືນໄດ້</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-slate-200 rounded-xl py-2 text-sm hover:bg-slate-50">ຍົກເລີກ</button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-500 text-white rounded-xl py-2 text-sm font-medium hover:bg-red-600">ລຶບ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}