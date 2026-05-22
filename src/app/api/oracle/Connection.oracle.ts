// lib/oracle/client.ts
import oracledb from "oracledb";

type OraclePool       = Awaited<ReturnType<typeof oracledb.createPool>>;
type OracleConnection = Awaited<ReturnType<OraclePool["getConnection"]>>;

let pool: OraclePool | null = null;

export async function getPool(): Promise<OraclePool> {
  if (!pool) {
    pool = await oracledb.createPool({
      user:          process.env.ORACLE_USER     ?? "",
      password:      process.env.ORACLE_PASSWORD ?? "",
      connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${process.env.ORACLE_HOST ?? "172.22.7.41"})(PORT=${process.env.ORACLE_PORT ?? "1521"}))(CONNECT_DATA=(SID=${process.env.ORACLE_SID ?? "centralrptde"})))`,
      poolMin: 1, poolMax: 5, poolIncrement: 1,
    });
  }
  return pool;
}

export async function withConnection<T>(
  fn: (conn: OracleConnection) => Promise<T>  
): Promise<T> {
  const conn = await (await getPool()).getConnection();
  try {
    return await fn(conn);
  } finally {
    await conn.close();
  }
}

export type { OracleConnection };