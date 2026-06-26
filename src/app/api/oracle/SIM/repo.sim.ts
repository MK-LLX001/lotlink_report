// src/app/api/oracle/SIM/repo/Repo_Cases.ts
import oracledb from "oracledb";
import { withConnection } from "../Connect_db";
import { SIM_ENTITY } from "@/app/Telco_topup/types/types.SIM";

export class Sim_Repo {

    async findSimOrder(fromDate: string, toDate: string): Promise<SIM_ENTITY[]> {
        return withConnection(async (conn) => {
            const sql = `
WITH sim_balances AS (
    SELECT
        TRUNC(txtime) AS txn_date,
        txtime,
        idx,
        UPPER(provider) AS provider,
        balance,
        ROW_NUMBER() OVER (
            PARTITION BY TRUNC(txtime), provider
            ORDER BY TO_NUMBER(to_char(txtime, 'HH24MISS')), txtime ASC
        ) AS rn
    FROM mastersimhistory@splus_2026_db
    WHERE txtime BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD') AND TO_DATE(:toDate, 'YYYY-MM-DD')
      AND to_char(txtime, 'HH24:MI:SS') IN (
          '00:00:00', '00:00:01', '00:00:02', '00:00:03', '00:00:04', '00:00:05',
          '00:00:06', '00:00:07', '00:00:08', '00:00:09', '00:00:10',
          '00:05:00', '00:05:01', '00:05:02', '00:05:03', '00:05:04', '00:05:05',
          '00:05:07', '00:05:15', '23:55:00', '23:55:01', '23:55:02'
      )
      AND UPPER(provider) IN ('UNITEL', 'LTC', 'TPLUS', 'ETL')
),
filtered AS (
    SELECT * FROM sim_balances WHERE rn = 1
)
SELECT
    TO_CHAR(txn_date, 'DD-MM-YYYY') AS TXN_DATE,

    MAX(CASE WHEN provider = 'LTC' THEN idx END) AS LTC_IDX,
    'LTC' AS LTC_PROVIDER,
    to_char(MAX(CASE WHEN provider = 'LTC' THEN txtime END), 'DD-MM-YYYY HH24:MI:SS') AS LTC_TIME,
    to_char(MAX(CASE WHEN provider = 'LTC' THEN balance ELSE 0 END)) AS LTC_BALANCE,

    MAX(CASE WHEN provider = 'TPLUS' THEN idx END) AS TPLUS_IDX,
    'TPLUS' AS TPLUS_PROVIDER,
    to_char(MAX(CASE WHEN provider = 'TPLUS' THEN txtime END), 'DD-MM-YYYY HH24:MI:SS') AS TPLUS_TIME,
    to_char(MAX(CASE WHEN provider = 'TPLUS' THEN balance ELSE 0 END)) AS TPLUS_BALANCE,

    MAX(CASE WHEN provider = 'ETL' THEN idx END) AS ETL_IDX,
    'ETL' AS ETL_PROVIDER,
    to_char(MAX(CASE WHEN provider = 'ETL' THEN txtime END), 'DD-MM-YYYY HH24:MI:SS') AS ETL_TIME,
    to_char(MAX(CASE WHEN provider = 'ETL' THEN balance ELSE 0 END)) AS ETL_BALANCE,

    MAX(CASE WHEN provider = 'UNITEL' THEN idx END) AS UNITEL_IDX,
    'UNITEL' AS UNITEL_PROVIDER,
    to_char(MAX(CASE WHEN provider = 'UNITEL' THEN txtime END), 'DD-MM-YYYY HH24:MI:SS') AS UNITEL_TIME,
    to_char(MAX(CASE WHEN provider = 'UNITEL' THEN balance ELSE 0 END)) AS UNITEL_BALANCE
FROM filtered
GROUP BY txn_date
ORDER BY txn_date
            `;

            const result = await conn.execute(
                sql,
                { fromDate, toDate },
                { outFormat: oracledb.OUT_FORMAT_OBJECT },
            );

            return (result.rows as SIM_ENTITY[]) ?? [];
        });
    }

}