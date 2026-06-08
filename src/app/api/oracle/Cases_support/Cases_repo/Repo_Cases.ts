// src/app/api/oracle/Cases_support/repo/Repo_Cases.ts
import { mysqlPool } from "../../Connect_db";
import type {
  CasesListResponse,
  CaseItem,
} from "../../../../CASES-LOTTO/types/Type_Cases";
import { Insert_case_support } from "../Cases_sql/Query";

type StatusFilter = "ALL" | "ACTIVE" | "CLOSED";

export type CreateCaseInput = {
  case_number?: string;
  problem_type?: string;
  error_type?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  customer?: string;
  image_url: string | null;
};

export class CasesRepo {
  // ── findAll — list + pagination + filter ──────────────────────────────────

  async findAll(
    page?: string,
    limit?: string,
    search?: string,
    statusFilter?: StatusFilter,
  ): Promise<CasesListResponse> {
    const pageNum = Math.max(1, parseInt(page ?? "1", 10));
    const limitNum = Math.max(1, parseInt(limit ?? "20", 10));
    const offset = (pageNum - 1) * limitNum;
    const search_ = search?.trim() ?? "";
    const status = statusFilter ?? "ALL";

    let where = `WHERE status <> 'REMOVED'`;
    const values: (string | number | null)[] = [];

    if (search_) {
      where += ` AND (
        UPPER(case_number)  LIKE UPPER(?) OR
        UPPER(customer)     LIKE UPPER(?) OR
        UPPER(assigned_to)  LIKE UPPER(?) OR
        UPPER(problem_type) LIKE UPPER(?)
      )`;
      values.push(
        `%${search_}%`,
        `%${search_}%`,
        `%${search_}%`,
        `%${search_}%`,
      );
    }

    if (status === "CLOSED") {
      where += ` AND status = ?`;
      values.push("ປິດເຄສສຳເລັດແລ້ວ");
    } else if (status === "ACTIVE") {
      where += ` AND status <> ?`;
      values.push("ປິດເຄສສຳເລັດແລ້ວ");
    }

    const [[rows], [count]]: any = await Promise.all([
      mysqlPool.execute(
        `SELECT * FROM support_cases ${where}
         ORDER BY FIELD(priority,'MAX-HIGH','HIGH','MEDIUM','LOW'), created_at DESC
         LIMIT ? OFFSET ?`,
        [...values, limitNum, offset],
      ),
      mysqlPool.execute(
        `SELECT COUNT(*) AS total FROM support_cases ${where}`,
        values,
      ),
    ]);

    return {
      success: true,
      message: "Cases fetched successfully",
      data: rows ?? [],
      total: Number(count?.[0]?.total ?? 0),
      page: pageNum,
      limit: limitNum,
    };
  }

  // ── findById — case เดียว ─────────────────────────────────────────────────

  async findById(id: string): Promise<CaseItem | null> {
    const [rows]: any = await mysqlPool.execute(
      `SELECT * FROM support_cases WHERE id = ? AND status <> 'REMOVED' LIMIT 1`,
      [id],
    );
    return rows?.[0] ?? null;
  }

  // ── create ────────────────────────────────────────────────────────────────

  async create(data: CreateCaseInput) {
    const [result]: any = await mysqlPool.execute(Insert_case_support, [
      data.case_number ?? "",
      data.problem_type ?? "",
      data.error_type ?? "",
      data.description ?? "",
      data.status ?? "",
      data.priority ?? "",
      data.assigned_to ?? "",
      data.image_url ?? null,
      new Date(),
      new Date(),
      data.customer ?? "",
    ]);
    return { id: result.insertId, ...data };
  }

  // ── update ────────────────────────────────────────────────────────────────

  async update(id: string, data: Record<string, string | null>) {
    const fields = Object.keys(data)
      .map((k) => `${k} = ?`)
      .join(", ");
    const [result]: any = await mysqlPool.execute(
      `UPDATE support_cases SET ${fields}, updated_at = NOW() WHERE id = ?`,
      [...Object.values(data), id],
    );
    return { affected: result.affectedRows };
  }

  // ── softDelete ────────────────────────────────────────────────────────────

  async softDelete(id: string, username: string) {
    const [result]: any = await mysqlPool.execute(
      `UPDATE support_cases SET status = 'REMOVED', remove_at = NOW(), remove_user = ? WHERE id = ?`,
      [username, id], // ✅ username first, then id — matches the ? order
    );
    return { affected: result.affectedRows };
  }
  // softoffcases-----
  async softoffcases(id: string, username: string, status: string) {
    console.log(status, username);
    const [result]: any = await mysqlPool.execute(
      `UPDATE support_cases 
     SET status = ?, resolved_at = NOW(), close_user = ? 
     WHERE case_number = ?`,
      [status, username, id], // ✅ ຕ້ອງກົງກັບ ? ຕາມລຳດັບ
    );
    return { affected: result.affectedRows };
  }
  // getcasesbyuser-----
  async getcasesbyuser(username: string) {
    const [result]: any = await mysqlPool.execute(
      `SELECT *
     FROM support_cases
     WHERE assigned_to LIKE ?
       AND status <> 'REMOVED'
     ORDER BY
       FIELD(priority, 'MAX-HIGH', 'HIGH', 'MEDIUM', 'LOW'),
       created_at DESC`,
      [`%${username}%`],
    );
    return result;
  }
  // ── log — บันทึก datetime + user ─────────────────────────────────────────

  async log(case_id: string, username: string) {
    const [result]: any = await mysqlPool.execute(
      `INSERT INTO case_logs (case_id, username, created_at) VALUES (?, ?, NOW())`,
      [case_id, username],
    );
    return { id: result.insertId };
  }
}
