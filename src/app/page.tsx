"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { RefreshCw } from "lucide-react";

export default function RootPage() {
  const { user, loading, perm, menus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }

    // static permissions ກ່ອນ
    if (perm("page_dashboard")) { router.replace("/dashboard");    return; }
    if (perm("page_issues"))    { router.replace("/issues");       return; }
    if (perm("page_users"))     { router.replace("/admin/users");  return; }
    if (perm("user_manage"))    { router.replace("/admin/menus");  return; }

    // ລໍ dynamic menus ໂຫຼດ
    if (menus.length === 0) return;

    // ຮຽງ dynamic menus ຕາມ sidebar: section → group → item
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

    if (firstDynamic?.href) { router.replace(firstDynamic.href); return; }

    // ບໍ່ມີສິດຫຍັງ → ກັບ /login
    router.replace("/login");
  }, [user, loading, perm, menus, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <RefreshCw size={24} className="animate-spin text-blue-500" />
    </div>
  );
}
