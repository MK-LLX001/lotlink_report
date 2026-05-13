// src/lib/activityService.ts
import {
  collection, addDoc, getDocs, query,
  orderBy, limit, where, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type ActivityAction =
  | "login"
  | "logout"
  | "issue_add"
  | "issue_edit"
  | "issue_delete"
  | "issue_import"
  | "issue_export"
  | "user_create"
  | "user_edit"
  | "user_delete"
  | "menu_create"
  | "menu_edit"
  | "menu_delete"
  | "lotto_search"
  | "lotto_export"
  | "lotto_print"
  | "reward_search"
  | "reward_print"
  | "bcel_refund_search"
  | "bcel_refund_export"
  | "bcel_refund_print"
  | "payout_drawid_search"
  | "payout_drawid_print";

export const ACTION_LABELS: Record<ActivityAction, string> = {
  login:        "ເຂົ້າສູ່ລະບົບ",
  logout:       "ອອກຈາກລະບົບ",
  issue_add:    "ເພີ່ມ Issue",
  issue_edit:   "ແກ້ໄຂ Issue",
  issue_delete: "ລຶບ Issue",
  issue_import: "Import Excel",
  issue_export: "Export Excel",
  user_create:  "ສ້າງ User",
  user_edit:    "ແກ້ໄຂ User",
  user_delete:  "ລຶບ User",
  menu_create:  "ສ້າງ Menu",
  menu_edit:    "ແກ້ໄຂ Menu",
  menu_delete:  "ລຶບ Menu",
  lotto_search:  "ຄົ້ນຫາ Lotto",
  lotto_export:  "Export Lotto Excel",
  lotto_print:   "ພິມລາຍງານ Lotto",
  reward_search: "ຄົ້ນຫາ Reward",
  reward_print:  "ພິມລາຍງານ Reward",
  bcel_refund_search: "ຄົ້ນຫາ BCEL Refund",
  bcel_refund_export: "Export BCEL Refund Excel",
  bcel_refund_print:  "ພິມລາຍງານ BCEL Refund",
  payout_drawid_search: "ຄົ້ນຫາ Payout",
  payout_drawid_print:  "ພິມລາຍງານ Payout",
};

export const ACTION_COLORS: Record<ActivityAction, string> = {
  login:        "bg-green-100 text-green-700",
  logout:       "bg-slate-100 text-slate-600",
  issue_add:    "bg-blue-100 text-blue-700",
  issue_edit:   "bg-yellow-100 text-yellow-700",
  issue_delete: "bg-red-100 text-red-700",
  issue_import: "bg-purple-100 text-purple-700",
  issue_export: "bg-indigo-100 text-indigo-700",
  user_create:  "bg-teal-100 text-teal-700",
  user_edit:    "bg-orange-100 text-orange-700",
  user_delete:  "bg-red-100 text-red-700",
  menu_create:  "bg-cyan-100 text-cyan-700",
  menu_edit:    "bg-amber-100 text-amber-700",
  menu_delete:  "bg-rose-100 text-rose-700",
  lotto_search:  "bg-sky-100 text-sky-700",
  lotto_export:  "bg-violet-100 text-violet-700",
  lotto_print:   "bg-pink-100 text-pink-700",
  reward_search: "bg-amber-100 text-amber-700",
  reward_print:  "bg-orange-100 text-orange-700",
  bcel_refund_search: "bg-blue-100 text-blue-700",
  bcel_refund_export: "bg-emerald-100 text-emerald-700",
  bcel_refund_print:  "bg-slate-100 text-slate-700",
  payout_drawid_search: "bg-blue-100 text-blue-700",
  payout_drawid_print:  "bg-indigo-100 text-indigo-700",
};

export interface ActivityLog {
  id:          string;
  uid:         string;
  displayName: string;
  email:       string;
  action:      ActivityAction;
  detail?:     string;
  createdAt:   Timestamp | null;
}

/** ບັນທຶກ activity ໃໝ່ */
export async function logActivity(data: {
  uid:         string;
  displayName: string;
  email:       string;
  action:      ActivityAction;
  detail?:     string;
}): Promise<void> {
  try {
    await addDoc(collection(db, "activity_logs"), {
      ...data,
      createdAt: serverTimestamp(),
    });
  } catch {
    // silently fail — ບໍ່ block UI ຖ້າ log ບໍ່ສຳເລັດ
  }
}

/** ດຶງ activity ທັງໝົດ (ຫຼ້າສຸດ 200 ລາຍການ) */
export async function getActivityLogs(filterUid?: string): Promise<ActivityLog[]> {
  const col = collection(db, "activity_logs");
  const q = filterUid
    ? query(col, where("uid", "==", filterUid), orderBy("createdAt", "desc"), limit(200))
    : query(col, orderBy("createdAt", "desc"), limit(200));

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id:          d.id,
    uid:         d.data().uid         ?? "",
    displayName: d.data().displayName ?? "",
    email:       d.data().email       ?? "",
    action:      d.data().action      as ActivityAction,
    detail:      d.data().detail,
    createdAt:   d.data().createdAt   ?? null,
  }));
}