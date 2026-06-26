// src/app/api/oracle/Cases_support/repo/Repo_Cases.ts
import oracledb from "oracledb";
import { withConnection } from "../Connect_db"; // ✅ path ถูกต้อง
import {
  ORDER_SPIN_ENTITY,
  REFUND_POINTS_ENTITY,
  STMT_SPIN_ENTITY,
  WinnerEntity,
} from "../../../CASES-LOTTO/types/Type_spin";
import { promises } from "dns";

export class Spin_Repo {
  async findByIdOrder(case_number: string): Promise<ORDER_SPIN_ENTITY | null> {
    return withConnection(async (conn) => {
      const sql = `
      SELECT * FROM (
        SELECT * FROM APP_V_ORDER_SPIN WHERE WINXREF LIKE :case_1
        UNION ALL
        SELECT * FROM APP_V_ORDER_SPIN WHERE USERID LIKE :case_2
      ) FETCH FIRST 1 ROW ONLY
    `;

      const result = await conn.execute(
        sql,
        {
          case_1: `%${case_number}%`,
          case_2: `%${case_number}%`,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const rows = result.rows as ORDER_SPIN_ENTITY[] | undefined;
      return rows?.[0] ?? null;
    });
  }

  async findByIdSpin_Stmt(
    case_number: string,
  ): Promise<STMT_SPIN_ENTITY | null> {
    return withConnection(async (conn) => {
      // 🌟 Scenario ແນະນຳ: ໃຊ້ UNION ALL ແທນ OR ເພື່ອໃຫ້ Oracle ໃຊ້ Index ໄດ້ 100% ແລະ ແກ້ບັນຫາ Bind parameter ຊ້ຳ
      const sql = `
        SELECT * FROM (
          SELECT * FROM V_SPIN_STATEMENT_ALL WHERE XREF LIKE :case_1
          UNION ALL
          SELECT * FROM V_SPIN_STATEMENT_ALL WHERE BILLNUMBER LIKE :case_2
        )
        FETCH FIRST 1 ROW ONLY
      `;

      const result = await conn.execute(
        sql,
        {
          case_1: `%${case_number}%`,
          case_2: `%${case_number}%`,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }, // ✅ ຖືກຕ້ອງແລ້ວ
      );

      // ✅ Cast type ເພື່ອປ້ອງກັນ Untyped function calls ຢ່າງປອດໄພ
      const rows = result.rows as STMT_SPIN_ENTITY[] | undefined;
      return rows?.[0] ?? null;
    });
  }

  async findByIdRefundPoints(
    case_number: string,
  ): Promise<REFUND_POINTS_ENTITY[]> {
    // ✅ array
    return withConnection(async (conn) => {
      const sql = `
      SELECT TXTIME, REFERENCE, XREF, AMOUNT, TYPE, TELLER, DESCRIPTION
      FROM V2026_POINT_LEDGER
      WHERE XREF IN (
        SELECT XREF FROM V2026_POINT_LEDGER WHERE REFERENCE = :case_number
      )
    `;

      const result = await conn.execute(
        sql,
        { case_number },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const rows = result.rows as REFUND_POINTS_ENTITY[] | undefined;
      return rows ?? []; // ✅ return []
    });
  }

  // repo
  async findByIdWinner(
    fromDate: string,
    toDate: string,
    amount: string,
  ): Promise<WinnerEntity[]> {
    return withConnection(async (conn) => {
      const sql = `
      SELECT *
        FROM SPIN_LEDGER@SPLUS_2026_DB
       WHERE TRUNC(TXTIME) >= TO_DATE(:fromDate, 'YYYY-MM-DD')
         AND TRUNC(TXTIME) <  TO_DATE(:toDate,   'YYYY-MM-DD') + 1
         AND WINAMOUNT      >= :amount
       ORDER BY TXTIME DESC
    `;

      const result = await conn.execute(
        sql,
        {
          fromDate, // ← bind variable ตรงกับ :fromDate
          toDate, // ← bind variable ตรงกับ :toDate
          amount: Number(amount),
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return (result.rows as WinnerEntity[]) ?? [];
    });
  }
}
