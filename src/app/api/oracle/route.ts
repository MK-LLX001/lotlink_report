// src/app/api/oracle/route.ts
import { NextRequest, NextResponse } from "next/server";

const ORA_CONFIG = {
  host:     process.env.ORACLE_HOST     ?? "172.22.7.41",
  port:     Number(process.env.ORACLE_PORT ?? "1521"),
  sid:      process.env.ORACLE_SID      ?? "centralrptde",
  user:     process.env.ORACLE_USER     ?? "ECOMMERCE2026",
  password: process.env.ORACLE_PASSWORD ?? "splususer12",
};

const SELL_VIEW           = "ECOMMERCE2026.APP_V_SCN_LOTTO_SELL";
const DRAWID_VIEW         = "ECOMMERCE2026.APP_V_SCN_LOTTO_SELL_DRAWID";
const MONTH_VIEW          = "ECOMMERCE2026.APP_V_SCN_LOTTO_SELL_MONTH";
const REWARD_VIEW         = "ECOMMERCE2026.APP_V_SCN_REWARD";
const REWARD_DRAWID_VIEW  = "ECOMMERCE2026.APP_V_SCN_REWARD_DRAWID";
const REWARD_CHANNEL_VIEW = "ECOMMERCE2026.APP_V_SCN_REWARD_DRAWID_CHANEL";
const BCEL_REFUND_VIEW    = "ECOMMERCE2026.APP_V_SCN_BCEL_REFUND";
const REWARD_BCEL_STMT    = "ECOMMERCE2026.REWARD_BCEL_STMT";
const JDB_STMT            = "ECOMMERCE2026.JDB_STMT";
const JDB_ACCT            = "02920020000003191";
const LDB_STMT            = "ECOMMERCE2026.LDB_STMT";
const LDB_ACCT            = "0302000010005221";

/** Column whitelist ກັນ SQL injection ສຳລັບ ORDER BY dynamic */
const SELL_SORT_COLS = new Set([
  "LOTTO_BILL_NO", "DRAWID", "DRAW_DATE", "PAY_BY", "OWNER",
  "BILL_AMT", "PAYMENT_AMT", "DIFF_PAYMENT", "SCN_PRO_AMT",
  "SCN_COUPON_AMT", "DISCOUNT_15_PERCENT", "DIFF_PRO",
  "COM_5_PERCENT", "FINAL_SCN_COM",
]);

const BCEL_SORT_COLS = new Set(["TID", "TT_TXN", "REFUND_AMT"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any = null;
async function getOracleDb() {
  if (_db) return _db;
  const mod = await import("oracledb");
  _db = mod.default ?? mod;
  return _db;
}

export async function GET(req: NextRequest) {
  const params  = new URL(req.url).searchParams;
  const viewKey = params.get("view") ?? "";

  const validViews = [
    "sell", "sell_options", "drawid", "month", "roundids",
    "reward", "reward_drawid", "reward_channel",
    "bcel_refund", "payout_drawid", "payout_users",
    "bcel_reward_summary", "bcel_tax5_items",
    "bank_reconciliation",
    "jdb_reward_summary",        // ✅ ສັງລວມລາງວັນ JDB ຕາມງວດ
    "jdb_tax5_items",            // ✅ ອາກອນ 5% (SPLUS_PRICE_TAX)
    "jdb_other_items",           // ✅ TXN_TYPE ນອກເໜືອ known types
    "jdb_bank_reconciliation",   // ✅ Bank Reconciliation JDB (ທັງ 2 ບັນຊີ)
    "ldb_reward_summary",        // ✅ ສັງລວມລາງວັນ LDB ຕາມງວດ (LDB_STMT)
    "ldb_tax_reward_items",      // ✅ ອາກອນ 5% LDB (SOKXAY_TAX_REWARD DEPOSIT)
  ];
  if (!validViews.includes(viewKey)) {
    return NextResponse.json(
      { error: `view ບໍ່ຖືກຕ້ອງ: "${viewKey}". ໃຊ້: ${validViews.join(" | ")}` },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let connection: any;
  try {
    const oracledb = await getOracleDb();
    const OPT_OBJ  = { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 200 };

    connection = await oracledb.getConnection({
      connectString: `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${ORA_CONFIG.host})(PORT=${ORA_CONFIG.port}))(CONNECT_DATA=(SID=${ORA_CONFIG.sid})))`,
      user:     ORA_CONFIG.user,
      password: ORA_CONFIG.password,
    });

    // ──────────────────────────────────────────────────────────────────────────
    // sell_options — distinct values ສຳລັບ dropdown (3 queries parallel, ໄວຫຼາຍ)
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "sell_options") {
      const [dr, dt, pb] = await Promise.all([
        connection.execute(
          `SELECT DISTINCT DRAWID    FROM ${SELL_VIEW} WHERE DRAWID    IS NOT NULL ORDER BY DRAWID    DESC`,
          {}, OPT_OBJ,
        ),
        connection.execute(
          `SELECT DISTINCT DRAW_DATE FROM ${SELL_VIEW} WHERE DRAW_DATE IS NOT NULL ORDER BY DRAW_DATE DESC`,
          {}, OPT_OBJ,
        ),
        connection.execute(
          `SELECT DISTINCT PAY_BY    FROM ${SELL_VIEW} WHERE PAY_BY    IS NOT NULL ORDER BY PAY_BY`,
          {}, OPT_OBJ,
        ),
      ]);
      return NextResponse.json({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        drawids: dr.rows?.map((r: any) => r.DRAWID)    ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dates:   dt.rows?.map((r: any) => r.DRAW_DATE) ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payBys:  pb.rows?.map((r: any) => r.PAY_BY)    ?? [],
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // sell — server-side filter + sort + pagination + aggregate totals
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "sell") {
      const drawid   = params.get("drawid")    ?? "";
      const drawDate = params.get("draw_date") ?? "";
      const payBy    = params.get("pay_by")    ?? "";
      const q        = params.get("q")         ?? "";
      const pageNum  = Math.max(1, parseInt(params.get("page")     ?? "1", 10));
      const pageSize = Math.min(500, Math.max(10, parseInt(params.get("pageSize") ?? "100", 10)));
      const rawSort  = params.get("sortKey") ?? "DRAW_DATE";
      const sortKey  = SELL_SORT_COLS.has(rawSort) ? rawSort : "DRAW_DATE";
      const sortDir  = params.get("sortDir") === "asc" ? "ASC" : "DESC";
      const offset   = (pageNum - 1) * pageSize;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fb: Record<string, any> = {};
      const clauses: string[] = [];

      if (drawid)   { clauses.push("DRAWID    = :p_drawid");    fb.p_drawid    = drawid; }
      if (drawDate) { clauses.push("DRAW_DATE = :p_draw_date"); fb.p_draw_date = drawDate; }
      if (payBy)    { clauses.push("PAY_BY    = :p_pay_by");    fb.p_pay_by    = payBy; }
      if (q) {
        clauses.push(
          "(LOTTO_BILL_NO LIKE :p_q OR OWNER LIKE :p_q OR PAY_BY LIKE :p_q OR DRAWID LIKE :p_q)",
        );
        fb.p_q = `%${q}%`;
      }

      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const aggSql = `
        SELECT COUNT(*)                  AS TOTAL,
               SUM(BILL_AMT)             AS BILL_AMT,
               SUM(PAYMENT_AMT)          AS PAYMENT_AMT,
               SUM(DIFF_PAYMENT)         AS DIFF_PAYMENT,
               SUM(SCN_PRO_AMT)          AS SCN_PRO_AMT,
               SUM(SCN_COUPON_AMT)       AS SCN_COUPON_AMT,
               SUM(DISCOUNT_15_PERCENT)  AS DISCOUNT_15_PERCENT,
               SUM(DIFF_PRO)             AS DIFF_PRO,
               SUM(COM_5_PERCENT)        AS COM_5_PERCENT,
               SUM(FINAL_SCN_COM)        AS FINAL_SCN_COM
        FROM ${SELL_VIEW} ${where}`;

      const dataSql = `
        SELECT * FROM ${SELL_VIEW} ${where}
        ORDER BY ${sortKey} ${sortDir}
        OFFSET :p_offset ROWS FETCH NEXT :p_limit ROWS ONLY`;

      const [aggRes, dataRes] = await Promise.all([
        connection.execute(aggSql, fb, OPT_OBJ),
        connection.execute(dataSql, { ...fb, p_offset: offset, p_limit: pageSize }, OPT_OBJ),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agg: any = aggRes.rows?.[0] ?? {};
      return NextResponse.json({
        rows:     dataRes.rows ?? [],
        total:    Number(agg.TOTAL            ?? 0),
        page:     pageNum,
        pageSize,
        totals: {
          BILL_AMT:            Number(agg.BILL_AMT            ?? 0),
          PAYMENT_AMT:         Number(agg.PAYMENT_AMT         ?? 0),
          DIFF_PAYMENT:        Number(agg.DIFF_PAYMENT        ?? 0),
          SCN_PRO_AMT:         Number(agg.SCN_PRO_AMT         ?? 0),
          SCN_COUPON_AMT:      Number(agg.SCN_COUPON_AMT      ?? 0),
          DISCOUNT_15_PERCENT: Number(agg.DISCOUNT_15_PERCENT ?? 0),
          DIFF_PRO:            Number(agg.DIFF_PRO            ?? 0),
          COM_5_PERCENT:       Number(agg.COM_5_PERCENT       ?? 0),
          FINAL_SCN_COM:       Number(agg.FINAL_SCN_COM       ?? 0),
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // drawid — ກອງດ້ວຍ from/to range
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "drawid") {
      const from = params.get("from") ?? "";
      const to   = params.get("to")   ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binds: Record<string, any> = {};
      const clauses: string[] = [];
      if (from) { clauses.push("DRAWID >= :p_from"); binds.p_from = from; }
      if (to)   { clauses.push("DRAWID <= :p_to");   binds.p_to   = to; }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await connection.execute(
        `SELECT * FROM ${DRAWID_VIEW} ${where} ORDER BY DRAWID DESC`,
        binds, OPT_OBJ,
      );
      return NextResponse.json({ rows: result.rows ?? [], view: DRAWID_VIEW });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // month / roundids — unchanged
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "month") {
      const from = params.get("month_from") ?? "";
      const to   = params.get("month_to")   ?? "";
      const q    = params.get("q")           ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binds: Record<string, any> = {};
      const clauses: string[] = [];
      if (from) { clauses.push("MONTH >= :p_from"); binds.p_from = from; }
      if (to)   { clauses.push("MONTH <= :p_to");   binds.p_to   = to; }
      if (q)    { clauses.push("(OWNER LIKE :p_q OR TO_CHAR(MONTH) LIKE :p_q)"); binds.p_q = `%${q}%`; }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await connection.execute(`SELECT * FROM ${MONTH_VIEW} ${where} ORDER BY MONTH DESC`, binds, OPT_OBJ);
      return NextResponse.json({ rows: result.rows ?? [], view: MONTH_VIEW });
    }

    if (viewKey === "roundids") {
      const result = await connection.execute(
        `SELECT DISTINCT ROUNDID FROM ECOMMERCE2026.SCN_LOTTO ORDER BY ROUNDID DESC`,
        {}, OPT_OBJ,
      );
      return NextResponse.json({ rows: result.rows ?? [] });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // reward — ລາຍລະອຽດ reward ແຕ່ລະລາຍການ (server-side filter + pagination)
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "reward") {
      const drawid  = params.get("drawid")  ?? "";
      const channel = params.get("channel") ?? "";
      const owner   = params.get("owner")   ?? "";
      const q       = params.get("q")       ?? "";
      const pageNum  = Math.max(1, parseInt(params.get("page")     ?? "1",   10));
      const pageSize = Math.min(500, Math.max(10, parseInt(params.get("pageSize") ?? "100", 10)));
      const offset   = (pageNum - 1) * pageSize;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fb: Record<string, any> = {};
      const clauses: string[] = [];
      if (drawid)  { clauses.push("DRAWID  = :p_drawid");  fb.p_drawid  = drawid; }
      if (channel) { clauses.push("CHANNEL = :p_channel"); fb.p_channel = channel; }
      if (owner)   { clauses.push("OWNER   = :p_owner");   fb.p_owner   = owner; }
      if (q) {
        clauses.push("(BILLNUMBER LIKE :p_q OR TRANSACTION_NO LIKE :p_q OR WIN_NUMBER LIKE :p_q OR OWNER LIKE :p_q OR CHANNEL LIKE :p_q)");
        fb.p_q = `%${q}%`;
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const aggSql = `
        SELECT COUNT(*) AS TOTAL,
               SUM(LOTLINK_REWARD)          AS LOTLINK_REWARD,
               SUM(LOTLINK_REWARD_AFTER_TAX) AS LOTLINK_REWARD_AFTER_TAX,
               SUM(LOTLINK_TAX_REWARD)       AS LOTLINK_TAX_REWARD,
               SUM(TT_PAID_REAWRD)           AS TT_PAID_REAWRD,
               SUM(SOKXAY_PRO)               AS SOKXAY_PRO,
               SUM(SCN_PRO)                  AS SCN_PRO
        FROM ${REWARD_VIEW} ${where}`;

      const dataSql = `
        SELECT * FROM ${REWARD_VIEW} ${where}
        ORDER BY DRAWID DESC, DRAW_DATE DESC
        OFFSET :p_offset ROWS FETCH NEXT :p_limit ROWS ONLY`;

      const [aggRes, dataRes] = await Promise.all([
        connection.execute(aggSql, fb, OPT_OBJ),
        connection.execute(dataSql, { ...fb, p_offset: offset, p_limit: pageSize }, OPT_OBJ),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agg: any = aggRes.rows?.[0] ?? {};
      return NextResponse.json({
        rows: dataRes.rows ?? [],
        total: Number(agg.TOTAL ?? 0),
        page: pageNum, pageSize,
        totals: {
          LOTLINK_REWARD:           Number(agg.LOTLINK_REWARD           ?? 0),
          LOTLINK_REWARD_AFTER_TAX: Number(agg.LOTLINK_REWARD_AFTER_TAX ?? 0),
          LOTLINK_TAX_REWARD:       Number(agg.LOTLINK_TAX_REWARD       ?? 0),
          TT_PAID_REAWRD:           Number(agg.TT_PAID_REAWRD           ?? 0),
          SOKXAY_PRO:               Number(agg.SOKXAY_PRO               ?? 0),
          SCN_PRO:                  Number(agg.SCN_PRO                  ?? 0),
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // reward_drawid — ສັງລວມ reward ຕາມ DRAWID (filter by drawid range)
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "reward_drawid") {
      const from = params.get("from") ?? "";
      const to   = params.get("to")   ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binds: Record<string, any> = {};
      const clauses: string[] = [];
      if (from) { clauses.push("DRAWID >= :p_from"); binds.p_from = from; }
      if (to)   { clauses.push("DRAWID <= :p_to");   binds.p_to   = to; }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await connection.execute(
        `SELECT * FROM ${REWARD_DRAWID_VIEW} ${where} ORDER BY DRAWID DESC`,
        binds, OPT_OBJ,
      );
      return NextResponse.json({ rows: result.rows ?? [], view: REWARD_DRAWID_VIEW });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // reward_channel — ສັງລວມ reward ຕາມ DRAWID + CHANNEL (filter by drawid range)
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "reward_channel") {
      const from    = params.get("from")    ?? "";
      const to      = params.get("to")      ?? "";
      const channel = params.get("channel") ?? "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binds: Record<string, any> = {};
      const clauses: string[] = [];
      if (from)    { clauses.push("DRAWID  >= :p_from");    binds.p_from    = from; }
      if (to)      { clauses.push("DRAWID  <= :p_to");      binds.p_to      = to; }
      if (channel) { clauses.push("CHANNEL  = :p_channel"); binds.p_channel = channel; }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await connection.execute(
        `SELECT * FROM ${REWARD_CHANNEL_VIEW} ${where} ORDER BY DRAWID DESC, CHANNEL`,
        binds, OPT_OBJ,
      );
      return NextResponse.json({ rows: result.rows ?? [], view: REWARD_CHANNEL_VIEW });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // bcel_refund — ລາຍງານ BCEL Refund (server-side filter + sort + pagination)
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "bcel_refund") {
      const tid      = params.get("tid") ?? "";
      const ttTxn    = params.get("tt_txn") ?? "";
      const dateFrom = params.get("date_from") ?? "";
      const dateTo   = params.get("date_to")   ?? "";
      const q        = params.get("q")         ?? "";
      const pageNum  = Math.max(1, parseInt(params.get("page")     ?? "1",   10));
      const pageSize = Math.min(500, Math.max(10, parseInt(params.get("pageSize") ?? "100", 10)));
      const rawSort  = params.get("sortKey") ?? "TID";
      const sortKey  = BCEL_SORT_COLS.has(rawSort) ? rawSort : "TID";
      const sortDir  = params.get("sortDir") === "asc" ? "ASC" : "DESC";
      const offset   = (pageNum - 1) * pageSize;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fb: Record<string, any> = {};
      const clauses: string[] = [];
      if (tid)      { clauses.push("TID      = :p_tid");      fb.p_tid      = tid; }
      if (ttTxn)    { clauses.push("TT_TXN   = :p_tt_txn");   fb.p_tt_txn   = ttTxn; }
      if (dateFrom) { clauses.push("TXN_DATE >= TO_DATE(:p_date_from, 'YYYY-MM-DD')");     fb.p_date_from = dateFrom; }
      if (dateTo)   { clauses.push("TXN_DATE <  TO_DATE(:p_date_to,   'YYYY-MM-DD') + 1"); fb.p_date_to   = dateTo; }
      if (q) {
        clauses.push("(TO_CHAR(TID) LIKE :p_q OR TO_CHAR(TT_TXN) LIKE :p_q)");
        fb.p_q = `%${q}%`;
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const aggSql  = `SELECT COUNT(*) AS TOTAL, SUM(REFUND_AMT) AS REFUND_AMT FROM ${BCEL_REFUND_VIEW} ${where}`;
      const dataSql = `
        SELECT * FROM ${BCEL_REFUND_VIEW} ${where}
        ORDER BY ${sortKey} ${sortDir}
        OFFSET :p_offset ROWS FETCH NEXT :p_limit ROWS ONLY`;

      const [aggRes, dataRes] = await Promise.all([
        connection.execute(aggSql, fb, OPT_OBJ),
        connection.execute(dataSql, { ...fb, p_offset: offset, p_limit: pageSize }, OPT_OBJ),
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const agg: any = aggRes.rows?.[0] ?? {};
      return NextResponse.json({
        rows:       dataRes.rows ?? [],
        total:      Number(agg.TOTAL      ?? 0),
        page:       pageNum,
        pageSize,
        totals: { REFUND_AMT: Number(agg.REFUND_AMT ?? 0) },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // payout_drawid — ສັງລວມ payout ຕາມ DRAW_ID
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "payout_drawid") {
      const from     = params.get("from")      ?? "";
      const to       = params.get("to")        ?? "";
      const dateFrom = params.get("date_from") ?? "";
      const dateTo   = params.get("date_to")   ?? "";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binds: Record<string, any> = {};
      const clauses: string[] = [];

      // ຍົກເວັ້ນ users ຕາມ param (comma-separated), ໃຊ້ NOT IN bind variables
      const excludeUserRaw = params.get("exclude_user") ?? "";
      const excludeList = excludeUserRaw
        ? excludeUserRaw.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      if (excludeList.length > 0) {
        clauses.push(`UPPER(lr.PAYOUT_USER) NOT IN (${excludeList.map((_, i) => `UPPER(:p_excl_${i})`).join(", ")})`);
        excludeList.forEach((u, i) => { binds[`p_excl_${i}`] = u; });
      }

      if (from)     { clauses.push("lr.DRAW_ID     >= :p_from");      binds.p_from      = from; }
      if (to)       { clauses.push("lr.DRAW_ID     <= :p_to");        binds.p_to        = to; }
      if (dateFrom) { clauses.push("lr.PAYOUT_DATE >= TO_DATE(:p_date_from, 'YYYY-MM-DD')");     binds.p_date_from = dateFrom; }
      if (dateTo)   { clauses.push("lr.PAYOUT_DATE <  TO_DATE(:p_date_to,   'YYYY-MM-DD') + 1"); binds.p_date_to   = dateTo; }

      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      // Query 1: ສັງລວມຕາມ DRAW_ID (ສໍາລັບ table ຫຼັກ)
      const sqlMain = `
        SELECT lr.DRAW_ID,
               SUM(lr.PAYOUT_REWARD_AMT) AS TOTAL_AMOUNT,
               COUNT(*)                  AS TOTAL_COUNT
        FROM ECOMMERCE2026.LOTLINK_PAYOUT lr
        ${where}
        GROUP BY lr.DRAW_ID
        ORDER BY lr.DRAW_ID ASC`;

      // Query 2: ດຶງ PAYOUT_USER + PAYOUT_DATE ທີ່ unique (ສໍາລັບ block ທາງລຸ່ມ)
      const sqlPayers = `
        SELECT DISTINCT
               lr.PAYOUT_USER,
               TO_CHAR(lr.PAYOUT_DATE, 'DD/MM/YYYY') AS PAYOUT_DATE
        FROM ECOMMERCE2026.LOTLINK_PAYOUT lr
        ${where}
        ORDER BY lr.PAYOUT_USER`;

      const [mainRes, payersRes] = await Promise.all([
        connection.execute(sqlMain,   binds, OPT_OBJ),
        connection.execute(sqlPayers, binds, OPT_OBJ),
      ]);

      return NextResponse.json({
        rows:   mainRes.rows   ?? [],
        payers: payersRes.rows ?? [],
        view: "LOTLINK_PAYOUT",
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // payout_users — ສັງລວມ payout ຕາມ PAYOUT_USER
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "payout_users") {
      const from     = params.get("from")      ?? "";
      const to       = params.get("to")        ?? "";
      const dateFrom = params.get("date_from") ?? "";
      const dateTo   = params.get("date_to")   ?? "";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const binds: Record<string, any> = {};
      const clauses: string[] = ["1=1"];

      if (from)     { clauses.push("lr.DRAW_ID     >= :p_from");      binds.p_from      = from; }
      if (to)       { clauses.push("lr.DRAW_ID     <= :p_to");        binds.p_to        = to; }
      if (dateFrom) { clauses.push("lr.PAYOUT_DATE >= TO_DATE(:p_date_from, 'YYYY-MM-DD')");     binds.p_date_from = dateFrom; }
      if (dateTo)   { clauses.push("lr.PAYOUT_DATE <  TO_DATE(:p_date_to,   'YYYY-MM-DD') + 1"); binds.p_date_to   = dateTo; }

      const where = `WHERE ${clauses.join(" AND ")}`;

      const sql = `
        SELECT lr.PAYOUT_USER,
               SUM(lr.PAYOUT_REWARD_AMT) AS TOTAL_AMOUNT,
               COUNT(*)                  AS TOTAL_COUNT
        FROM ECOMMERCE2026.LOTLINK_PAYOUT lr
        ${where}
        GROUP BY lr.PAYOUT_USER
        ORDER BY lr.PAYOUT_USER`;

      const result = await connection.execute(sql, binds, OPT_OBJ);
      return NextResponse.json({ rows: result.rows ?? [], view: "LOTLINK_PAYOUT_USERS" });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // bcel_reward_summary — ສັງລວມລາງວັນ BCEL ຕາມງວດ (REWARD_BCEL_STMT)
    // ອາກອນ5% = SUM(BANK_CR) WHERE TXN_TYPE='TAX LOTTERY PRIZE' — query ແຍກ
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "bcel_reward_summary") {
      const dateFrom = params.get("date_from") ?? "";
      const dateTo   = params.get("date_to")   ?? "";

      const conditions: string[] = [];
      const binds: Record<string, string> = {};

      if (dateFrom) {
        conditions.push("BANK_DATE >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
        binds.dateFrom = dateFrom;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setDate(dt.getDate() + 1);
        conditions.push("BANK_DATE < TO_DATE(:dateTo, 'YYYY-MM-DD')");
        binds.dateTo = dt.toISOString().slice(0, 10);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      // Query 1: ROLLUP ຕາມ DRAWID (ບໍ່ລວມ TAX ໃນ ROLLUP)
      const sqlMain = `
        SELECT
          t."ງວດ",
          t."ລາງວັນ",
          t."ໂຊກຊ້ອນໂຊກ",
          t."ຄ່າທຳນຽມ",
          t."ໂຊກ Spin",
          t."ຄ່າທຳນຽມ_SPIN",
          t."ລາງວັນ SCN",
          t."ໂຊກຊ້ອນໂຊກ SCN",
          t."ຄ່າທຳນຽມ SCN"
        FROM (
          SELECT
            CASE GROUPING(DRAWID)
              WHEN 1 THEN 'ລວມທັງໝົດ'
              ELSE TO_CHAR(DRAWID)
            END AS "ງວດ",
            TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ລາງວັນ",
            TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO'           THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ໂຊກຊ້ອນໂຊກ",
            TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'  THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ຄ່າທຳນຽມ",
            TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO_SPIN'      THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ໂຊກ Spin",
            TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUSPRO_SPIN'  THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ຄ່າທຳນຽມ_SPIN",
            TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SCNS LOTTERY PRIZE'       THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ລາງວັນ SCN",
            TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO_SCN_BONUS' THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ໂຊກຊ້ອນໂຊກ SCN",
            TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SCNS LOTTERY PRIZE'   THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ຄ່າທຳນຽມ SCN"
          FROM ${REWARD_BCEL_STMT}
          ${whereClause}
          GROUP BY ROLLUP(DRAWID)
          ORDER BY GROUPING(DRAWID), DRAWID
        ) t
      `;

      // Query 2: SUM(BANK_CR) WHERE TXN_TYPE='TAX LOTTERY PRIZE' — ບໍ່ GROUP BY
      const taxConditions = ["TXN_TYPE = 'TAX LOTTERY PRIZE'", ...conditions];
      const sqlTax = `
        SELECT TO_CHAR(SUM(BANK_CR), 'FM999,999,999,990.00') AS TAX_TOTAL
        FROM ${REWARD_BCEL_STMT}
        WHERE ${taxConditions.join(" AND ")}
      `;

      const [mainRes, taxRes] = await Promise.all([
        connection.execute(sqlMain, binds, OPT_OBJ),
        connection.execute(sqlTax,  binds, OPT_OBJ),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const taxTotal: string = (taxRes.rows?.[0] as any)?.TAX_TOTAL ?? "0.00";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (mainRes.rows ?? []).map((r: any) => ({
        "ງວດ":             r["ງວດ"]             ?? "",
        "ລາງວັນ":          r["ລາງວັນ"]          ?? "0.00",
        "ໂຊກຊ້ອນໂຊກ":      r["ໂຊກຊ້ອນໂຊກ"]      ?? "0.00",
        "ຄ່າທຳນຽມ":        r["ຄ່າທຳນຽມ"]        ?? "0.00",
        "ໂຊກ Spin":         r["ໂຊກ Spin"]         ?? "0.00",
        "ຄ່າທຳນຽມ_SPIN":   r["ຄ່າທຳນຽມ_SPIN"]   ?? "0.00",
        "ລາງວັນ SCN":       r["ລາງວັນ SCN"]       ?? "0.00",
        "ໂຊກຊ້ອນໂຊກ SCN":  r["ໂຊກຊ້ອນໂຊກ SCN"]  ?? "0.00",
        "ຄ່າທຳນຽມ SCN":    r["ຄ່າທຳນຽມ SCN"]    ?? "0.00",
        "ອາກອນ5%":          taxTotal,
      }));

      return NextResponse.json({ rows, taxTotal });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // bcel_tax5_items — ດຶງລາຍການ TAX LOTTERY PRIZE individual ທຸກ transaction
    // ໃຊ້ສຳລັບ col K ໃນ Excel export (ໃສ່ 1 ລາຍການ ຕໍ່ 1 ແຖວ)
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "bcel_tax5_items") {
      const dateFrom = params.get("date_from") ?? "";
      const dateTo   = params.get("date_to")   ?? "";

      const conditions: string[] = ["TXN_TYPE = 'TAX LOTTERY PRIZE'"];
      const binds: Record<string, string> = {};

      if (dateFrom) {
        conditions.push("BANK_DATE >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
        binds.dateFrom = dateFrom;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setDate(dt.getDate() + 1);
        conditions.push("BANK_DATE < TO_DATE(:dateTo, 'YYYY-MM-DD')");
        binds.dateTo = dt.toISOString().slice(0, 10);
      }

      const sql = `
        SELECT TO_CHAR(BANK_DATE, 'YYYY-MM-DD') AS BANK_DATE,
               TO_CHAR(DRAWID)                  AS DRAWID,
               BANK_CR
        FROM ${REWARD_BCEL_STMT}
        WHERE ${conditions.join(" AND ")}
        ORDER BY BANK_DATE ASC, BANK_CR DESC
      `;

      const result = await connection.execute(sql, binds, OPT_OBJ);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (result.rows ?? []).map((r: any) => ({
        BANK_DATE: r.BANK_DATE ?? "",
        DRAWID:    r.DRAWID    ?? "",
        BANK_CR:   Number(r.BANK_CR ?? 0),
      }));
      return NextResponse.json({ rows });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // bank_reconciliation — ການກະທົບຍອດ BCEL (ບັນຊີຈ່າຍ) ຕາມວັນທີ
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "bank_reconciliation") {
      const dateFrom = params.get("date_from") ?? "";
      const dateTo   = params.get("date_to")   ?? "";

      const conditions: string[] = [];
      const binds: Record<string, string> = {};

      if (dateFrom) {
        conditions.push("BANK_DATE >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
        binds.dateFrom = dateFrom;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setDate(dt.getDate() + 1);
        conditions.push("BANK_DATE < TO_DATE(:dateTo, 'YYYY-MM-DD')");
        binds.dateTo = dt.toISOString().slice(0, 10);
      }

      const mainWhere = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      const knownTypes = `'LOTTERY PRIZE','SPLUSPRO','SCNS LOTTERY PRIZE','SPLUSPRO_SPIN','TAX LOTTERY PRIZE','FEE_LOTTERY PRIZE','FEE_SCNS LOTTERY PRIZE','FEE_SPLUSPRO_SPIN','TRANSFER BY','FTR','SOKXAY PLUS COMMISSION','CHARGE FEE','BCEL E-COMMERCE MONTHLY FEE','FTR_FREE'`;

      const sqlMain = `
        SELECT
          TO_CHAR(BANK_DATE, 'YYYY-MM-DD') AS "ວັນທີ",
          TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'          THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO'               THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'SCNS LOTTERY PRIZE'     THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO_SPIN'          THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'FEE_SCNS LOTTERY PRIZE' THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUSPRO_SPIN'      THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_DR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE IN ('SOKXAY PLUS COMMISSION','CHARGE FEE','BCEL E-COMMERCE MONTHLY FEE','FTR_FREE') THEN BANK_DR ELSE 0 END)
          , 'FM999,999,999,990.00') AS "ລວມໜີ້",
          TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'TAX LOTTERY PRIZE'    THEN BANK_CR ELSE 0 END)
            + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR') THEN BANK_CR ELSE 0 END)
          , 'FM999,999,999,990.00') AS "ລວມມີ",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'          THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ລາງວັນ Sokxay",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO'               THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ໂຊກຊ້ອນໂຊກ",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ ໂຊກໄຊ",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO_SPIN'          THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ວົງລໍ້ໂຊກໄຊ",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUSPRO_SPIN'      THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ຄ່າທໍານຽມໂອນລາງວັນ ວົງລໍ້ໂຊກໄຊ",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TAX LOTTERY PRIZE'      THEN BANK_CR ELSE 0 END), 'FM999,999,999,990.00') AS "ອາກອນລາງວັນ ໂຊກໄຊ",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SCNS LOTTERY PRIZE'     THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ລາງວັນ SCN",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SCNS LOTTERY PRIZE' THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ SCN",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ການໂອນເງິນ - ໜີ້",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_CR ELSE 0 END), 'FM999,999,999,990.00') AS "ການໂອນເງິນ - ມີ",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE IN ('SOKXAY PLUS COMMISSION','CHARGE FEE','BCEL E-COMMERCE MONTHLY FEE','FTR_FREE') THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "Bank Fee",
          TO_CHAR(
            (
                SUM(CASE WHEN TXN_TYPE = 'LOTTERY PRIZE'          THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO'               THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'SCNS LOTTERY PRIZE'     THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'SPLUSPRO_SPIN'          THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'FEE_LOTTERY PRIZE'      THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'FEE_SCNS LOTTERY PRIZE' THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUSPRO_SPIN'      THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE IN ('SOKXAY PLUS COMMISSION','CHARGE FEE','BCEL E-COMMERCE MONTHLY FEE','FTR_FREE') THEN BANK_DR ELSE 0 END)
              - SUM(CASE WHEN TXN_TYPE = 'TAX LOTTERY PRIZE'      THEN BANK_CR ELSE 0 END)
              - SUM(CASE WHEN TXN_TYPE IN ('TRANSFER BY','FTR')   THEN BANK_CR ELSE 0 END)
            ) - (SUM(BANK_DR) - SUM(BANK_CR))
          , 'FM999,999,999,990.00') AS "ສ່ວນຕ່າງ"
        FROM ECOMMERCE2026.REWARD_BCEL_STMT
        ${mainWhere}
        GROUP BY ROLLUP(BANK_DATE)
        ORDER BY GROUPING(BANK_DATE), BANK_DATE
      `;

      const othersWhere = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";
      const sqlOthers = `
        SELECT
          TO_CHAR(BANK_DATE, 'YYYY-MM-DD') AS BD,
          TXN_TYPE,
          CASE
            WHEN SUM(BANK_DR) > 0 AND SUM(BANK_CR) = 0 THEN 'Dr'
            WHEN SUM(BANK_CR) > 0 AND SUM(BANK_DR) = 0 THEN 'Cr'
            ELSE 'Dr/Cr'
          END AS DIRECTION,
          ABS(SUM(BANK_DR) - SUM(BANK_CR)) AS AMT
        FROM ECOMMERCE2026.REWARD_BCEL_STMT
        WHERE TXN_TYPE NOT IN (${knownTypes})
          ${othersWhere}
        GROUP BY BANK_DATE, TXN_TYPE
        ORDER BY BANK_DATE, TXN_TYPE
      `;

      const [mainRes, othersRes] = await Promise.all([
        connection.execute(sqlMain,   binds, OPT_OBJ),
        connection.execute(sqlOthers, binds, OPT_OBJ),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const othersMap: Record<string, string> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (othersRes.rows ?? []).forEach((o: any) => {
        const bd  = String(o.BD ?? "");
        const txt = `${o.TXN_TYPE} (${o.DIRECTION}): ${Number(o.AMT).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
        othersMap[bd] = othersMap[bd] ? `${othersMap[bd]} | ${txt}` : txt;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (mainRes.rows ?? []).map((r: any) => ({
        "ວັນທີ":                           r["ວັນທີ"]                              ?? null,
        "ລວມໜີ້":                          r["ລວມໜີ້"]                             ?? "0.00",
        "ລວມມີ":                           r["ລວມມີ"]                              ?? "0.00",
        "ລາງວັນ Sokxay":                   r["ລາງວັນ Sokxay"]                      ?? "0.00",
        "ໂຊກຊ້ອນໂຊກ":                      r["ໂຊກຊ້ອນໂຊກ"]                         ?? "0.00",
        "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ ໂຊກໄຊ":    r["ຄ່າທໍານຽມໂອນລາງວັນຫວຍ ໂຊກໄຊ"]       ?? "0.00",
        "ວົງລໍ້ໂຊກໄຊ":                      r["ວົງລໍ້ໂຊກໄຊ"]                         ?? "0.00",
        "ຄ່າທໍານຽມໂອນລາງວັນ ວົງລໍ້ໂຊກໄຊ": r["ຄ່າທໍານຽມໂອນລາງວັນ ວົງລໍ້ໂຊກໄຊ"]    ?? "0.00",
        "ອາກອນລາງວັນ ໂຊກໄຊ":               r["ອາກອນລາງວັນ ໂຊກໄຊ"]                  ?? "0.00",
        "ລາງວັນ SCN":                       r["ລາງວັນ SCN"]                          ?? "0.00",
        "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ SCN":       r["ຄ່າທໍານຽມໂອນລາງວັນຫວຍ SCN"]          ?? "0.00",
        "ການໂອນເງິນ - ໜີ້":                 r["ການໂອນເງິນ - ໜີ້"]                    ?? "0.00",
        "ການໂອນເງິນ - ມີ":                  r["ການໂອນເງິນ - ມີ"]                     ?? "0.00",
        "Bank Fee":                         r["Bank Fee"]                            ?? "0.00",
        "ອື່ນໆ":                            r["ວັນທີ"] ? (othersMap[r["ວັນທີ"]] ?? null) : null,
        "ສ່ວນຕ່າງ":                         r["ສ່ວນຕ່າງ"]                            ?? "0.00",
      }));

      return NextResponse.json({ rows });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  BLOCK 1 — jdb_reward_summary (ໂຄງສ້າງໃໝ່ 7 columns ຕາມ template)
    //   TXN_TYPE:
    //     SPLUS_PRICE     → ລາງວັນ Sokxay   (col C)
    //     FEE_SPLUS_PRICE → ທຳນຽມ Sokxay    (col D)
    //     SPLUS_PRO       → ໂຊກຊ້ອນໂຊກ SK  (col E)
    //     SPLUS_SPIN      → ໂຊກ Spin        (col F)
    //     SCN_PRICE       → ລາງວັນ SCN      (col G)
    //     SCN_PRO         → ໂຊກຊ້ອນໂຊກ SCN (col H)
    // ══════════════════════════════════════════════════════════════════════════
    if (viewKey === "jdb_reward_summary") {
      const dateFrom = params.get("date_from") ?? "";
      const dateTo   = params.get("date_to")   ?? "";

      const conditions: string[] = [`BANK_ACCT = :jdbAcct`];
      const binds: Record<string, string> = { jdbAcct: JDB_ACCT };

      if (dateFrom) {
        conditions.push("TRUNC(BANK_TXN_DATE) >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
        binds.dateFrom = dateFrom;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setDate(dt.getDate() + 1);
        conditions.push("TRUNC(BANK_TXN_DATE) < TO_DATE(:dateTo, 'YYYY-MM-DD')");
        binds.dateTo = dt.toISOString().slice(0, 10);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      const sqlMain = `
        SELECT
          CASE GROUPING(DRAWID)
            WHEN 1 THEN 'ລວມທັງໝົດ'
            ELSE TO_CHAR(DRAWID)
          END AS "ງວດ",
          TO_CHAR(
            SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRICE'     THEN BANK_DR ELSE 0 END),
            'FM999,999,999,990') AS "ລາງວັນ Sokxay",
          TO_CHAR(
            SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUS_PRICE' THEN BANK_DR ELSE 0 END),
            'FM999,999,999,990') AS "ທຳນຽມ",
          TO_CHAR(
            SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRO'       THEN BANK_DR ELSE 0 END),
            'FM999,999,999,990') AS "ໂຊກຊ້ອນໂຊກ",
          TO_CHAR(
            SUM(CASE WHEN TXN_TYPE = 'SPLUS_SPIN'      THEN BANK_DR ELSE 0 END),
            'FM999,999,999,990') AS "ໂຊກ Spin",
          TO_CHAR(
            SUM(CASE WHEN TXN_TYPE = 'SCN_PRICE'       THEN BANK_DR ELSE 0 END),
            'FM999,999,999,990') AS "ລາງວັນ SCN",
          TO_CHAR(
            SUM(CASE WHEN TXN_TYPE = 'SCN_PRO'         THEN BANK_DR ELSE 0 END),
            'FM999,999,999,990') AS "ໂຊກຊ້ອນໂຊກ SCN"
        FROM ${JDB_STMT}
        ${whereClause}
        GROUP BY ROLLUP(DRAWID)
        ORDER BY GROUPING(DRAWID), DRAWID
      `;

      const result = await connection.execute(sqlMain, binds, OPT_OBJ);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (result.rows ?? []).map((r: any) => ({
        "ງວດ":              r["ງວດ"]              ?? "",
        "ລາງວັນ Sokxay":   r["ລາງວັນ Sokxay"]   ?? "0",
        "ທຳນຽມ":            r["ທຳນຽມ"]            ?? "0",
        "ໂຊກຊ້ອນໂຊກ":       r["ໂຊກຊ້ອນໂຊກ"]       ?? "0",
        "ໂຊກ Spin":         r["ໂຊກ Spin"]         ?? "0",
        "ລາງວັນ SCN":        r["ລາງວັນ SCN"]        ?? "0",
        "ໂຊກຊ້ອນໂຊກ SCN":   r["ໂຊກຊ້ອນໂຊກ SCN"]   ?? "0",
      }));

      return NextResponse.json({ rows });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  BLOCK 2 — jdb_tax5_items (ອາກອນ 5% — SPLUS_PRICE_TAX)
    //   ດຶງ BANK_CR, ໃສ່ col ອາກອນ ໃນ Excel, 1 ລາຍການ/ແຖວ
    // ══════════════════════════════════════════════════════════════════════════
    if (viewKey === "jdb_tax5_items") {
      const dateFrom = params.get("date_from") ?? "";
      const dateTo   = params.get("date_to")   ?? "";

      const conditions: string[] = [
        `BANK_ACCT = :jdbAcct`,
        `TXN_TYPE  = 'SPLUS_PRICE_TAX'`,
      ];
      const binds: Record<string, string> = { jdbAcct: JDB_ACCT };

      if (dateFrom) {
        conditions.push("TRUNC(BANK_TXN_DATE) >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
        binds.dateFrom = dateFrom;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setDate(dt.getDate() + 1);
        conditions.push("TRUNC(BANK_TXN_DATE) < TO_DATE(:dateTo, 'YYYY-MM-DD')");
        binds.dateTo = dt.toISOString().slice(0, 10);
      }

      const sql = `
        SELECT TO_CHAR(BANK_TXN_DATE, 'YYYY-MM-DD') AS BANK_DATE,
               TO_CHAR(DRAWID)                       AS DRAWID,
               BANK_CR
        FROM ${JDB_STMT}
        WHERE ${conditions.join(" AND ")}
        ORDER BY BANK_TXN_DATE ASC, BANK_CR DESC
      `;

      const result = await connection.execute(sql, binds, OPT_OBJ);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (result.rows ?? []).map((r: any) => ({
        BANK_DATE: r.BANK_DATE ?? "",
        DRAWID:    r.DRAWID    ?? "",
        BANK_CR:   Number(r.BANK_CR ?? 0),
      }));
      return NextResponse.json({ rows });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  BLOCK 3 — jdb_other_items (TXN_TYPE ນອກເໜືອ known types)
    //   known types: SPLUS_PRICE, FEE_SPLUS_PRICE, SPLUS_PRO, SPLUS_SPIN,
    //                SCN_PRICE, SCN_PRO, SPLUS_PRICE_TAX
    //   ດຶງ BANK_DESCRIPTION + BANK_DR > 0, ສະແດງໃນ col ຄ່າທຳນຽມ
    // ══════════════════════════════════════════════════════════════════════════
    if (viewKey === "jdb_other_items") {
      const dateFrom = params.get("date_from") ?? "";
      const dateTo   = params.get("date_to")   ?? "";

      const knownTypes = `'SPLUS_PRICE','FEE_SPLUS_PRICE','SPLUS_PRO','SPLUS_SPIN',
                          'SCN_PRICE','SCN_PRO','SPLUS_PRICE_TAX'`;

      const conditions: string[] = [
        `BANK_ACCT = :jdbAcct`,
        `TXN_TYPE NOT IN (${knownTypes})`,
      ];
      const binds: Record<string, string> = { jdbAcct: JDB_ACCT };

      if (dateFrom) {
        conditions.push("TRUNC(BANK_TXN_DATE) >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
        binds.dateFrom = dateFrom;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setDate(dt.getDate() + 1);
        conditions.push("TRUNC(BANK_TXN_DATE) < TO_DATE(:dateTo, 'YYYY-MM-DD')");
        binds.dateTo = dt.toISOString().slice(0, 10);
      }

      const sql = `
        SELECT
          TO_CHAR(BANK_TXN_DATE, 'YYYY-MM-DD') AS BANK_DATE,
          TXN_TYPE,
          BANK_DESCRIPTION,
          BANK_DR
        FROM ${JDB_STMT}
        WHERE ${conditions.join(" AND ")}
          AND BANK_DR > 0
        ORDER BY BANK_TXN_DATE ASC, TXN_TYPE, BANK_DESCRIPTION
      `;

      const result = await connection.execute(sql, binds, OPT_OBJ);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (result.rows ?? []).map((r: any) => ({
        BANK_DATE:        r.BANK_DATE        ?? "",
        TXN_TYPE:         r.TXN_TYPE         ?? "",
        BANK_DESCRIPTION: r.BANK_DESCRIPTION ?? "",
        BANK_DR:          Number(r.BANK_DR   ?? 0),
      }));
      return NextResponse.json({ rows });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  jdb_bank_reconciliation — ການກະທົບຍອດ JDB ຕາມວັນທີ (ຮອງຮັບທັງ 2 ບັນຊີ)
    //  TXN_TYPE ທີ່ໃຊ້ (ຈາກຮູບ):
    //    DR: SPLUS_PRICE, FEE_SPLUS_PRICE, SPLUS_PRO, SPLUS_REFUND, FEE_SPLUS_REFUND,
    //        TRANSFER (DR), ATT, IBANK_FEE, FTR_FEE, TRANSFER FEE, FEE_JDB_LOTTO_SETTL
    //    CR: LOTTO_SELL, TRANSFER (CR), SAVING_INTEREST, SPLUS_PRICE_TAX
    // ══════════════════════════════════════════════════════════════════════════
    if (viewKey === "jdb_bank_reconciliation") {
      const acctParam = params.get("acct") ?? JDB_ACCT;
      const dateFrom  = params.get("date_from") ?? "";
      const dateTo    = params.get("date_to")   ?? "";

      const conditions: string[] = [`BANK_ACCT = :acct`];
      const binds: Record<string, string> = { acct: acctParam };

      if (dateFrom) {
        conditions.push("TRUNC(BANK_TXN_DATE) >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
        binds.dateFrom = dateFrom;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setDate(dt.getDate() + 1);
        conditions.push("TRUNC(BANK_TXN_DATE) < TO_DATE(:dateTo, 'YYYY-MM-DD')");
        binds.dateTo = dt.toISOString().slice(0, 10);
      }

      const mainWhere = `WHERE ${conditions.join(" AND ")}`;

      // Known TXN_TYPEs used in columns (for "ອື່ນໆ" detection)
      const knownTypes = `'SPLUS_PRICE','FEE_SPLUS_PRICE','SPLUS_PRO','SPLUS_REFUND','FEE_SPLUS_REFUND',
                          'LOTTO_SELL','TRANSFER','ATT','IBANK_FEE','FTR_FEE','TRANSFER FEE',
                          'FEE_JDB_LOTTO_SETTL','SAVING_INTEREST','SPLUS_PRICE_TAX'`;

      const sqlMain = `
        SELECT
          TO_CHAR(TRUNC(BANK_TXN_DATE), 'YYYY-MM-DD') AS "ວັນທີ",
          -- ລວມໜີ້ = sum of all BANK_DR
          TO_CHAR(SUM(BANK_DR), 'FM999,999,999,990.00') AS "ລວມໜີ້",
          -- ລວມມີ = sum of all BANK_CR
          TO_CHAR(SUM(BANK_CR), 'FM999,999,999,990.00') AS "ລວມມີ",
          -- DR columns
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRICE'      THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "SPLUS_PRICE",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUS_PRICE'  THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "FEE_SPLUS_PRICE",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRO'        THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "SPLUS_PRO",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUS_REFUND'     THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "SPLUS_REFUND",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUS_REFUND' THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "FEE_SPLUS_REFUND",
          -- CR columns
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'LOTTO_SELL'       THEN BANK_CR ELSE 0 END), 'FM999,999,999,990.00') AS "LOTTO_SELL",
          -- TRANSFER: both DR and CR
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TRANSFER'         THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "TRANSFER",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TRANSFER'         THEN BANK_CR ELSE 0 END), 'FM999,999,999,990.00') AS "TRANSFER_CR",
          -- more DR
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'ATT'                    THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "ATT",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'IBANK_FEE'              THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "IBANK_FEE",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FTR_FEE'               THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "FTR_FEE",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'TRANSFER FEE'          THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "TRANSFER_FEE",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'FEE_JDB_LOTTO_SETTL'  THEN BANK_DR ELSE 0 END), 'FM999,999,999,990.00') AS "FEE_JDB_LOTTO_SETTL",
          -- more CR
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SAVING_INTEREST' THEN BANK_CR ELSE 0 END), 'FM999,999,999,990.00') AS "SAVING_INTEREST",
          TO_CHAR(SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRICE_TAX' THEN BANK_CR ELSE 0 END), 'FM999,999,999,990.00') AS "SPLUS_PRICE_TAX",
          -- ສ່ວນຕ່າງ = (sum categorised DR - sum categorised CR) - (actual BANK_DR - actual BANK_CR)
          TO_CHAR(
            (
                SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRICE'           THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUS_PRICE'       THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRO'             THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'SPLUS_REFUND'          THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'FEE_SPLUS_REFUND'      THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'TRANSFER'              THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'ATT'                   THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'IBANK_FEE'             THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'FTR_FEE'              THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'TRANSFER FEE'          THEN BANK_DR ELSE 0 END)
              + SUM(CASE WHEN TXN_TYPE = 'FEE_JDB_LOTTO_SETTL'  THEN BANK_DR ELSE 0 END)
              - SUM(CASE WHEN TXN_TYPE = 'LOTTO_SELL'            THEN BANK_CR ELSE 0 END)
              - SUM(CASE WHEN TXN_TYPE = 'TRANSFER'              THEN BANK_CR ELSE 0 END)
              - SUM(CASE WHEN TXN_TYPE = 'SAVING_INTEREST'       THEN BANK_CR ELSE 0 END)
              - SUM(CASE WHEN TXN_TYPE = 'SPLUS_PRICE_TAX'       THEN BANK_CR ELSE 0 END)
            ) - (SUM(BANK_DR) - SUM(BANK_CR))
          , 'FM999,999,999,990.00') AS "ສ່ວນຕ່າງ"
        FROM ${JDB_STMT}
        ${mainWhere}
        GROUP BY ROLLUP(TRUNC(BANK_TXN_DATE))
        ORDER BY GROUPING(TRUNC(BANK_TXN_DATE)), TRUNC(BANK_TXN_DATE)
      `;

      // Others map — TXN_TYPEs ທີ່ບໍ່ຢູ່ໃນ known list
      const othersConditions = [...conditions, `TXN_TYPE NOT IN (${knownTypes})`];
      const sqlOthers = `
        SELECT
          TO_CHAR(TRUNC(BANK_TXN_DATE), 'YYYY-MM-DD') AS BD,
          TXN_TYPE,
          CASE
            WHEN SUM(BANK_DR) > 0 AND SUM(BANK_CR) = 0 THEN 'Dr'
            WHEN SUM(BANK_CR) > 0 AND SUM(BANK_DR) = 0 THEN 'Cr'
            ELSE 'Dr/Cr'
          END AS DIRECTION,
          ABS(SUM(BANK_DR) - SUM(BANK_CR)) AS AMT
        FROM ${JDB_STMT}
        WHERE ${othersConditions.join(" AND ")}
        GROUP BY TRUNC(BANK_TXN_DATE), TXN_TYPE
        ORDER BY TRUNC(BANK_TXN_DATE), TXN_TYPE
      `;

      const [mainRes, othersRes] = await Promise.all([
        connection.execute(sqlMain,   binds, OPT_OBJ),
        connection.execute(sqlOthers, binds, OPT_OBJ),
      ]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const othersMap: Record<string, string> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (othersRes.rows ?? []).forEach((o: any) => {
        const bd  = String(o.BD ?? "");
        const txt = `${o.TXN_TYPE} (${o.DIRECTION}): ${Number(o.AMT).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
        othersMap[bd] = othersMap[bd] ? `${othersMap[bd]} | ${txt}` : txt;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (mainRes.rows ?? []).map((r: any) => ({
        "ວັນທີ":               r["ວັນທີ"]               ?? null,
        "ລວມໜີ້":              r["ລວມໜີ້"]              ?? "0.00",
        "ລວມມີ":               r["ລວມມີ"]               ?? "0.00",
        "SPLUS_PRICE":         r["SPLUS_PRICE"]         ?? "0.00",
        "FEE_SPLUS_PRICE":     r["FEE_SPLUS_PRICE"]     ?? "0.00",
        "SPLUS_PRO":           r["SPLUS_PRO"]           ?? "0.00",
        "SPLUS_REFUND":        r["SPLUS_REFUND"]        ?? "0.00",
        "FEE_SPLUS_REFUND":    r["FEE_SPLUS_REFUND"]    ?? "0.00",
        "LOTTO_SELL":          r["LOTTO_SELL"]          ?? "0.00",
        "TRANSFER":            r["TRANSFER"]            ?? "0.00",
        "TRANSFER_CR":         r["TRANSFER_CR"]         ?? "0.00",
        "ATT":                 r["ATT"]                 ?? "0.00",
        "IBANK_FEE":           r["IBANK_FEE"]           ?? "0.00",
        "FTR_FEE":             r["FTR_FEE"]             ?? "0.00",
        "TRANSFER_FEE":        r["TRANSFER_FEE"]        ?? "0.00",
        "FEE_JDB_LOTTO_SETTL": r["FEE_JDB_LOTTO_SETTL"] ?? "0.00",
        "SAVING_INTEREST":     r["SAVING_INTEREST"]     ?? "0.00",
        "SPLUS_PRICE_TAX":     r["SPLUS_PRICE_TAX"]     ?? "0.00",
        "ອື່ນໆ":               r["ວັນທີ"] ? (othersMap[r["ວັນທີ"]] ?? null) : null,
        "ສ່ວນຕ່າງ":            r["ສ່ວນຕ່າງ"]            ?? "0.00",
      }));

      return NextResponse.json({ rows });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  ldb_reward_summary — ສັງລວມລາງວັນ LDB ຕາມງວດ (LDB_STMT)
    //  TXN_TYPE → column mapping (WITHDRAW = ໜີ້, DEPOSIT = ມີ):
    //    SOKXAY_REWARD        → ຈຳນວນລາງວັນ Sokxay  (WITHDRAW)
    //    SOKXAY_BONUS         → ໂຊກຊ້ອນໂຊກ           (WITHDRAW)
    //    SOKXAY_SPIN          → Spin                  (WITHDRAW)
    //    SCN_REWARD           → ລາງວັນ SCN            (WITHDRAW)
    //    LDB_FEE_REWARD_FTR   → LDB_FEE_REWARD_FTR   (WITHDRAW)
    //    FTR                  → FTR                   (DEPOSIT)
    //    FTR_FEE              → FTR_FEE               (WITHDRAW)
    //    LDB_FEE_DEEPLINK     → LDB_FEE_DEEPLINK      (WITHDRAW)
    //    LDB_FEE_LOTTO_SELL   → LDB_FEE_LOTTO_SELL   (WITHDRAW+DEPOSIT)
    //    SOKXAY_TAX_REWARD    → ອາກອນ5%              (DEPOSIT)
    // ══════════════════════════════════════════════════════════════════════════
    if (viewKey === "ldb_reward_summary") {
      const dateFrom = params.get("date_from") ?? "";
      const dateTo   = params.get("date_to")   ?? "";

      const conditions: string[] = [`ACCT_NO = :ldbAcct`];
      const binds: Record<string, string> = { ldbAcct: LDB_ACCT };

      if (dateFrom) {
        conditions.push("DATE_TIME >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
        binds.dateFrom = dateFrom;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setDate(dt.getDate() + 1);
        conditions.push("DATE_TIME < TO_DATE(:dateTo, 'YYYY-MM-DD')");
        binds.dateTo = dt.toISOString().slice(0, 10);
      }

      const whereClause = `WHERE ${conditions.join(" AND ")}`;

      const sqlMain = `
        SELECT
          t."ງວດ",
          t."ຈຳນວນລາງວັນ Sokxay",
          t."ໂຊກຊ້ອນໂຊກ",
          t."Spin",
          t."ລາງວັນ SCN",
          t."LDB_FEE_REWARD_FTR",
          t."FTR",
          t."FTR_FEE",
          t."LDB_FEE_DEEPLINK",
          t."LDB_FEE_LOTTO_SELL",
          t."ລວມຫນີ້ທັງໝົດ",
          t."ລວມມີທັງໝົດ",
          t."ອາກອນ5%"
        FROM (
          SELECT
            CASE GROUPING(DRAWID)
              WHEN 1 THEN 'ລວມທັງໝົດ'
              ELSE DRAWID
            END AS "ງວດ",
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'SOKXAY_REWARD'
                       THEN WITHDRAW ELSE 0 END),
              'FM999,999,999,990') AS "ຈຳນວນລາງວັນ Sokxay",
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'SOKXAY_BONUS'
                       THEN WITHDRAW ELSE 0 END),
              'FM999,999,999,990') AS "ໂຊກຊ້ອນໂຊກ",
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'SOKXAY_SPIN'
                       THEN WITHDRAW ELSE 0 END),
              'FM999,999,999,990') AS "Spin",
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'SCN_REWARD'
                       THEN WITHDRAW ELSE 0 END),
              'FM999,999,999,990') AS "ລາງວັນ SCN",
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'LDB_FEE_REWARD_FTR'
                       THEN WITHDRAW ELSE 0 END),
              'FM999,999,999,990') AS "LDB_FEE_REWARD_FTR",
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'FTR'
                       THEN DEPOSIT ELSE 0 END),
              'FM999,999,999,990') AS "FTR",
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'FTR_FEE'
                       THEN WITHDRAW ELSE 0 END),
              'FM999,999,999,990') AS "FTR_FEE",
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'LDB_FEE_DEEPLINK'
                       THEN WITHDRAW ELSE 0 END),
              'FM999,999,999,990') AS "LDB_FEE_DEEPLINK",
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'LDB_FEE_LOTTO_SELL'
                       THEN (WITHDRAW + DEPOSIT) ELSE 0 END),
              'FM999,999,999,990') AS "LDB_FEE_LOTTO_SELL",
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE = 'SOKXAY_TAX_REWARD'
                       THEN DEPOSIT ELSE 0 END),
              'FM999,999,999,990') AS "ອາກອນ5%",
            -- ລວມຫນີ້ (Withdraw): ລວມທຸກ TXN ທີ່ເປັນ WITHDRAW
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE IN (
                          'SOKXAY_REWARD','SOKXAY_BONUS','SOKXAY_SPIN',
                          'LDB_FEE_REWARD_FTR','FTR_FEE','LDB_FEE_LOTTO_SELL','FTR',
                          'LDB_FEE_DEEPLINK','SCN_REWARD')
                       THEN WITHDRAW ELSE 0 END),
              'FM999,999,999,990') AS "ລວມຫນີ້ທັງໝົດ",
            -- ລວມມີ (Deposit): FTR deposit + SOKXAY_TAX_REWARD deposit
            TO_CHAR(
              SUM(CASE WHEN TXN_TYPE IN ('SOKXAY_TAX_REWARD','FTR')
                       THEN DEPOSIT ELSE 0 END),
              'FM999,999,999,990') AS "ລວມມີທັງໝົດ",
            GROUPING(DRAWID) AS GRP_FLAG
          FROM ${LDB_STMT}
          ${whereClause}
          GROUP BY ROLLUP(DRAWID)
          ORDER BY GROUPING(DRAWID), DRAWID
        ) t
      `;

      const result = await connection.execute(sqlMain, binds, OPT_OBJ);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (result.rows ?? []).map((r: any) => ({
        "ງວດ":                  r["ງວດ"]                  ?? "",
        "ຈຳນວນລາງວັນ Sokxay":   r["ຈຳນວນລາງວັນ Sokxay"]   ?? "0",
        "ໂຊກຊ້ອນໂຊກ":            r["ໂຊກຊ້ອນໂຊກ"]            ?? "0",
        "Spin":                  r["Spin"]                  ?? "0",
        "ລາງວັນ SCN":             r["ລາງວັນ SCN"]             ?? "0",
        "LDB_FEE_REWARD_FTR":    r["LDB_FEE_REWARD_FTR"]    ?? "0",
        "FTR":                   r["FTR"]                   ?? "0",
        "FTR_FEE":               r["FTR_FEE"]               ?? "0",
        "LDB_FEE_DEEPLINK":      r["LDB_FEE_DEEPLINK"]      ?? "0",
        "LDB_FEE_LOTTO_SELL":    r["LDB_FEE_LOTTO_SELL"]    ?? "0",
        "ລວມຫນີ້ທັງໝົດ":          r["ລວມຫນີ້ທັງໝົດ"]          ?? "0",
        "ລວມມີທັງໝົດ":            r["ລວມມີທັງໝົດ"]            ?? "0",
        "ອາກອນ5%":               r["ອາກອນ5%"]               ?? "0",
      }));

      return NextResponse.json({ rows });
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  ldb_tax_reward_items — ດຶງລາຍການ SOKXAY_TAX_REWARD ທຸກ transaction
    //  ໃຊ້ສຳລັບ col N (ອາກອນ5%) ໃນ Excel export (1 ລາຍການ ຕໍ່ 1 ແຖວ)
    // ══════════════════════════════════════════════════════════════════════════
    if (viewKey === "ldb_tax_reward_items") {
      const dateFrom = params.get("date_from") ?? "";
      const dateTo   = params.get("date_to")   ?? "";

      const conditions: string[] = [
        `ACCT_NO   = :ldbAcct`,
        `TXN_TYPE  = 'SOKXAY_TAX_REWARD'`,
      ];
      const binds: Record<string, string> = { ldbAcct: LDB_ACCT };

      if (dateFrom) {
        conditions.push("DATE_TIME >= TO_DATE(:dateFrom, 'YYYY-MM-DD')");
        binds.dateFrom = dateFrom;
      }
      if (dateTo) {
        const dt = new Date(dateTo);
        dt.setDate(dt.getDate() + 1);
        conditions.push("DATE_TIME < TO_DATE(:dateTo, 'YYYY-MM-DD')");
        binds.dateTo = dt.toISOString().slice(0, 10);
      }

      const sql = `
        SELECT TO_CHAR(DATE_TIME, 'YYYY-MM-DD') AS DATE_TIME,
               TO_CHAR(DRAWID)                  AS DRAWID,
               DEPOSIT
        FROM ${LDB_STMT}
        WHERE ${conditions.join(" AND ")}
        ORDER BY DATE_TIME ASC, DEPOSIT DESC
      `;

      const result = await connection.execute(sql, binds, OPT_OBJ);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (result.rows ?? []).map((r: any) => ({
        DATE_TIME: r.DATE_TIME ?? "",
        DRAWID:    r.DRAWID    ?? "",
        DEPOSIT:   Number(r.DEPOSIT ?? 0),
      }));
      return NextResponse.json({ rows });
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Oracle API]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    if (connection) await connection.close().catch(() => {});
  }
}