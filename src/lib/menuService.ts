// src/lib/menuService.ts
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export const ICON_OPTIONS = [
  "LayoutDashboard", "ClipboardList", "Users", "FileText", "BarChart3",
  "Settings", "Bell", "Star", "Bookmark", "Globe", "Database",
  "ShieldCheck", "Folder", "Tag", "Package", "Layers", "ChevronDown",
  "PieChart", "TrendingUp", "Receipt", "Wallet", "CreditCard",
  "Building2", "UserCheck", "BarChart2", "Activity",
] as const;

export type IconName = typeof ICON_OPTIONS[number];

/**
 * type = "section"  → หัวข้อ section (ชื่อที่แสดงเหนือกลุ่มเมนู เช่น "REPORTS")
 * type = "group"    → เมนูแม่ที่กดแล้ว dropdown ลูกออกมา (ไม่มี href จริง)
 * type = "item"     → เมนูปกติ (link ไปหน้าจริง)
 */
export type MenuType = "section" | "group" | "item";

export interface AppMenu {
  id?:          string;
  type:         MenuType;
  label:        string;        // ชื่อที่แสดง
  sectionId:    string;        // อยู่ใน section ไหน (ใช้ id ของ section row, หรือ "main"/"admin" สำหรับ static)
  parentId:     string | null; // null = top-level, มี id = ลูกของ group นั้น
  href:         string;        // ใช้เฉพาะ type=item, group ใส่ "" ได้
  icon:         IconName;
  permKey:      string;        // ใช้เฉพาะ type=item/group
  order:        number;        // ลำดับภายใน parent เดียวกัน
  active:       boolean;
  createdAt?:   unknown;
}

const COLLECTION = "menus";

export const subscribeToMenus = (cb: (menus: AppMenu[]) => void) => {
  const q = query(collection(db, COLLECTION), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppMenu)));
  });
};

export const getAllMenus = async (): Promise<AppMenu[]> => {
  const q = query(collection(db, COLLECTION), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppMenu));
};

export const createMenu = async (data: Omit<AppMenu, "id" | "createdAt">): Promise<string> => {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateMenu = async (id: string, data: Partial<Omit<AppMenu, "id">>): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, id), data);
};

export const deleteMenu = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};

// ── helper: build tree structure for Sidebar ──────────────────────────────────

export interface MenuNode {
  menu:     AppMenu;
  children: MenuNode[];
}

/**
 * จัดเมนูทั้งหมดเป็น tree แยกตาม section
 * Return: array ของ section พร้อม top-level nodes ใน section นั้น
 */
export interface SectionTree {
  sectionId:    string;
  sectionLabel: string;  // ชื่อ header section
  nodes:        MenuNode[]; // top-level items/groups ใน section นี้
}

export function buildSectionTree(
  allMenus: AppMenu[],
  canSee: (permKey: string) => boolean,
): SectionTree[] {
  const active = allMenus.filter(m => m.active);

  // sections
  const sections = active.filter(m => m.type === "section").sort((a, b) => a.order - b.order);

  // Recursive node builder — รองรับ group ซ้อน group ได้ทุกระดับ
  const buildNode = (m: AppMenu): MenuNode | null => {
    if (m.type === "item") {
      if (!canSee(m.permKey)) return null;
      return { menu: m, children: [] };
    }

    if (m.type === "group") {
      // NOTE: ບໍ່ check canSee(m.permKey) ສໍາລັບ group ເພາະ group permKey
      // ບໍ່ຖືກ assign ໃຫ້ user ໃນໜ້າ admin/users — ໃຊ້ children visibility ເປັນ gate ດຽວ
      // ຖ້າ item ລູກໃດໜຶ່ງ visible, group ຈະ show ໂດຍອັດຕະໂນມັດ
      const children = active
        .filter(c => c.parentId === m.id)
        .sort((a, b) => a.order - b.order)
        .map(c => buildNode(c))
        .filter(Boolean) as MenuNode[];

      // group: ສະແດງສະເພາະຕອນມີ children ທີ່ visible
      if (children.length === 0) return null;
      return { menu: m, children };
    }

    return null;
  };

  return sections.map(sec => {
    // top-level items/groups in this section (parentId === null)
    const topLevel = active
      .filter(m => m.sectionId === sec.id && (m.parentId === null || m.parentId === "") && m.type !== "section")
      .sort((a, b) => a.order - b.order);

    const nodes = topLevel.map(buildNode).filter(Boolean) as MenuNode[];

    return {
      sectionId:    sec.id!,
      sectionLabel: sec.label,
      nodes,
    };
  }).filter(s => s.nodes.length > 0);
}