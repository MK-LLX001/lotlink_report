// src/app/api/oracle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Reconciliation_repo } from "@/app/api/oracle/repo/LDB_recon_repo";
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
    "bank_reconciliation","LDB_RECONCILIATION",
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
      const q        = params.get("q")   ?? "";
      const pageNum  = Math.max(1, parseInt(params.get("page")     ?? "1",    10));
      const pageSize = Math.min(9999, Math.max(10, parseInt(params.get("pageSize") ?? "100", 10)));
      const rawSort  = params.get("sortKey") ?? "TID";
      const sortKey  = BCEL_SORT_COLS.has(rawSort) ? rawSort : "TID";
      const sortDir  = params.get("sortDir") === "desc" ? "DESC" : "ASC";
      const offset   = (pageNum - 1) * pageSize;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fb: Record<string, any> = {};
      const clauses: string[] = [];

      if (tid) { clauses.push("TID = :p_tid");    fb.p_tid = tid; }
      if (q)   { clauses.push("TID LIKE :p_q");   fb.p_q   = `%${q}%`; }

      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const aggSql = `
        SELECT COUNT(*)         AS TOTAL,
               SUM(TT_TXN)     AS TT_TXN,
               SUM(REFUND_AMT) AS REFUND_AMT
        FROM ${BCEL_REFUND_VIEW} ${where}`;

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
        rows:  dataRes.rows ?? [],
        total: Number(agg.TOTAL      ?? 0),
        page:  pageNum,
        pageSize,
        totals: {
          TT_TXN:     Number(agg.TT_TXN     ?? 0),
          REFUND_AMT: Number(agg.REFUND_AMT ?? 0),
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // payout_users — distinct PAYOUT_USER list ສໍາລັບ dropdown ຍົກເວັ້ນ user
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "payout_users") {
      const result = await connection.execute(
        `SELECT DISTINCT PAYOUT_USER
         FROM ECOMMERCE2026.LOTLINK_PAYOUT
         WHERE PAYOUT_USER IS NOT NULL
         ORDER BY PAYOUT_USER`,
        {}, OPT_OBJ,
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const users: string[] = (result.rows ?? []).map((r: any) => String(r.PAYOUT_USER));
      return NextResponse.json({ users });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // payout_drawid — ສັງລວມ LOTLINK_PAYOUT ຕາມ DRAW_ID
    // ──────────────────────────────────────────────────────────────────────────
    if (viewKey === "payout_drawid") {
      const from        = params.get("from")         ?? "";
      const to          = params.get("to")           ?? "";
      const dateFrom    = params.get("date_from")    ?? "";
      const dateTo      = params.get("date_to")      ?? "";

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

    //=──────────────────────────────────────────────────────────────────────────
    // ldb_reconciliation — ການກະທົບຍອດ BCEL (ບັນຊີເງິນເຂົ້າ) ຕາມວັນທີ
    //=──────────────────────────────────────────────────────────────────────────
  
     if (viewKey === "LDB_RECONCILIATION") {
        const rows = await Reconciliation_repo(
          params.get("date_from") ?? undefined,
          params.get("date_to")   ?? undefined,
          params.get("account") ?? undefined,
        );
        return NextResponse.json({ data: rows });
      }

    

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Oracle API]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    if (connection) await connection.close().catch(() => {});
  }

}