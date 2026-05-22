// lib/oracle/reconciliation.repo.ts
import { withConnection } from "../Connection.oracle";
import { ReconciliationRow } from "@/app/LDB_reconciliation/ldb_rct_types";
import { sql_LDB_recon_221, sql_LDB_recon_2360020, sql_LDB_recon_3360020, sql_LDB_recon_944 } from "../sql/LDB_Query";

// map account → sql function
const SQL_MAP: Record<string, (hasAccount: boolean) => string> = {
  "0302000010005221": sql_LDB_recon_221,
  "0302000010005944": sql_LDB_recon_944,
  "LAK1354902360020": sql_LDB_recon_2360020,
  "LAK1354903360020": sql_LDB_recon_3360020,
};

export async function Reconciliation_repo(
  dateFrom?: string,
  dateTo?:   string,
  account?:  string,
): Promise<ReconciliationRow[]> {

  if (!dateFrom || !dateTo) {
    throw new Error("dateFrom ແລະ dateTo ຕ້ອງລະບຸ");
  }
  if ( account == "") {
   throw new Error("ກະລຸນາເລືອກ account ຫນຶ່ງ");
  }

  // เลือก SQL ตาม account — fallback ใช้ 221 ถ้าไม่มี
  const sqlFn = (account && SQL_MAP[account]) ? SQL_MAP[account] : sql_LDB_recon_221;

  const binds: Record<string, string> = {
    dateFrom,
    dateTo,
    ...(account ? { account } : {}),
  };

  // ✅ withConnection ครอบทั้งหมด — return อยู่ในนี้
  return withConnection(async (conn) => {
    const result = await conn.execute(
      sqlFn(!!account),
      binds,
      { outFormat: 4002, fetchArraySize: 200 },
    );

    return result.rows ?? [];
  });
}