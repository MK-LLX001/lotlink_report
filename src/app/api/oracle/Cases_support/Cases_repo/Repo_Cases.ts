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
  cust_connect?: string;
  notes?: string;
  StartDate?: string;
  EndDate?: string;
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

  // ── findById — case เดียว (พ่วงรูปทั้งหมดมาด้วย) ──────────────────────────

  async findById(id: string): Promise<CaseItem | null> {
    const [rows]: any = await mysqlPool.execute(
      `SELECT * FROM support_cases WHERE id = ? AND status <> 'REMOVED' LIMIT 1`,
      [id],
    );
    const caseRow = rows?.[0] ?? null;
    if (!caseRow) return null;

    const [images]: any = await mysqlPool.execute(
      `SELECT id, image_url, created_at FROM case_images WHERE case_id = ? ORDER BY id ASC`,
      [id],
    );

    return { ...caseRow, images: images ?? [] };
  }

  // ── create — บันทึกเคส + รูปทุกรูป ในทรานแซกชันเดียวกัน ──────────────────

  async create(data: CreateCaseInput, imageUrls: string[] = []) {
    // ขอ connection เฉพาะตัวจาก pool เพื่อคุม transaction
    // (mysqlPool.execute ตรง ๆ แบบเดิมจะไม่อยู่ใน transaction เดียวกัน)
    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. INSERT เคสหลักก่อน เพื่อเอา insertId ไปผูกกับรูป
      const [result]: any = await conn.execute(Insert_case_support, [
        data.case_number ?? "",
        data.problem_type ?? "",
        data.error_type ?? "",
        data.description ?? "",
        data.status ?? "",
        data.priority ?? "",
        data.assigned_to ?? "",
        data.image_url ?? null,
        data.cust_connect ?? "",
        data.notes ?? "",
        data.StartDate || null, // ✅ เพิ่ม
        data.EndDate || null, // ✅ เพิ่ม
        new Date(),
        new Date(),
        data.customer ?? "",
      ]);

      const caseId = result.insertId;

      // 2. INSERT รูปทุกรูปลง case_images โดยผูกกับ caseId ที่เพิ่งได้มา
      if (imageUrls.length > 0) {
        const placeholders = imageUrls.map(() => "(?, ?, NOW())").join(", ");
        const values = imageUrls.flatMap((url) => [caseId, url]);
        await conn.execute(
          `INSERT INTO case_images (case_id, image_url, created_at) VALUES ${placeholders}`,
          values,
        );
      }

      // ทุกอย่างผ่าน → commit พร้อมกันทั้งสองคำสั่ง
      await conn.commit();
      return { id: caseId, ...data, images: imageUrls };
    } catch (err) {
      // ขั้นตอนไหนพัง → rollback ทั้งหมด ไม่มีเคสค้างไม่มีรูปแน่นอน
      await conn.rollback();
      throw err;
    } finally {
      // คืน connection กลับ pool เสมอ ไม่ว่าจะสำเร็จหรือพัง
      conn.release();
    }
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
      [username, id],
    );
    return { affected: result.affectedRows };
  }

  // softoffcases-----
  async softoffcases(id: string, username: string, status: string) {
    const [result]: any = await mysqlPool.execute(
      `UPDATE support_cases 
       SET status = ?, resolved_at = NOW(), close_user = ? 
       WHERE case_number = ?`,
      [status, username, id],
    );
    return { affected: result.affectedRows };
  }

  // getcasesbyuser-----
  // repo เพิ่ม method นี้
  async getcasesbyuserreport(
    username: string,
    from_date?: string,
    to_date?: string,
    problem_type?: string,
  ) {
    const conditions: string[] = ["assigned_to LIKE ?", "status <> 'REMOVED'"];
    const params: unknown[] = [`%${username}%`];

    if (from_date) {
      conditions.push("DATE(created_at) >= ?");
      params.push(from_date);
    }
    if (to_date) {
      conditions.push("DATE(created_at) <= ?");
      params.push(to_date);
    }
    if (problem_type && problem_type !== "ALL") {
      conditions.push("problem_type = ?");
      params.push(problem_type);
    }

    const where = conditions.join(" AND ");
    const [result]: any = await mysqlPool.execute(
      `SELECT *
     FROM support_cases
     WHERE ${where}
     ORDER BY
       FIELD(priority, 'MAX-HIGH', 'HIGH', 'MEDIUM', 'LOW'),
       created_at DESC`,
      params as any,
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
