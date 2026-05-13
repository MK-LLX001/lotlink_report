"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, ClipboardList, Users, X, ChevronRight, ChevronDown,
  FileText, BarChart3, Settings, Bell, Star, Bookmark, Globe,
  Database, ShieldCheck, Folder, Tag, Package, Layers, LayoutList,
  PieChart, TrendingUp, Receipt, Wallet, CreditCard,
  Building2, UserCheck, BarChart2, Activity, GripVertical,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { buildSectionTree, type MenuNode, type IconName } from "@/lib/menuService";

// ── icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, ClipboardList, Users, FileText, BarChart3,
  Settings, Bell, Star, Bookmark, Globe, Database,
  ShieldCheck, Folder, Tag, Package, Layers, ChevronDown,
  PieChart, TrendingUp, Receipt, Wallet, CreditCard,
  Building2, UserCheck, BarChart2, Activity,
};

function NavIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[name] ?? Folder;
  return <Icon size={size} className={className} />;
}

// ── static nav ────────────────────────────────────────────────────────────────
const STATIC_NAV = [
  { href: "/dashboard",    label: "Dashboard",       icon: "LayoutDashboard", permKey: "page_dashboard" },
  { href: "/issues",       label: "ລາຍງານບັນຫາ",   icon: "ClipboardList",   permKey: "page_issues"    },
];

const ADMIN_NAV = [
  { href: "/admin/users", label: "ຈັດການ Users", icon: "Users",      permKey: "page_users"   },
  { href: "/admin/menus", label: "ຈັດການ Menus", icon: "LayoutList", permKey: "user_manage"  },
];

// ── resize constants ──────────────────────────────────────────────────────────
const SIDEBAR_MIN_W = 180;
const SIDEBAR_MAX_W = 400;
const SIDEBAR_DEFAULT_W = 224; // w-56 = 14rem = 224px
const STORAGE_KEY = "sidebar_width";

interface Props { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const { user, perm, menus } = useAuth();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const n = parseInt(stored, 10);
        if (!isNaN(n) && n >= SIDEBAR_MIN_W && n <= SIDEBAR_MAX_W) return n;
      }
    }
    return SIDEBAR_DEFAULT_W;
  });

  // ── drag-to-resize ─────────────────────────────────────────────────────────
  const isDragging = useRef(false);
  const startX     = useRef(0);
  const startW     = useRef(0);
  const resizerRef = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - startX.current;
    const newW  = Math.min(SIDEBAR_MAX_W, Math.max(SIDEBAR_MIN_W, startW.current + delta));
    setSidebarWidth(newW);
  }, []);

  const onMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.cursor   = "";
    document.body.style.userSelect = "";
    // persist
    setSidebarWidth(w => {
      localStorage.setItem(STORAGE_KEY, String(w));
      return w;
    });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current     = e.clientX;
    startW.current     = sidebarWidth;
    document.body.style.cursor    = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // ── double-click resizer → reset to default ────────────────────────────────
  const onDoubleClick = useCallback(() => {
    setSidebarWidth(SIDEBAR_DEFAULT_W);
    localStorage.setItem(STORAGE_KEY, String(SIDEBAR_DEFAULT_W));
  }, []);

  const toggleGroup = (id: string) =>
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  // ── plain nav item (link) ──────────────────────────────────────────────────
  const NavItem = ({
    href, label, icon, indent = false, indentLevel = 1,
  }: { href: string; label: string; icon: string; indent?: boolean; indentLevel?: number }) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    const paddingLeft = indent ? `${12 + indentLevel * 20}px` : undefined;
    return (
      <Link href={href} onClick={onClose}
        style={paddingLeft ? { paddingLeft } : undefined}
        className={`group flex items-center gap-2.5 rounded-xl text-sm transition-all
          ${indent ? "pr-3 py-2" : "px-3 py-2.5"}
          ${active
            ? "bg-blue-600 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
        <NavIcon name={icon} size={15}
          className={active ? "text-white" : "text-slate-400 group-hover:text-slate-600"} />
        <span className="flex-1 font-medium truncate">{label}</span>
        {active && <ChevronRight size={13} className="opacity-70 shrink-0" />}
      </Link>
    );
  };

  // ── dropdown group ─────────────────────────────────────────────────────────
  const GroupItem = ({ node, depth = 0 }: { node: MenuNode; depth?: number }) => {
    const m = node.menu;
    const isOpen = openGroups[m.id!] ?? false;

    const hasActiveDescendant = (nodes: MenuNode[]): boolean =>
      nodes.some(c =>
        (c.menu.href && (pathname === c.menu.href || pathname.startsWith(c.menu.href + "/")))
        || hasActiveDescendant(c.children)
      );
    const hasActive = hasActiveDescendant(node.children);
    const paddingLeft = depth > 0 ? `${12 + depth * 20}px` : undefined;

    return (
      <div>
        <button
          type="button"
          onClick={() => toggleGroup(m.id!)}
          style={paddingLeft ? { paddingLeft } : undefined}
          className={`w-full group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all
            ${hasActive && !isOpen
              ? "bg-blue-50 text-blue-700"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
          <NavIcon name={m.icon} size={15}
            className={hasActive && !isOpen ? "text-blue-500" : "text-slate-400 group-hover:text-slate-600"} />
          <span className="flex-1 font-medium truncate text-left">{m.label}</span>
          <ChevronDown size={13}
            className={`shrink-0 transition-transform duration-200 text-slate-400
              ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="mt-0.5 space-y-0.5 pb-1">
            {node.children.map(child =>
              child.menu.type === "group"
                ? <GroupItem key={child.menu.id} node={child} depth={depth + 1} />
                : <NavItem key={child.menu.id}
                    href={child.menu.href}
                    label={child.menu.label}
                    icon={child.menu.icon}
                    indent
                    indentLevel={depth + 1} />
            )}
          </div>
        )}
      </div>
    );
  };

  // ── build dynamic sections ─────────────────────────────────────────────────
  const dynamicSections = buildSectionTree(menus, perm);
  const staticNav = STATIC_NAV.filter(n => perm(n.permKey));
  const adminNav  = ADMIN_NAV.filter(n => perm(n.permKey));

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      {/* Wrapper: aside + resize handle side-by-side */}
      <div
        className={`
          relative flex shrink-0
          fixed top-0 left-0 h-full z-40
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto lg:h-screen
        `}
        style={{ width: sidebarWidth }}
      >
        {/* ── Sidebar panel ───────────────────────────────────────────────── */}
        <aside
          className="flex flex-col h-full bg-white border-r border-slate-200 shadow-lg overflow-hidden"
          style={{ width: "100%" }}
        >
          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
                <img src="/sokxay.png" alt="logo" className="w-8 h-8 object-contain"
                  onError={(e) => {
                    const el = e.currentTarget as HTMLImageElement;
                    el.style.display = "none";
                    const p = el.parentElement;
                    if (p) p.innerHTML = `<span class="text-white text-xs font-bold">S+</span>`;
                  }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate">Sokxay One Plus</p>
                <p className="text-[10px] text-slate-400 leading-tight">Issue Tracker</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">

            {staticNav.length > 0 && (
              <div>
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 tracking-widest uppercase">MAIN</p>
                <div className="space-y-0.5">
                  {staticNav.map(n => <NavItem key={n.href} href={n.href} label={n.label} icon={n.icon} />)}
                </div>
              </div>
            )}

            {dynamicSections.map(sec => (
              <div key={sec.sectionId}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 tracking-widest uppercase">
                  {sec.sectionLabel}
                </p>
                <div className="space-y-0.5">
                  {sec.nodes.map(node =>
                    node.menu.type === "group"
                      ? <GroupItem key={node.menu.id} node={node} />
                      : <NavItem key={node.menu.id}
                          href={node.menu.href}
                          label={node.menu.label}
                          icon={node.menu.icon} />
                  )}
                </div>
              </div>
            ))}

            {adminNav.length > 0 && (
              <div>
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-slate-400 tracking-widest uppercase">ADMIN</p>
                <div className="space-y-0.5">
                  {adminNav.map(n => <NavItem key={n.href} href={n.href} label={n.label} icon={n.icon} />)}
                </div>
              </div>
            )}
          </nav>

          {/* Footer */}
          {user && (
            <div className="px-4 py-3 border-t border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${user.isAdmin ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700 truncate">{user.displayName}</p>
                  <p className={`text-[10px] ${user.isAdmin ? "text-violet-500" : "text-blue-500"}`}>
                    {user.isAdmin ? "Admin" : "Custom"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ── Resize handle ────────────────────────────────────────────────── */}
        <div
          ref={resizerRef}
          onMouseDown={onMouseDown}
          onDoubleClick={onDoubleClick}
          title="ລາກເພື່ອຂະຫຍາຍ · ດັບເບີ້ຄລິກເພື່ອ reset"
          className="
            absolute top-0 right-0 h-full w-3 z-50
            flex items-center justify-center
            cursor-col-resize
            group
            select-none
          "
        >
          {/* Visual indicator line */}
          <div className="
            h-full w-px bg-slate-200
            group-hover:bg-blue-400 group-active:bg-blue-500
            transition-colors duration-150
          " />
          {/* Grip dots — shown on hover */}
          <div className="
            absolute top-1/2 -translate-y-1/2
            opacity-0 group-hover:opacity-100
            transition-opacity duration-150
            bg-white border border-slate-200 rounded-md px-0.5 py-2 shadow-sm
          ">
            <GripVertical size={12} className="text-slate-400" />
          </div>
        </div>
      </div>
    </>
  );
}