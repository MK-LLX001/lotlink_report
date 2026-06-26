// src/app/CASES-LOTTO/services/Service_Cases.ts
import axiosInstance from "@/lib/axios_instance";
import type {
  CasesListParams,
  CasesListResponse,
  Case_Payload,
} from "../types/Type_Cases";

const BASE = "/oracle/Cases_support";

export class CasesService {
  // ── GET list ───────────────────────────────────────────────────────────────

  async fetchList(params: CasesListParams): Promise<CasesListResponse> {
    const res = await axiosInstance.get<{ data: CasesListResponse }>(BASE, {
      params: {
        action: "list",
        page: params.page,
        limit: params.limit,
        search: params.search,
        status: params.status,
      },
      timeout: 15_000,
    });
    return res.data.data;
  }

  // ── GET by ID ──────────────────────────────────────────────────────────────

  async fetchById(id: string) {
    const res = await axiosInstance.get(BASE, {
      params: { id },
      timeout: 15_000,
    });
    return res.data;
  }

  // ── POST helpers ───────────────────────────────────────────────────────────

  private buildForm(
    action: string,
    fields: Record<string, string | undefined | null>,
    images?: File[],
  ): FormData {
    const fd = new FormData();
    fd.append("action", action);
    Object.entries(fields).forEach(([k, v]) => {
      if (v != null) fd.append(k, String(v));
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

  // ── create ─────────────────────────────────────────────────────────────────

  async create(data: Case_Payload, images?: File[]) {
    return this.post(this.buildForm("create", { ...data }, images));
  }

  // ── update ─────────────────────────────────────────────────────────────────

  async update(id: string, data: Partial<Case_Payload>) {
    return this.post(this.buildForm("update", { id, ...data }));
  }

  async offCases(id: string, username: string, status: string) {
    return this.post(this.buildForm("offcases", { id, username, status }));
  }
  // ── delete ─────────────────────────────────────────────────────────────────

  async delete(id: string, username: string) {
    return this.post(this.buildForm("delete", { id, username }));
  }

  // ── log — บันทึก datetime + user ──────────────────────────────────────────

  async log(case_id: string, username: string) {
    return this.post(this.buildForm("log", { case_id, username }));
  }

  // ใน CasesService class
  async GetCasesByUserReport(
    username: string,
    from_date?: string,
    to_date?: string,
    problem_type?: string,
  ) {
    return this.post(
      this.buildForm("getcasesbyuserreport", {
        username,
        from_date,
        to_date,
        problem_type,
      }),
    );
  }
}

// singleton — import ใช้ได้เลย ไม่ต้อง new ทุกครั้ง
export const casesService = new CasesService();
