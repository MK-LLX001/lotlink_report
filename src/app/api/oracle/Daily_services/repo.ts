import { mysqlPool } from "../Connect_db";
import type {
  DailyServiceListResponse,
  DailyServicePayload,
} from "../../../daily_services/types/types.daily.service";

export type StatusFilter = "ALL" | "100%" | "50%" | "ກຳລັງດຳເນີນງານ";

export class DailyRepo {
  async findAll(
    page?: string,
    limit?: string,
    search?: string,
    statusFilter?: StatusFilter,
  ): Promise<DailyServiceListResponse> {
    const pageNum = Math.max(1, parseInt(page ?? "1", 10));
    const limitNum = Math.max(1, parseInt(limit ?? "20", 10));
    const offset = (pageNum - 1) * limitNum;

    const search_ = search?.trim() ?? "";
    const status = statusFilter ?? "ALL";

    let where = `WHERE status <> 'REMOVED'`;
    const values: (string | number)[] = [];

    if (search_) {
      where += ` AND (
        UPPER(types_work) LIKE UPPER(?) OR
        UPPER(contact)    LIKE UPPER(?) OR
        UPPER(agreement)  LIKE UPPER(?)
      )`;
      values.push(`%${search_}%`, `%${search_}%`, `%${search_}%`);
    }

    if (status === "100%") {
      where += ` AND status = ?`;
      values.push("100%");
    } else if (status === "50%") {
      where += ` AND status = ?`;
      values.push("50%");
    } else if (status === "ກຳລັງດຳເນີນງານ") {
      where += ` AND status = ?`;
      values.push("ກຳລັງດຳເນີນງານ");
    }
    // ALL → ไม่ต้องเพิ่ม condition

    const [rowsResult, countResult]: any = await Promise.all([
      mysqlPool.execute(
        `SELECT *
         FROM daily_service
         ${where}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [...values, limitNum, offset],
      ),
      mysqlPool.execute(
        `SELECT COUNT(*) AS total
         FROM daily_service
         ${where}`,
        values,
      ),
    ]);

    return {
      success: true,
      message: "fetched successfully",
      data: rowsResult?.[0] ?? [],
      total: Number(countResult?.[0]?.[0]?.total ?? 0),
      page: pageNum,
      limit: limitNum,
    };
  }

  async create(data: DailyServicePayload, imageUrls: string[] = []) {
    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();

      const now = new Date();

      const sql = `
        INSERT INTO daily_service
          (types_work, description, contact, startDate, endDate,
           status, page, agreement, img_url, remark, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result]: any = await conn.execute(sql, [
        data.types_work,
        data.description,
        data.contact,
        data.startDate || null,
        data.endDate || null,
        data.status,
        data.page,
        data.agreement,
        data.img_url,
        data.remark,
        now,
        now,
      ]);

      await conn.commit();
      return { id: result.insertId, ...data, images: imageUrls };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async update(
    daily_id: string,
    data: {
      types_work: string;
      description: string;
      contact: string;
      startDate: string;
      endDate: string;
      status: string;
      page: string;
      agreement: string;
      img_url: string | null;
      remark: string;
    },
  ) {
    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();

      const sql = `
      UPDATE daily_service SET
        types_work  = ?,
        description = ?,
        contact     = ?,
        startDate   = ?,
        endDate     = ?,
        status      = ?,
        page        = ?,
        agreement   = ?,
        img_url     = COALESCE(?, img_url),
        remark      = ?,
        updated_at  = ?
      WHERE daily_id = ?
    `;

      await conn.execute(sql, [
        data.types_work,
        data.description,
        data.contact,
        data.startDate || null,
        data.endDate || null,
        data.status,
        data.page,
        data.agreement,
        data.img_url, // null → COALESCE เก็บค่าเดิม
        data.remark,
        new Date(),
        daily_id,
      ]);

      await conn.commit();
      return { daily_id, ...data };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  async delete(daily_id: string) {
    const conn = await mysqlPool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE daily_service SET status = 'REMOVED', updated_at = ? WHERE daily_id = ?`,
        [new Date(), daily_id],
      );
      await conn.commit();
      return { daily_id };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}
