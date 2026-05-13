"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { RefreshCw, ShieldOff } from "lucide-react";

// ໜ້າໃດ ຕ້ອງການ permission key ໃດ
const PAGE_PERMS: Record<string, string> = {
  "/dashboard":    "page_dashboard",
  "/issues":       "page_issues",
  "/admin/users":  "page_users",
  "/admin/menus":  "user_manage",
};

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, perm, menus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // ຫາໜ້າທໍາອິດທີ່ user ມີສິດ
  const getFirstPermittedPage = (): string | null => {
    if (perm("page_dashboard")) return "/dashboard";
    if (perm("page_issues"))    return "/issues";
    if (perm("page_users"))     return "/admin/users";
    if (perm("user_manage"))    return "/admin/menus";
    const sectionOrder: Record<string, number> = {};
    const groupOrder:   Record<string, number> = {};
    menus.forEach(m => {
      if (m.type === "section" && m.id) sectionOrder[m.id] = m.order;
      if (m.type === "group"   && m.id) groupOrder[m.id]   = m.order;
    });
    const firstDynamic = menus
      .filter(m => m.type === "item" && m.active && m.href && perm(m.permKey))
      .sort((a, b) => {
        const secA = sectionOrder[a.sectionId] ?? 999;
        const secB = sectionOrder[b.sectionId] ?? 999;
        if (secA !== secB) return secA - secB;
        const grpA = a.parentId ? (groupOrder[a.parentId] ?? 999) : -1;
        const grpB = b.parentId ? (groupOrder[b.parentId] ?? 999) : -1;
        if (grpA !== grpB) return grpA - grpB;
        return a.order - b.order;
      })[0];
    if (firstDynamic?.href) return firstDynamic.href;
    return null;
  };

  useEffect(() => {
    if (loading) return;

    if (!user && pathname !== "/login") {
      router.replace("/login");
      return;
    }

    if (user && pathname === "/login") {
      const hasStatic =
        perm("page_dashboard") || perm("page_issues") ||
        perm("page_users")     || perm("user_manage");
      if (hasStatic) {
        router.replace(getFirstPermittedPage()!);
        return;
      }
      if (menus.length === 0) return;
      const first = getFirstPermittedPage();
      router.replace(first ?? "/login");
      return;
    }

    if (user && pathname in PAGE_PERMS && !perm(PAGE_PERMS[pathname])) {
      const first = getFirstPermittedPage();
      if (first && first !== pathname) {
        router.replace(first);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, pathname, menus]);

  if (pathname === "/login") return <>{children}</>;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <RefreshCw size={28} className="animate-spin text-blue-500" />
        <p className="text-sm">ກໍາລັງກວດສອບການເຂົ້າສູ່ລະບົບ...</p>
      </div>
    </div>
  );

  if (!user) return null;

  const requiredPerm = PAGE_PERMS[pathname];
  const noAccess = requiredPerm && !perm(requiredPerm);

  return (
    // ໃຊ້ items-stretch ແທນ overflow-hidden ເພື່ອໃຫ້ sidebar ຄວບຄຸມ width ຕົວເອງໄດ້
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          {noAccess ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
              <ShieldOff size={48} className="opacity-30" />
              <p className="text-base font-medium">ທ່ານບໍ່ມີສິດເຂົ້າໜ້ານີ້</p>
              <p className="text-xs">ກະລຸນາຕິດຕໍ່ Admin ເພື່ອຂໍສິດ</p>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  );
}