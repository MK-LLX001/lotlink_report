// src/app/api/oracle/PROMOTION/repo.promotion.ts
import oracledb from "oracledb";
import { withConnection } from "../Connect_db";
import { PromotionEntity } from "@/app/Telco_topup/types/types.pomotion";

export class Promotion_Service_Repo {
  async findPromotion(
    fromDate: string,
    toDate: string,
  ): Promise<PromotionEntity[]> {
    return withConnection(async (conn) => {
      const sql = `
WITH date_list AS ( SELECT TO_DATE(:fromDate, 'YYYY-MM-DD') + LEVEL - 1 AS promo_date FROM dual CONNECT BY TO_DATE(:fromDate, 'YYYY-MM-DD') + LEVEL - 1  <= TO_DATE(:toDate, 'YYYY-MM-DD')),
latest_txn AS ( SELECT ID, srn  FROM ( SELECT T.ID, T.srn, ROW_NUMBER() OVER ( PARTITION BY T.srn ORDER BY T.txtime DESC  ) rn  FROM telco_transaction@splus_2026_db T ) WHERE rn = 1 ),
base AS ( SELECT TRUNC(A.ordertime) AS promo_date, A.provider, A.payment_amount,
        CASE
            WHEN A.process_status = 'DONE' THEN 'SUCCESS'  WHEN A.process_status <> 'DONE'
                 AND D.splus_ref IS NOT NULL THEN 'SUCCESS' ELSE 'NOT_SUCCESS' END AS scenario_status
    FROM telco_order@splus_2026_db A LEFT JOIN latest_txn T   ON A.srn = T.srn  LEFT JOIN telco_data D ON T.ID = D.splus_ref
    WHERE A.payment_type = 'PROMO'  AND A.ordertime >= TO_DATE(:fromDate, 'YYYY-MM-DD') AND A.ordertime <  TO_DATE(:toDate, 'YYYY-MM-DD') + 1 ),
summary_data AS (
    SELECT  promo_date, SUM(CASE WHEN scenario_status = 'SUCCESS' THEN 1   ELSE 0  END) AS promo_txn_total,
        nvl(SUM(CASE  WHEN scenario_status = 'SUCCESS' THEN payment_amount ELSE 0 END), 0) AS amt_total,
        SUM(CASE WHEN UPPER(provider) = 'LTC' AND scenario_status = 'SUCCESS' THEN 1  ELSE 0  END) AS txn_ltc,
        nvl(SUM(CASE WHEN UPPER(provider) = 'LTC' AND scenario_status = 'SUCCESS' THEN payment_amount   ELSE 0  END), 0) AS amt_ltc,
        SUM(CASE WHEN UPPER(provider) = 'TPLUS' AND scenario_status = 'SUCCESS' THEN 1 ELSE 0  END) AS txn_tplus,
        nvl(SUM(CASE  WHEN UPPER(provider) = 'TPLUS'  AND scenario_status = 'SUCCESS' THEN payment_amount ELSE 0 END), 0) AS amt_tplus,
        SUM(CASE  WHEN UPPER(provider) = 'ETL'  AND scenario_status = 'SUCCESS' THEN 1  ELSE 0 END) AS txn_etl,
        nvl(SUM(CASE  WHEN UPPER(provider) = 'ETL' AND scenario_status = 'SUCCESS' THEN payment_amount  ELSE 0  END), 0) AS amt_etl,
        SUM(CASE  WHEN UPPER(provider) = 'UNITEL'  AND scenario_status = 'SUCCESS' THEN 1  ELSE 0   END) AS txn_unitel,
        nvl(SUM(CASE  WHEN UPPER(provider) = 'UNITEL' AND scenario_status = 'SUCCESS' THEN payment_amount ELSE 0  END), 0) AS amt_unitel
    FROM base GROUP BY promo_date
)
SELECT  to_char(D.promo_date, 'DD-MM-YYYY') AS promo_date, nvl(S.promo_txn_total, 0) AS promo_txn_total,  nvl(S.amt_total, 0) AS amt_total, nvl(S.txn_ltc, 0) AS txn_ltc,
    nvl(S.amt_ltc, 0) AS amt_ltc,  nvl(S.txn_tplus, 0) AS txn_tplus, nvl(S.amt_tplus, 0) AS amt_tplus, nvl(S.txn_etl, 0) AS txn_etl, nvl(S.amt_etl, 0) AS amt_etl,
    nvl(S.txn_unitel, 0) AS txn_unitel, nvl(S.amt_unitel, 0) AS amt_unitel
FROM date_list D LEFT JOIN summary_data S  ON S.promo_date = D.promo_date ORDER BY D.promo_date
      `;

      const result = await conn.execute(
        sql,
        { fromDate, toDate },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      return (result.rows as PromotionEntity[]) ?? [];
    });
  }
}
