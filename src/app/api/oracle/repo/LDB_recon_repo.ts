import { withConnection } from "../Connect_db";
import { ReconciliationRow } from "@/app/LDB_reconciliation/ldb_rct_types";
import {
  sql_LDB_recon_221,
  sql_LDB_recon_944,
  sql_LDB_recon_2360020,
  sql_LDB_recon_3360020,
} from "../sql/LDB_Query";

// ສ້າງ Mapping Object ເພື່ອຈັບຄູ່ Account ກັບ SQL Function ໃຫ້ເປັນລະບຽບ
const sqlQueryMap: Record<string, (isQuery: boolean) => string> = {
  "0302000010005221": sql_LDB_recon_221,
  "0302000010005944": sql_LDB_recon_944,
  LAK1354902360020: sql_LDB_recon_2360020,
  LAK1354903360020: sql_LDB_recon_3360020,
};

export async function Reconciliation_repo(
  dateFrom?: string,
  dateTo?: string,
  account?: string,
): Promise<ReconciliationRow[]> {
  // ── validation ──────────────────────────────────────────────────────────
  if (!dateFrom || !dateTo) {
    throw new Error("dateFrom ແລະ dateTo ຕ້ອງລະບຸ");
  }

  if (!account) {
    throw new Error("ກະລຸນາເລືອກ account ຫນຶ່ງ");
  }

  const binds: Record<string, string> = { dateFrom, dateTo, account };

  return withConnection(async (conn) => {
    // ກວດສອບວ່າ Account ທີ່ສົ່ງມາ ມີຢູ່ໃນ Map ທີ່ເຮົາກຳນົດໄວ້ຫຼືບໍ່
    const getSqlQuery = sqlQueryMap[account];

    if (!getSqlQuery) {
      // ຫາກບໍ່ພົບ Account ທີ່ກົງກັນ ໃຫ້ return ອາເຣວ່າງທັນທີ
      return [];
    }

    // ເອີ້ນໃຊ້ງານ Query ຜ່ານ Function ທີ່ຖືກຕ້ອງຕາມ Account ນັ້ນໆ
    const result = await conn.execute(getSqlQuery(true), binds, {
      outFormat: 4002, // OUT_FORMAT_OBJECT
      fetchArraySize: 5000, // ເພີ່ມປະສິດທິພາບການດຶງຂໍ້ມູນເປັນ 5000 ແຖວຕໍ່ຮອບ
    });

    return (result?.rows as ReconciliationRow[]) ?? [];
  });
}
