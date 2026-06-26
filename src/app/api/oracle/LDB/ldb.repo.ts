// src/app/api/oracle/Cases_support/repo/Repo_Cases.ts
import oracledb from "oracledb";
import { withConnection } from "../Connect_db"; // ✅ path ถูกต้อง
import {
  ORDER_LDB_ENTITY,
  REWARD_LDB_ENTITY,
  STMT_LDB_ENTITY,
} from "../../../CASES-LOTTO/types/Type_Ldb";

export class LDB_Repo {
  async findByIdOrder(case_number: string): Promise<ORDER_LDB_ENTITY | null> {
    return withConnection(async (conn) => {
      const sql = `
      SELECT * FROM (
        SELECT * FROM APP_V_ORDERS_LDB WHERE BILLNUMBER LIKE :case_1
        UNION ALL
        SELECT * FROM APP_V_ORDERS_LDB WHERE TICKET LIKE :case_2
      )
      FETCH FIRST 1 ROW ONLY
    `;

      const result = await conn.execute(
        sql,
        {
          case_1: `%${case_number}%`,
          case_2: `%${case_number}%`,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const rows = result.rows as ORDER_LDB_ENTITY[] | undefined;
      return rows?.[0] ?? null;
    });
  }

  async findByBillNumber_Reward(
    BillNumber: string,
  ): Promise<REWARD_LDB_ENTITY | null> {
    return withConnection(async (conn) => {
      const result = await conn.execute(
        `SELECT * FROM APP_V_REWARD_LDB
            WHERE BILLNUMBER = :BillNumber`,
        { BillNumber },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }, // ✅ ใช้ constant แทนตัวเลข 2
      );

      // ✅ cast ที่ rows แทน generic บน execute (แก้ "Untyped function calls")
      const rows = result.rows as REWARD_LDB_ENTITY[] | undefined;
      return rows?.[0] ?? null;
    });
  }

  async findByBillNumber_STMT(BillNumber: string): Promise<STMT_LDB_ENTITY[]> {
    // ✅ เปลี่ยนเป็น array
    return withConnection(async (conn) => {
      const result = await conn.execute(
        `select * from APP_V_LDB_STMT
        WHERE BILLNUMBER = :BillNumber`,
        { BillNumber },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      const rows = result.rows as STMT_LDB_ENTITY[] | undefined;
      return rows ?? []; // ✅ return [] แทน null
    });
  }

  async findByLotoUser(case_number: string): Promise<ORDER_LDB_ENTITY | null> {
    return withConnection(async (conn) => {
      // 🌟 Scenario ແນະນຳ: ໃຊ້ UNION ALL ແທນ OR ເພື່ອໃຫ້ Oracle ໃຊ້ Index ໄດ້ 100% ແລະ ແກ້ບັນຫາ Bind parameter ຊ້ຳ
      const sql = `
        SELECT * FROM (
          SELECT * FROM APP_V_LOTTOUSERS WHERE LOTTOUSER LIKE :case_1
          UNION ALL
          SELECT * FROM APP_V_LOTTOUSERS WHERE REFERCODE LIKE :case_2
        )
        FETCH FIRST 1 ROW ONLY
      `;

      const result = await conn.execute(
        sql,
        {
          case_1: `%${case_number}%`,
          case_2: `%${case_number}%`,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      // ✅ Cast type ເພື່ອປ້ອງກັນ Untyped function calls ຢ່າງປອດໄພ
      const rows = result.rows as ORDER_LDB_ENTITY[] | undefined;
      return rows?.[0] ?? null;
    });
  }
}
