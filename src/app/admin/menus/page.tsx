"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import {
  subscribeToMenus, createMenu, updateMenu, deleteMenu,
  ICON_OPTIONS, type AppMenu, type IconName, type MenuType,
} from "@/lib/menuService";
import { logActivity } from "@/lib/activityService";
import {
  Plus, Pencil, Trash2, X, AlertCircle, CheckCircle2,
  RefreshCw, LayoutList, Eye, EyeOff, Zap, ChevronDown,
  ChevronRight, Folder, Layers, Tag, LayoutDashboard, ClipboardList,
  Users, FileText, BarChart3, Settings, Bell, Star, Bookmark, Globe,
  Database, ShieldCheck, Package, PieChart, TrendingUp, Receipt,
  Wallet, CreditCard, Building2, UserCheck, BarChart2, Activity,
  GripVertical, FolderOpen, Link as LinkIcon, Heading,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, ClipboardList, Users, FileText, BarChart3,
  Settings, Bell, Star, Bookmark, Globe, Database,
  ShieldCheck, Folder, Tag, Package, Layers, ChevronDown,
  PieChart, TrendingUp, Receipt, Wallet, CreditCard,
  Building2, UserCheck, BarChart2, Activity,
};

function IconPreview({ name, size = 15 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? Folder;
  return <Icon size={size} />;
}

// ── type meta ─────────────────────────────────────────────────────────────────
const TYPE_META: Record<MenuType, { label: string; desc: string; color: string; Icon: React.ElementType }> = {
  section: { label: "Section Header",  desc: "ຫົວຂໍ້ section ใน sidebar",        color: "violet", Icon: Heading   },
  group:   { label: "Dropdown Group",  desc: "ເມນູແມ່ທີ່ມີເມນູລູກ (dropdown)",   color: "amber",  Icon: FolderOpen },
  item:    { label: "ເມນູປະຕິບັດ (Link)", desc: "ລິງກ໌ໄປຫນ້າທີ່ຕ້ອງການ",                  color: "blue",   Icon: LinkIcon   },
};

const TYPE_BADGE: Record<MenuType, string> = {
  section: "bg-violet-50 text-violet-700 border-violet-200",
  group:   "bg-amber-50  text-amber-700  border-amber-200",
  item:    "bg-blue-50   text-blue-700   border-blue-200",
};

// ── form state ────────────────────────────────────────────────────────────────
interface FormState {
  type:      MenuType;
  label:     string;
  sectionId: string;   // id ของ section row (หรือ "" ถ้ายังไม่เลือก)
  parentId:  string;   // id ของ group (หรือ "" = top-level)
  href:      string;
  icon:      IconName;
  order:     number;
  active:    boolean;
}

const BLANK: FormState = {
  type: "item", label: "", sectionId: "", parentId: "",
  href: "/", icon: "Folder", order: 10, active: true,
};

// ── util ──────────────────────────────────────────────────────────────────────
const permKeyFromHref = (href: string) =>
  "page_" + href.replace(/^\//, "").replace(/\//g, "_").replace(/[^a-z0-9_]/gi, "").toLowerCase() || "page_custom";

export default function MenusPage() {
  const { user, perm } = useAuth();
  const router = useRouter();

  const [menus, setMenus]           = useState<AppMenu[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState<AppMenu | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppMenu | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm]             = useState<FormState>({ ...BLANK });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  // track if we've already auto-expanded once
  const didAutoExpand = useRef(false);

  useEffect(() => {
    if (!perm("user_manage")) { router.replace("/dashboard"); return; }
    // Realtime subscription — ไม่ต้อง re-fetch หลัง create/update/delete
    const unsub = subscribeToMenus((all) => {
      setMenus(all);
      setLoading(false);
      // auto-expand sections เฉพาะครั้งแรก
      if (!didAutoExpand.current) {
        const expanded: Record<string, boolean> = {};
        all.filter(m => m.type === "section").forEach(s => { expanded[s.id!] = true; });
        setExpandedSections(expanded);
        didAutoExpand.current = true;
      }
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── derived data ───────────────────────────────────────────────────────────
  const sections = menus.filter(m => m.type === "section").sort((a, b) => a.order - b.order);
  const groups   = menus.filter(m => m.type === "group");

  // ── form helpers ───────────────────────────────────────────────────────────
  const nextOrder = (parentId: string | null, sectionId: string) => {
    const siblings = menus.filter(m =>
      (m.parentId === parentId || (!m.parentId && !parentId)) &&
      m.sectionId === sectionId &&
      m.type !== "section"
    );
    return siblings.length > 0 ? Math.max(...siblings.map(m => m.order)) + 10 : 10;
  };

  const openCreate = (defaults?: Partial<FormState>) => {
    const base: FormState = { ...BLANK, ...defaults };
    if (base.type !== "section") {
      base.order = nextOrder(base.parentId || null, base.sectionId);
    } else {
      base.order = sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 10 : 10;
    }
    setForm(base);
    setEditTarget(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (m: AppMenu) => {
    setEditTarget(m);
    setForm({
      type:      m.type,
      label:     m.label,
      sectionId: m.sectionId ?? "",
      parentId:  m.parentId ?? "",
      href:      m.href ?? "/",
      icon:      m.icon,
      order:     m.order,
      active:    m.active,
    });
    setShowForm(true);
    setError(null);
  };

  const closeForm = () => { setShowForm(false); setEditTarget(null); setError(null); };

  // ── validate & submit ──────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim()) { setError("ກະລຸນາໃສ່ຊື່"); return; }
    if (form.type !== "section" && !form.sectionId) { setError("ກະລຸນາເລືອກ Section"); return; }
    if (form.type === "item") {
      if (!form.href.startsWith("/")) { setError('href ຕ້ອງເລີ່ມດ້ວຍ "/"'); return; }
    }
    setSubmitting(true); setError(null);
    try {
      const data: Omit<AppMenu, "id" | "createdAt"> = {
        type:      form.type,
        label:     form.label.trim(),
        sectionId: form.type === "section" ? "__section__" : form.sectionId,
        parentId:  form.type === "section"
                     ? null
                     : form.parentId
                       ? form.parentId
                       : null,
        href:      form.type === "item" ? form.href : "",
        icon:      form.icon,
        permKey:   form.type === "item"
                     ? permKeyFromHref(form.href)
                     : form.type === "group"
                       ? "group_" + form.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/gi, "")
                       : "",
        order:     form.order,
        active:    form.active,
      };

      if (editTarget?.id) {
        await updateMenu(editTarget.id, data);
        setSuccess(`ແກ້ໄຂ "${form.label}" ສໍາເລັດ`);
        if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "menu_edit", detail: form.label });
      } else {
        await createMenu(data);
        setSuccess(`ສ້າງ "${form.label}" ສໍາເລັດ`);
        if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "menu_create", detail: form.label });
      }
      closeForm();

    } catch (err) {
      setError("ຜິດພາດ: " + (err as Error).message);
    } finally { setSubmitting(false); }
  };

  const handleToggle = async (m: AppMenu) => {
    try {
      await updateMenu(m.id!, { active: !m.active });
      setSuccess(`${m.active ? "ປິດ" : "ເປີດ"} "${m.label}" ສໍາເລັດ`);

    } catch { setError("ດໍາເນີນການຜິດພາດ"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    // recursive collect all descendants
    const collectDescendants = (parentId: string): AppMenu[] => {
      const children = menus.filter(m => m.parentId === parentId || m.sectionId === parentId);
      return [...children, ...children.flatMap(c => c.id ? collectDescendants(c.id) : [])];
    };
    const descendants = collectDescendants(deleteTarget.id);
    // deduplicate
    const uniqueIds = Array.from(new Set(descendants.map(d => d.id).filter(Boolean))) as string[];
    try {
      await Promise.all(uniqueIds.map(id => deleteMenu(id)));
      await deleteMenu(deleteTarget.id);
      if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "menu_delete", detail: deleteTarget.label });
      setSuccess(`ລຶບ "${deleteTarget.label}" ສໍາເລັດ`);
      setDeleteTarget(null);

    } catch { setError("ລຶບຜິດພາດ"); }
  };

  // ── render tree ────────────────────────────────────────────────────────────
  const renderGroupRows = (
    groupsToRender: AppMenu[],
    sectionId: string,
    depth: number = 0
  ): React.ReactNode => {
    return groupsToRender.map(group => {
      const groupChildren = menus
        .filter(m => m.parentId === group.id && m.type === "item")
        .sort((a, b) => a.order - b.order);
      const nestedGroups = menus
        .filter(m => m.parentId === group.id && m.type === "group")
        .sort((a, b) => a.order - b.order);
      const bgColor = depth % 2 === 0 ? "bg-amber-50/60" : "bg-orange-50/60";
      const indentPx = 16 + depth * 24;

      return (
        <div key={group.id}>
          {/* group row */}
          <div className={`flex items-center gap-2 py-2.5 ${bgColor} ${!group.active ? "opacity-60" : ""}`}
            style={{ paddingLeft: `${indentPx}px`, paddingRight: "16px" }}>
            <GripVertical size={13} className="text-slate-300 shrink-0" />
            <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <ChevronDown size={13} />
            </div>
            <div className="w-7 h-7 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <IconPreview name={group.icon} size={14} />
            </div>
            <span className="flex-1 text-sm font-semibold text-slate-700">{group.label}</span>
            <span className="text-[10px] text-amber-500 font-mono mr-2">dropdown · order {group.order}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => openCreate({ type: "item", sectionId, parentId: group.id! })}
                title="ເພີ່ມ Item ໃນ Group ນີ້"
                className="p-1.5 text-amber-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Plus size={13} />
              </button>
              <button onClick={() => openCreate({ type: "group", sectionId, parentId: group.id! })}
                title="ເພີ່ມ Sub-Group (ຊ້ອນ)"
                className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                <FolderOpen size={13} />
              </button>
              <button onClick={() => openEdit(group)} title="ແກ້ໄຂ Group"
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={() => handleToggle(group)} title={group.active ? "ປິດ" : "ເປີດ"}
                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                {group.active ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button onClick={() => setDeleteTarget(group)} title="ລຶບ"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {/* nested groups (sub-groups) */}
          {nestedGroups.length > 0 && renderGroupRows(nestedGroups, sectionId, depth + 1)}
          {/* group children items */}
          {groupChildren.map(item => <ItemRow key={item.id} m={item} indent={depth + 1} />)}
          {nestedGroups.length === 0 && groupChildren.length === 0 && (
            <div className="py-2 text-xs text-slate-300 italic"
              style={{ paddingLeft: `${indentPx + 24}px` }}>
              ຍັງບໍ່ມີ item — ກົດ + ເພື່ອເພີ່ມ
            </div>
          )}
        </div>
      );
    });
  };

  const renderSectionRows = () => {
    if (sections.length === 0) return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <LayoutList size={40} className="mb-3 opacity-30" />
        <p className="text-sm mb-4">ຍັງບໍ່ມີ Menu</p>
        <button onClick={() => openCreate({ type: "section" })}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm rounded-xl hover:bg-violet-700 transition-colors">
          <Plus size={14} /> ສ້າງ Section ທໍາອິດ
        </button>
      </div>
    );

    return sections.map(sec => {
      // top-level groups: sectionId ตรง และ parentId เป็น null หรือ ""
      const secTopGroups = menus
        .filter(m => m.sectionId === sec.id && m.type === "group" && (!m.parentId))
        .sort((a, b) => a.order - b.order);
      const secItems = menus
        .filter(m => m.sectionId === sec.id && m.type === "item" && !m.parentId)
        .sort((a, b) => a.order - b.order);
      const isExp = expandedSections[sec.id!] ?? true;

      return (
        <div key={sec.id} className="border border-slate-200 rounded-xl overflow-hidden mb-3">
          {/* Section header row */}
          <div className={`flex items-center gap-2 px-4 py-3 bg-violet-50 border-b border-violet-100 ${!sec.active ? "opacity-60" : ""}`}>
            <button onClick={() => setExpandedSections(p => ({ ...p, [sec.id!]: !isExp }))}
              className="p-0.5 text-violet-400 hover:text-violet-700 rounded transition-colors">
              {isExp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <div className="w-6 h-6 rounded bg-violet-100 flex items-center justify-center text-violet-600 shrink-0">
              <Heading size={13} />
            </div>
            <span className="flex-1 text-sm font-bold text-violet-800 uppercase tracking-widest">{sec.label}</span>
            <span className="text-[10px] text-violet-400 font-mono">section · order {sec.order}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => openCreate({ type: "item", sectionId: sec.id! })}
                title="ເພີ່ມ Item ໃນ Section ນີ້"
                className="p-1.5 text-violet-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <LinkIcon size={13} />
              </button>
              <button onClick={() => openCreate({ type: "group", sectionId: sec.id! })}
                title="ເພີ່ມ Dropdown Group ໃນ Section ນີ້"
                className="p-1.5 text-violet-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                <FolderOpen size={13} />
              </button>
              <button onClick={() => openEdit(sec)} title="ແກ້ໄຂ Section"
                className="p-1.5 text-violet-400 hover:text-violet-700 hover:bg-violet-100 rounded-lg transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={() => handleToggle(sec)} title={sec.active ? "ປິດ" : "ເປີດ"}
                className="p-1.5 text-violet-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                {sec.active ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button onClick={() => setDeleteTarget(sec)} title="ລຶບ Section"
                className="p-1.5 text-violet-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Section content */}
          {isExp && (
            <div className="divide-y divide-slate-100">
              {/* top-level items in this section */}
              {secItems.map(item => <ItemRow key={item.id} m={item} indent={0} />)}

              {/* top-level groups (recursive) */}
              {renderGroupRows(secTopGroups, sec.id!)}

              {secTopGroups.length === 0 && secItems.length === 0 && (
                <div className="px-4 py-3 text-xs text-slate-300 italic text-center">
                  Section ຫວ່າງ — ກົດ ikon ດ້ານຂວາຂອງ section ເພື່ອເພີ່ມ
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  const ItemRow = ({ m, indent }: { m: AppMenu; indent: number }) => (
    <div className={`flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50/70 transition-colors ${!m.active ? "opacity-50" : ""}`}
      style={{ paddingLeft: `${16 + indent * 32}px` }}>
      <GripVertical size={13} className="text-slate-300 shrink-0" />
      <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
        <IconPreview name={m.icon} size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{m.label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <code className="text-[10px] text-slate-400">{m.href}</code>
          <code className="text-[10px] text-violet-400">{m.permKey}</code>
        </div>
      </div>
      <span className="text-[10px] text-slate-300 font-mono shrink-0">order {m.order}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(m)} title="ແກ້ໄຂ"
          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Pencil size={13} />
        </button>
        <button onClick={() => handleToggle(m)} title={m.active ? "ປິດ" : "ເປີດ"}
          className={`p-1.5 rounded-lg transition-colors
            ${m.active ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"}`}>
          {m.active ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button onClick={() => setDeleteTarget(m)} title="ລຶບ"
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );

  const currentType = form.type;
  const meta = TYPE_META[currentType];

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutList size={18} className="text-blue-500" />
          <div>
            <h2 className="text-base font-semibold text-slate-800">ຈັດການ Menus</h2>
            <p className="text-xs text-slate-400">Section · Dropdown Group · ເມນູປກົດ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openCreate({ type: "section" })}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors shadow-sm">
            <Plus size={14} /> Section ໃໝ່
          </button>
          <button onClick={() => openCreate({ type: "group" })}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors shadow-sm">
            <Plus size={14} /> Group ໃໝ່
          </button>
          <button onClick={() => openCreate({ type: "item" })}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={14} /> Item ໃໝ່
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2.5 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <Zap size={15} className="shrink-0 mt-0.5 text-blue-500" />
        <p>
          <strong>Section</strong> = ຫົວຂໍ້ section (MAIN / REPORTS …) ·
          <strong className="ml-1">Group</strong> = dropdown ເມນູແມ່ທີ່ມີເມນູລູກ ·
          <strong className="ml-1">Item</strong> = ລິ້ງໄປຫາຫນ້າທີ່ຕ້ອງການ
        </p>
      </div>

      {/* Banners */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} />{error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <CheckCircle2 size={16} />{success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400">✕</button>
        </div>
      )}

      {/* Tree */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw size={22} className="animate-spin mr-2 text-blue-500" />
            <span className="text-sm">ກໍາລັງໂຫຼດ...</span>
          </div>
        ) : (
          <div className="p-4">{renderSectionRows()}</div>
        )}
      </div>

      {/* ── Modal Form ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[92vh] flex flex-col">
            <div className={`h-1 rounded-t-2xl bg-gradient-to-r
              ${currentType === "section" ? "from-violet-500 to-violet-600"
              : currentType === "group"   ? "from-amber-400 to-amber-500"
              :                             "from-blue-500 to-blue-600"}`} />

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <meta.Icon size={16} className={
                  currentType === "section" ? "text-violet-600"
                  : currentType === "group" ? "text-amber-500"
                  : "text-blue-600"} />
                <h3 className="font-semibold text-slate-800">
                  {editTarget ? `ແກ້ໄຂ: ${editTarget.label}` : `ສ້າງ ${meta.label}`}
                </h3>
              </div>
              <button onClick={closeForm} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <AlertCircle size={14} />{error}
                </div>
              )}

              {/* Type selector (only for create) */}
              {!editTarget && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">ປະເພດ</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["section", "group", "item"] as MenuType[]).map(t => {
                      const mt = TYPE_META[t];
                      return (
                        <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t, parentId: "" }))}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all
                            ${form.type === t
                              ? t === "section" ? "border-violet-500 bg-violet-50"
                                : t === "group" ? "border-amber-500 bg-amber-50"
                                : "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300"}`}>
                          <mt.Icon size={18} className={
                            form.type === t
                              ? t === "section" ? "text-violet-600" : t === "group" ? "text-amber-600" : "text-blue-600"
                              : "text-slate-400"} />
                          <span className={`text-[11px] font-semibold
                            ${form.type === t
                              ? t === "section" ? "text-violet-700" : t === "group" ? "text-amber-700" : "text-blue-700"
                              : "text-slate-500"}`}>
                            {mt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Label */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  {currentType === "section" ? "ຊື່ Section Header" : "ຊື່ທີ່ສະແດງ"} *
                </label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  required placeholder={
                    currentType === "section" ? "ເຊັ່ນ: REPORTS, ລາຍງານ, FINANCE …"
                    : currentType === "group"  ? "ເຊັ່ນ: ລາຍງານ, ການຈ່າຍເງິນ …"
                    : "ຊື່ທີ່ໂຊໃນ Sidebar"
                  }
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
              </div>

              {/* Section selector (for group/item) */}
              {currentType !== "section" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">อยู่ใน Section ໃດ *</label>
                  {sections.length === 0 ? (
                    <p className="text-xs text-red-500 p-3 bg-red-50 rounded-xl">ຍັງບໍ່ມີ Section — ສ້າງ Section ກ່ອນ</p>
                  ) : (
                    <div className="space-y-1.5">
                      {sections.map(s => (
                        <label key={s.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${form.sectionId === s.id ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-slate-300"}`}>
                          <input type="radio" name="sectionId" value={s.id}
                            checked={form.sectionId === s.id}
                            onChange={() => setForm(f => ({ ...f, sectionId: s.id!, parentId: "" }))}
                            className="accent-violet-600" />
                          <Heading size={13} className="text-violet-500 shrink-0" />
                          <span className="text-sm font-semibold text-violet-800 uppercase tracking-wider">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Parent group selector (for item OR group inside a section) */}
              {(currentType === "item" || currentType === "group") && form.sectionId && (() => {
                // หา groups ที่อยู่ใน section เดียวกัน และไม่ใช่ตัวเอง (เวลา edit)
                const availableGroups = groups.filter(g =>
                  g.sectionId === form.sectionId &&
                  g.id !== editTarget?.id
                );
                return availableGroups.length > 0 ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                      {currentType === "item" ? "ຢູ່ໃນ Dropdown Group (ຖ້າມີ)" : "ຢູ່ໃນ Group ແມ່ (ຖ້າຕ້ອງການຊ້ອນ)"}
                    </label>
                    <div className="space-y-1.5">
                      <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                        ${!form.parentId ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                        <input type="radio" name="parentId" value=""
                          checked={!form.parentId}
                          onChange={() => setForm(f => ({ ...f, parentId: "" }))}
                          className="accent-blue-600" />
                        <LinkIcon size={13} className="text-blue-500 shrink-0" />
                        <span className="text-sm text-slate-700">Top-level (ໃນ Section ໂດຍກົງ)</span>
                      </label>
                      {availableGroups.map(g => (
                        <label key={g.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                            ${form.parentId === g.id ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:border-slate-300"}`}>
                          <input type="radio" name="parentId" value={g.id}
                            checked={form.parentId === g.id}
                            onChange={() => setForm(f => ({ ...f, parentId: g.id! }))}
                            className="accent-amber-500" />
                          <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center text-amber-600">
                            <IconPreview name={g.icon} size={12} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{g.label}</span>
                          <ChevronDown size={12} className="text-amber-400 ml-auto" />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* href — items only */}
              {currentType === "item" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Path (href) *</label>
                  <input value={form.href}
                    onChange={e => setForm(f => ({ ...f, href: e.target.value }))}
                    required placeholder="/reports/topup"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono" />
                  {form.href && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Permission key: <code className="text-violet-600">{permKeyFromHref(form.href)}</code>
                    </p>
                  )}
                </div>
              )}

              {/* Icon picker (section doesn't need icon) */}
              {currentType !== "section" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">ໄອຄ່ອນ</label>
                  <div className="grid grid-cols-8 gap-1.5">
                    {ICON_OPTIONS.filter(i => i !== "ChevronDown").map(iconName => (
                      <button key={iconName} type="button"
                        onClick={() => setForm(f => ({ ...f, icon: iconName as IconName }))}
                        title={iconName}
                        className={`p-2 rounded-lg flex items-center justify-center transition-all
                          ${form.icon === iconName
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                        <IconPreview name={iconName} size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Order + Active */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">ລໍາດັບ</label>
                  <input type="number" value={form.order}
                    onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">ສະຖານະ</label>
                  <div className="flex items-center h-[42px] gap-2.5 cursor-pointer"
                    onClick={() => setForm(f => ({ ...f, active: !f.active }))}>
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${form.active ? "bg-blue-600" : "bg-slate-300"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? "left-5" : "left-0.5"}`} />
                    </div>
                    <span className="text-sm text-slate-600">{form.active ? "ໃຊ້ງານ" : "ປິດ"}</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeForm}
                  className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors">
                  ຍົກເລີກ
                </button>
                <button type="submit" disabled={submitting}
                  className={`flex-1 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-60
                    ${currentType === "section" ? "bg-violet-600 hover:bg-violet-700"
                    : currentType === "group"   ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-blue-600 hover:bg-blue-700"}`}>
                  {submitting ? "ກໍາລັງບັນທຶກ..." : editTarget ? "ບັນທຶກ" : `ສ້າງ ${meta.label}`}
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
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-1">ລຶບ "{deleteTarget.label}"?</h3>
            {deleteTarget.type === "section" && (
              <p className="text-xs text-amber-600 mb-2">⚠️ ຈະລຶບ Groups ແລະ Items ທັງໝົດທີ່ຢູ່ໃນ Section ນີ້ດ້ວຍ</p>
            )}
            {deleteTarget.type === "group" && (
              <p className="text-xs text-amber-600 mb-2">⚠️ ຈະລຶບ Items ທັງໝົດທີ່ຢູ່ໃນ Group ນີ້ດ້ວຍ</p>
            )}
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