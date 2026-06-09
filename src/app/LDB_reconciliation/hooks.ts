// hooks/useLDB_Reconciliation.ts
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios_instance";
import axios from "axios";
export const KEY_QUERY = {
  LDB_RCT: "LDB_RECONCILIATION",
} as const;

interface DateRange {
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string; // "YYYY-MM-DD"
  account?: string;
}

// ── ① retry helper ──────────────────────────────────────────────────────────
// ไม่ retry เมื่อเป็น 4xx (ผิดที่ client) แต่ retry 1 ครั้งสำหรับ network glitch
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status;
    if (status >= 400 && status < 500) return false; // 4xx → ไม่ retry
  }
  return failureCount < 1; // retry ครั้งเดียวสำหรับ network/timeout
}

export const LDB_Reconciliation = ({
  dateFrom,
  dateTo,
  account,
}: DateRange) => {
  return useQuery({
    queryKey: [KEY_QUERY.LDB_RCT, dateFrom, dateTo, account],

    queryFn: async ({ signal }) => {
      // ② ส่ง AbortSignal เพื่อให้ cancel request ได้เมื่อ unmount / queryKey เปลี่ยน
      const { data } = await axiosInstance.get("/oracle", {
        params: {
          view: KEY_QUERY.LDB_RCT,
          date_from: dateFrom,
          date_to: dateTo,
          account,
        },
        timeout: 300_000, // 5 min — ยังคงไว้เผื่อ Oracle ช้า
        signal, // ← ใหม่
      });
      return data;
    },

    enabled: !!dateFrom && !!dateTo && !!account,

    // ③ caching — ป้องกัน refetch ซ้ำสำหรับช่วงวันที่เดิม
    staleTime: 5 * 60 * 1000, // 5 นาที — data ยังถือว่า fresh
    gcTime: 10 * 60 * 1000, // 10 นาที — เก็บ cache ไว้ใน memory

    // ④ retry ฉลาดขึ้น
    retry: shouldRetry,
    retryDelay: 2000, // รอ 2 วินาทีก่อน retry

    // ⑤ ไม่ refetch เมื่อ focus กลับมาที่หน้าต่าง (สำคัญมากสำหรับ query ช้า)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
