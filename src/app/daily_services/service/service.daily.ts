// ── service/service.daily.ts ──────────────────────────────────────────────────

import axiosInstance from "@/lib/axios_instance";
import type {
  DailyServicePayload,
  DailyServiceListParams,
  DailyServiceListResponse,
} from "../types/types.daily.service";

const BASE = "/oracle/Daily_services";

export class DailyService {
  // ── helpers ──────────────────────────────────────────────────────────────

  private buildForm(
    action: string,
    fields: Record<string, unknown>,
    images?: File[],
  ): FormData {
    const fd = new FormData();
    fd.append("action", action);
    Object.entries(fields).forEach(([k, v]) => {
      if (v != null && v !== "") fd.append(k, String(v));
    });
    images?.forEach((file) => fd.append("images", file));
    return fd;
  }

  private async post(fd: FormData) {
    const res = await axiosInstance.post(BASE, fd, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 15_000,
    });
    return res.data;
  }

  // ── create ────────────────────────────────────────────────────────────────

  async create(data: DailyServicePayload, images?: File[]) {
    return this.post(this.buildForm("create_daily", { ...data }, images));
  }

  // ── fetchList ─────────────────────────────────────────────────────────────
  // ✅ แก้ — unwrap res.data ให้ตรงกับ DailyServiceListResponse โดยตรง

  async fetchList(
    params: DailyServiceListParams,
  ): Promise<DailyServiceListResponse> {
    const res = await axiosInstance.get<DailyServiceListResponse>(BASE, {
      params: {
        action: "list",
        page: params.page,
        limit: params.limit,
        search: params.search || undefined, // ไม่ส่ง empty string
        status: params.status || undefined, // optional
      },
      timeout: 15_000,
    });
    return res.data; // ✅ ไม่ต้อง .data.data อีกชั้น
  }
}

// singleton
export const dailyService = new DailyService();
