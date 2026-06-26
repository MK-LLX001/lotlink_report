// ── types/types.daily.service.ts ─────────────────────────────────────────────

// ─── Payload (สำหรับ create) ──────────────────────────────────────────────────
export type DailyServicePayload = {
  types_work: string;
  description: string;
  contact: string;
  startDate: string;
  endDate: string;
  status: string;
  page: string;
  agreement: string;
  remark: string;
  img_url: string | null; // ✅ แก้ตรงนี้
};

// ─── Item (row จาก DB) ───────────────────────────────────────────────────────
export type DailyServiceItem = {
  daily_id: number;
  types_work: string;
  description: string | null;
  contact: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  page: string | null;
  agreement: string | null;
  img_url: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Query params ─────────────────────────────────────────────────────────────
// ✅ ลบ ALL/DONE/MIDIDE/DOING ออก — ไม่ใช่ field ของ params
export type DailyServiceListParams = {
  page: number;
  limit: number;
  search: string;
  status?: string; // optional — ส่งเมื่อต้องการ filter
};

// ─── API response ─────────────────────────────────────────────────────────────
export type DailyServiceListResponse = {
  success: boolean;
  message: string;
  data: DailyServiceItem[];
  total: number;
  page: number;
  limit: number;
};
