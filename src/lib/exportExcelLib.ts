// exportExcelLib.ts
import * as XLSX from "xlsx-js-style";

export interface MonthRow {
  MONTH: string;
  TT_COUNT: number;
  BILL_AMT: number;
  PAYMENT_AMT: number;
  DIFF_PAYMENT: number;
  SCN_PRO_AMT: number;
  DISCOUNT_15_PERCENT: number;
  DIFF_PRO: number;
  SCN_COUPON_AMT: number;
  COM_5_PERCENT: number;
  FINAL_SCN_COM: number;
}

export interface DrawRow {
  DRAWID: string;
  DRAW_DATE: string;
  TT_COUNT: number;
  BILL_AMT: number;
  PAYMENT_AMT: number;
  DIFF_PAYMENT: number;
  SCN_PRO_AMT: number;
  DISCOUNT_15_PERCENT: number;
  DIFF_PRO: number;
  SCN_COUPON_AMT: number;
  COM_5_PERCENT: number;
  FINAL_SCN_COM: number;
}

export interface BcelRefundRow {
  TID: string | null;
  TT_TXN: number | null;
  REFUND_AMT: number | null;
}

// ─────────────────────────────────────────────
// Shared style helpers (sz: 7 — for Month & Draw reports)
// ─────────────────────────────────────────────
const borderThin = {
  top:    { style: "thin" },
  bottom: { style: "thin" },
  left:   { style: "thin" },
  right:  { style: "thin" },
};

const laoFont = { name: "Phetsarath OT", sz: 7 };
const numFont = { name: "Arial Narrow",  sz: 7 };

const headerStyle = {
  fill: { fgColor: { rgb: "FFFF00" } },
  font: { ...laoFont, bold: true },
  alignment: { vertical: "center", horizontal: "center", wrapText: true },
  border: borderThin,
};

const numStyle = {
  font: numFont,
  alignment: { horizontal: "right" },
  numFmt: "#,##0.00;(#,##0.00)",
  border: borderThin,
};

const centerStyle = {
  font: laoFont,
  alignment: { horizontal: "center" },
  border: borderThin,
};

const subTotalStyle = {
  ...numStyle,
  fill: { fgColor: { rgb: "FFF9C4" } },
  font: { ...numFont, bold: true },
};

const subTotalCenterStyle = {
  ...subTotalStyle,
  font: { ...laoFont, bold: true },
  alignment: { horizontal: "center" },
};

const grandTotalStyle = {
  ...numStyle,
  fill: { fgColor: { rgb: "FFFF00" } },
  font: { ...numFont, bold: true },
};

const grandTotalCenterStyle = {
  ...grandTotalStyle,
  font: { ...laoFont, bold: true },
  alignment: { horizontal: "center" },
};

// ─────────────────────────────────────────────
// BCEL-specific styles (sz: 9 base / sz: 11 heading)
// ─────────────────────────────────────────────
const BCEL_BASE_SZ    = 9;
const BCEL_HEADING_SZ = 11;

const bcelLaoFont = { name: "Phetsarath OT", sz: BCEL_BASE_SZ };
const bcelNumFont = { name: "Arial Narrow",  sz: BCEL_BASE_SZ };

const bcelHeaderStyle = {
  fill: { fgColor: { rgb: "FFFF00" } },
  font: { name: "Phetsarath OT", sz: BCEL_HEADING_SZ, bold: true },
  alignment: { vertical: "center", horizontal: "center", wrapText: true },
  border: borderThin,
};

const bcelCenterStyle = {
  font: bcelLaoFont,
  alignment: { horizontal: "center" },
  border: borderThin,
};

const bcelTidStyle = {
  font: { name: "Arial Narrow", sz: BCEL_BASE_SZ },
  alignment: { horizontal: "left" },
  border: borderThin,
};

const bcelNumStyle = {
  font: bcelNumFont,
  alignment: { horizontal: "right" },
  numFmt: "#,##0",
  border: borderThin,
};

const bcelGrandTotalCenterStyle = {
  font: { name: "Phetsarath OT", sz: BCEL_HEADING_SZ, bold: true },
  fill: { fgColor: { rgb: "FFFF00" } },
  alignment: { horizontal: "center" },
  border: borderThin,
};

const bcelGrandTotalNumStyle = {
  font: { name: "Arial Narrow", sz: BCEL_HEADING_SZ, bold: true },
  fill: { fgColor: { rgb: "FFFF00" } },
  alignment: { horizontal: "right" },
  numFmt: "#,##0",
  border: borderThin,
};

// ─────────────────────────────────────────────
// Filename helper
// ─────────────────────────────────────────────
function buildFilename(title: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const safe = title.replace(/[/\\?%*:|"<>]/g, "-").trim();
  return `${safe}_${dateStr}.xlsx`;
}

// ─────────────────────────────────────────────
// exportMonthExcel
// ─────────────────────────────────────────────
export const exportMonthExcel = (
  data: MonthRow[],
  title = "ວາຍງານຍອດຂາຍຫວຍ ຂອງ SCN - ສັງລວມເປັນເດືອນ"
) => {
  const NUM_COLS = 11;
  const ws = XLSX.utils.aoa_to_sheet([]);

  ws["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
  ];

  XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: "A1" });
  ws["A1"].s = {
    font: { name: "Phetsarath OT", sz: 16, bold: true },
    alignment: { vertical: "center", horizontal: "center", wrapText: false },
  };
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } });

  const headers = [
    "ເດືອນ", "ຈໍານວນລາຍການ", "ຍອດບິນຫວຍ", "ຍອດຊໍາລະ", "ສ່ວນຕ່າງຍອດຊໍາລະ",
    "ສ່ວນຫຼຸດ SCN", "ສ່ວນຫຼຸດ 15%", "ສ່ວນຕ່າງສ່ວນຫຼຸດ", "Coupon SCN",
    "5% ທີ່ SCN \n ຈະໄດ້ຮັບ", "ຈໍານວນເງິນທີ່ \n SCN ຈະໄດ້ຮັບ",
  ];
  const formulas = [
    "(A)", "(B)", "(C)", "(D)", "(E) = (C)-(D)", "(F)", "(G) = (C)*15%",
    "(H) = (F)-(G)", "(I) = (E)-(F)", "(J)", "(K) = (J)-(H)-(I)",
  ];

  XLSX.utils.sheet_add_aoa(ws, [headers, formulas], { origin: "A2" });
  for (let c = 0; c < NUM_COLS; c++) {
    ws[XLSX.utils.encode_cell({ r: 1, c })].s = headerStyle;
    ws[XLSX.utils.encode_cell({ r: 2, c })].s = headerStyle;
  }

  let currentRow = 3;
  data.forEach((item) => {
    const rowData = [
      item.MONTH, item.TT_COUNT, item.BILL_AMT, item.PAYMENT_AMT, item.DIFF_PAYMENT,
      item.SCN_PRO_AMT, item.DISCOUNT_15_PERCENT, item.DIFF_PRO, item.SCN_COUPON_AMT,
      item.COM_5_PERCENT, item.FINAL_SCN_COM,
    ];
    XLSX.utils.sheet_add_aoa(ws, [rowData], { origin: `A${currentRow + 1}` });
    for (let c = 0; c < rowData.length; c++) {
      ws[XLSX.utils.encode_cell({ r: currentRow, c })].s = c === 0 ? centerStyle : numStyle;
    }
    currentRow++;
  });

  const totals = data.reduce(
    (acc, curr) => ({
      TT_COUNT:            acc.TT_COUNT            + curr.TT_COUNT,
      BILL_AMT:            acc.BILL_AMT            + curr.BILL_AMT,
      PAYMENT_AMT:         acc.PAYMENT_AMT         + curr.PAYMENT_AMT,
      DIFF_PAYMENT:        acc.DIFF_PAYMENT        + curr.DIFF_PAYMENT,
      SCN_PRO_AMT:         acc.SCN_PRO_AMT         + curr.SCN_PRO_AMT,
      DISCOUNT_15_PERCENT: acc.DISCOUNT_15_PERCENT + curr.DISCOUNT_15_PERCENT,
      DIFF_PRO:            acc.DIFF_PRO            + curr.DIFF_PRO,
      SCN_COUPON_AMT:      acc.SCN_COUPON_AMT      + curr.SCN_COUPON_AMT,
      COM_5_PERCENT:       acc.COM_5_PERCENT       + curr.COM_5_PERCENT,
      FINAL_SCN_COM:       acc.FINAL_SCN_COM       + curr.FINAL_SCN_COM,
    }),
    { TT_COUNT: 0, BILL_AMT: 0, PAYMENT_AMT: 0, DIFF_PAYMENT: 0, SCN_PRO_AMT: 0,
      DISCOUNT_15_PERCENT: 0, DIFF_PRO: 0, SCN_COUPON_AMT: 0, COM_5_PERCENT: 0, FINAL_SCN_COM: 0 }
  );

  const totalRow = [
    "ລວມທັງໝົດ", totals.TT_COUNT, totals.BILL_AMT, totals.PAYMENT_AMT, totals.DIFF_PAYMENT,
    totals.SCN_PRO_AMT, totals.DISCOUNT_15_PERCENT, totals.DIFF_PRO, totals.SCN_COUPON_AMT,
    totals.COM_5_PERCENT, totals.FINAL_SCN_COM,
  ];
  XLSX.utils.sheet_add_aoa(ws, [totalRow], { origin: `A${currentRow + 1}` });
  for (let c = 0; c < totalRow.length; c++) {
    ws[XLSX.utils.encode_cell({ r: currentRow, c })].s =
      c === 0 ? grandTotalCenterStyle : grandTotalStyle;
  }

  ws["!pageSetup"] = { orientation: "landscape", paperSize: 7, scale: 100, fitToWidth: 1, fitToHeight: 0 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
  XLSX.writeFile(wb, buildFilename(title));
};

// ─────────────────────────────────────────────
// exportDrawidExcel
// ─────────────────────────────────────────────
function groupByMonth(rows: DrawRow[]): Map<string, DrawRow[]> {
  const map = new Map<string, DrawRow[]>();
  for (const r of rows) {
    const parts = r.DRAW_DATE?.split("/");
    const key =
      parts?.length === 3
        ? `${parts[2]}-${String(parts[0]).padStart(2, "0")}`
        : r.DRAW_DATE?.slice(0, 7) ?? "?";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

export const exportDrawidExcel = (
  data: DrawRow[],
  title = "ວາຍງານຍອດຂາຍຫວຍ ຂອງ SCN - ສັງລວມຕາມງວດ"
) => {
  const NUM_COLS = 12;
  const ws = XLSX.utils.aoa_to_sheet([]);

  ws["!cols"] = [
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
    { wch: 12 }, { wch: 18 },
  ];

  XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: "A1" });
  ws["A1"].s = {
    font: { name: "Phetsarath OT", sz: 16, bold: true },
    alignment: { vertical: "center", horizontal: "center", wrapText: false },
  };
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } });

  const headers = [
    "ງວດ", "ວັນທີ", "ຈໍານວນລາຍການ", "ຍອດບິນຫວຍ", "ຍອດຊໍາລະ",
    "ສ່ວນຕ່າງຍອດຊໍາລະ", "ສ່ວນຫຼຸດ SCN", "ສ່ວນຫຼຸດ 15%",
    "ສ່ວນຕ່າງສ່ວນຫຼຸດ", "Coupon SCN", "5% SCN",
    "ຈໍານວນເງິນທີ່ \n SCN ຈະໄດ້ຮັບ",
  ];
  const formulas = [
    "(A)", "(B)", "(C)", "(D)", "(E)", "(F) = (D)-(E)",
    "(G)", "(H) = (D)*15%", "(I) = (G)-(H)", "(J) = (F)-(G)",
    "(K)", "(L) = (K)-(I)-(J)",
  ];

  XLSX.utils.sheet_add_aoa(ws, [headers, formulas], { origin: "A2" });
  for (let c = 0; c < NUM_COLS; c++) {
    ws[XLSX.utils.encode_cell({ r: 1, c })].s = headerStyle;
    ws[XLSX.utils.encode_cell({ r: 2, c })].s = headerStyle;
  }

  let currentRow = 3;
  const grouped = groupByMonth(data);

  for (const [, gRows] of Array.from(grouped.entries())) {
    for (const item of gRows) {
      const rowData = [
        item.DRAWID,  item.DRAW_DATE, item.TT_COUNT,
        item.BILL_AMT, item.PAYMENT_AMT, item.DIFF_PAYMENT,
        item.SCN_PRO_AMT, item.DISCOUNT_15_PERCENT, item.DIFF_PRO,
        item.SCN_COUPON_AMT, item.COM_5_PERCENT, item.FINAL_SCN_COM,
      ];
      XLSX.utils.sheet_add_aoa(ws, [rowData], { origin: `A${currentRow + 1}` });
      for (let c = 0; c < rowData.length; c++) {
        ws[XLSX.utils.encode_cell({ r: currentRow, c })].s =
          c <= 1 ? centerStyle : numStyle;
      }
      currentRow++;
    }

    const sub = gRows.reduce(
      (acc, r) => ({
        TT_COUNT:            acc.TT_COUNT            + (r.TT_COUNT            ?? 0),
        BILL_AMT:            acc.BILL_AMT            + (r.BILL_AMT            ?? 0),
        PAYMENT_AMT:         acc.PAYMENT_AMT         + (r.PAYMENT_AMT         ?? 0),
        DIFF_PAYMENT:        acc.DIFF_PAYMENT        + (r.DIFF_PAYMENT        ?? 0),
        SCN_PRO_AMT:         acc.SCN_PRO_AMT         + (r.SCN_PRO_AMT         ?? 0),
        DISCOUNT_15_PERCENT: acc.DISCOUNT_15_PERCENT + (r.DISCOUNT_15_PERCENT ?? 0),
        DIFF_PRO:            acc.DIFF_PRO            + (r.DIFF_PRO            ?? 0),
        SCN_COUPON_AMT:      acc.SCN_COUPON_AMT      + (r.SCN_COUPON_AMT      ?? 0),
        COM_5_PERCENT:       acc.COM_5_PERCENT       + (r.COM_5_PERCENT       ?? 0),
        FINAL_SCN_COM:       acc.FINAL_SCN_COM       + (r.FINAL_SCN_COM       ?? 0),
      }),
      { TT_COUNT: 0, BILL_AMT: 0, PAYMENT_AMT: 0, DIFF_PAYMENT: 0, SCN_PRO_AMT: 0,
        DISCOUNT_15_PERCENT: 0, DIFF_PRO: 0, SCN_COUPON_AMT: 0, COM_5_PERCENT: 0, FINAL_SCN_COM: 0 }
    );

    const subRow = [
      "", "", sub.TT_COUNT, sub.BILL_AMT, sub.PAYMENT_AMT, sub.DIFF_PAYMENT,
      sub.SCN_PRO_AMT, sub.DISCOUNT_15_PERCENT, sub.DIFF_PRO,
      sub.SCN_COUPON_AMT, sub.COM_5_PERCENT, sub.FINAL_SCN_COM,
    ];
    XLSX.utils.sheet_add_aoa(ws, [subRow], { origin: `A${currentRow + 1}` });
    for (let c = 0; c < subRow.length; c++) {
      ws[XLSX.utils.encode_cell({ r: currentRow, c })].s =
        c <= 1 ? subTotalCenterStyle : subTotalStyle;
    }
    currentRow++;
  }

  const grand = data.reduce(
    (acc, r) => ({
      TT_COUNT:            acc.TT_COUNT            + (r.TT_COUNT            ?? 0),
      BILL_AMT:            acc.BILL_AMT            + (r.BILL_AMT            ?? 0),
      PAYMENT_AMT:         acc.PAYMENT_AMT         + (r.PAYMENT_AMT         ?? 0),
      DIFF_PAYMENT:        acc.DIFF_PAYMENT        + (r.DIFF_PAYMENT        ?? 0),
      SCN_PRO_AMT:         acc.SCN_PRO_AMT         + (r.SCN_PRO_AMT         ?? 0),
      DISCOUNT_15_PERCENT: acc.DISCOUNT_15_PERCENT + (r.DISCOUNT_15_PERCENT ?? 0),
      DIFF_PRO:            acc.DIFF_PRO            + (r.DIFF_PRO            ?? 0),
      SCN_COUPON_AMT:      acc.SCN_COUPON_AMT      + (r.SCN_COUPON_AMT      ?? 0),
      COM_5_PERCENT:       acc.COM_5_PERCENT       + (r.COM_5_PERCENT       ?? 0),
      FINAL_SCN_COM:       acc.FINAL_SCN_COM       + (r.FINAL_SCN_COM       ?? 0),
    }),
    { TT_COUNT: 0, BILL_AMT: 0, PAYMENT_AMT: 0, DIFF_PAYMENT: 0, SCN_PRO_AMT: 0,
      DISCOUNT_15_PERCENT: 0, DIFF_PRO: 0, SCN_COUPON_AMT: 0, COM_5_PERCENT: 0, FINAL_SCN_COM: 0 }
  );

  const grandRow = [
    "ລວມທັງໝົດ", "", grand.TT_COUNT, grand.BILL_AMT, grand.PAYMENT_AMT, grand.DIFF_PAYMENT,
    grand.SCN_PRO_AMT, grand.DISCOUNT_15_PERCENT, grand.DIFF_PRO,
    grand.SCN_COUPON_AMT, grand.COM_5_PERCENT, grand.FINAL_SCN_COM,
  ];
  XLSX.utils.sheet_add_aoa(ws, [grandRow], { origin: `A${currentRow + 1}` });
  for (let c = 0; c < grandRow.length; c++) {
    ws[XLSX.utils.encode_cell({ r: currentRow, c })].s =
      c <= 1 ? grandTotalCenterStyle : grandTotalStyle;
  }

  ws["!pageSetup"] = { orientation: "landscape", paperSize: 7, scale: 100, fitToWidth: 1, fitToHeight: 0 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DrawID Report");
  XLSX.writeFile(wb, buildFilename(title));
};

// ─────────────────────────────────────────────
// exportBcelRefundExcel
// ─────────────────────────────────────────────
export const exportBcelRefundExcel = (
  data: BcelRefundRow[],
  filterSummary?: string,
  title = "ລາຍງານ BCEL Refund ຫວຍ SCN"
) => {
  const NUM_COLS = 4;
  const ws = XLSX.utils.aoa_to_sheet([]);

  ws["!cols"] = [
    { wch: 6 },   // ລ/ດ
    { wch: 28 },  // TID
    { wch: 18 },  // TT_TXN
    { wch: 22 },  // REFUND_AMT
  ];

  // ── Row 0: Title ──
  XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: "A1" });
  ws["A1"].s = {
    font: { name: "Phetsarath OT", sz: 16, bold: true },
    alignment: { vertical: "center", horizontal: "center", wrapText: false },
  };
  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } });

  // ── Row 1: Filter summary (optional) ──
  let headerRow = 1;
  if (filterSummary) {
    XLSX.utils.sheet_add_aoa(ws, [[`ຕົວກອງ: ${filterSummary}`]], { origin: "A2" });
    ws["A2"].s = {
      font: { name: "Phetsarath OT", sz: BCEL_BASE_SZ, italic: true, color: { rgb: "555555" } },
      alignment: { horizontal: "left" },
    };
    ws["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: NUM_COLS - 1 } });
    headerRow = 2;
  }

  // ── Header row — sz 11, bold ──
  const headers = ["ລ/ດ", "ງວດ", "ຈຳນວນ Transaction", "ຈຳນວນເງິນ Refund (ກີບ)"];
  XLSX.utils.sheet_add_aoa(ws, [headers], { origin: `A${headerRow + 1}` });
  for (let c = 0; c < NUM_COLS; c++) {
    ws[XLSX.utils.encode_cell({ r: headerRow, c })].s = bcelHeaderStyle;
  }

  // ── Data rows — sz 9 ──
  let currentRow = headerRow + 1;
  data.forEach((item, idx) => {
    const rowData = [
      idx + 1,
      item.TID ?? "",
      item.TT_TXN ?? 0,
      item.REFUND_AMT ?? 0,
    ];
    XLSX.utils.sheet_add_aoa(ws, [rowData], { origin: `A${currentRow + 1}` });
    // ລ/ດ — Phetsarath OT 9, center
    ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })].s = bcelCenterStyle;
    // TID — Arial Narrow 9, left
    ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })].s = bcelTidStyle;
    // TT_TXN — Arial Narrow 9, right
    ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })].s = bcelNumStyle;
    // REFUND_AMT — Arial Narrow 9, right
    ws[XLSX.utils.encode_cell({ r: currentRow, c: 3 })].s = bcelNumStyle;
    currentRow++;
  });

  // ── Grand Total row — sz 11, bold ──
  const grandTtTxn     = data.reduce((s, r) => s + (r.TT_TXN    ?? 0), 0);
  const grandRefundAmt = data.reduce((s, r) => s + (r.REFUND_AMT ?? 0), 0);

  const totalRow = ["", "ລວມທັງໝົດ", grandTtTxn, grandRefundAmt];
  XLSX.utils.sheet_add_aoa(ws, [totalRow], { origin: `A${currentRow + 1}` });
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 0 })].s = bcelGrandTotalCenterStyle;
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 1 })].s = bcelGrandTotalCenterStyle;
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 2 })].s = bcelGrandTotalNumStyle;
  ws[XLSX.utils.encode_cell({ r: currentRow, c: 3 })].s = bcelGrandTotalNumStyle;

  ws["!pageSetup"] = {
    orientation: "portrait",
    paperSize: 9,
    scale: 100,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BCEL Refund");
  XLSX.writeFile(wb, buildFilename(title));
};