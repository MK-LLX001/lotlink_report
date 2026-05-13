// lib/exportBcelReconciliation.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ການທຽບຍອດ BCEL — xlsx-js-style@1.2.0
//
//  Columns (ຕາມ SQL view):
//  A  = ວັນທີ (BANK_DATE)
//  B  = ລວມໜີ້
//  C  = ລວມມີ
//  D  = ລາງວັນ Sokxay
//  E  = ໂຊກຊ້ອນໂຊກ
//  F  = ຄ່າທໍານຽມໂອນລາງວັນຫວຍ ໂຊກໄຊ
//  G  = ວົງລໍ້ໂຊກໄຊ
//  H  = ຄ່າທໍານຽມໂອນລາງວັນ ວົງລໍ້ໂຊກໄຊ
//  I  = ອາກອນລາງວັນ ໂຊກໄຊ
//  J  = ລາງວັນ SCN
//  K  = ຄ່າທໍານຽມໂອນລາງວັນຫວຍ SCN
//  L  = ການໂອນເງິນ - ໜີ້
//  M  = ການໂອນເງິນ - ມີ
//  N  = Bank Fee
//  O  = ອື່ນໆ
//  P  = ສ່ວນຕ່າງ
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
    type CellObject,
    type CellStyle,
    type CellStyleColor,
    type BorderType,
    type WorkSheet,
  } from "xlsx-js-style";
  
  // ── Types ──────────────────────────────────────────────────────────────────
  
  export interface ReconciliationRow {
    "ວັນທີ":                              string | null;
    "ລວມໜີ້":                             string;
    "ລວມມີ":                              string;
    "ລາງວັນ Sokxay":                      string;
    "ໂຊກຊ້ອນໂຊກ":                         string;
    "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ ໂຊກໄຊ":       string;
    "ວົງລໍ້ໂຊກໄຊ":                         string;
    "ຄ່າທໍານຽມໂອນລາງວັນ ວົງລໍ້ໂຊກໄຊ":    string;
    "ອາກອນລາງວັນ ໂຊກໄຊ":                  string;
    "ລາງວັນ SCN":                          string;
    "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ SCN":          string;
    "ການໂອນເງິນ - ໜີ້":                    string;
    "ການໂອນເງິນ - ມີ":                     string;
    "Bank Fee":                            string;
    "ອື່ນໆ":                               string | null;
    "ສ່ວນຕ່າງ":                            string;
  }
  
  // ── Constants ──────────────────────────────────────────────────────────────
  
  const FONT      = "Phetsarath OT";
  const BG_HEADER = "9DC3E6";   // blue header
  const BG_TOTAL  = "D0D0D0";   // grey total
  const BG_GRAND  = "BDD7EE";   // light-blue grand total
  
  // ── Border helpers ─────────────────────────────────────────────────────────
  
  type BSide = { color: CellStyleColor; style?: BorderType };
  const thin   = (): BSide => ({ style: "thin",   color: { rgb: "000000" } });
  const medium = (): BSide => ({ style: "medium", color: { rgb: "000000" } });
  const thick  = (): BSide => ({ style: "thick",  color: { rgb: "000000" } });
  
  const allThin  = (): CellStyle["border"] => ({ left:thin(), right:thin(), top:thin(), bottom:thin() });
  const medLeft  = (): CellStyle["border"] => ({ left:medium(), right:thin(), top:thin(), bottom:thin() });
  
  // ── Style builders ─────────────────────────────────────────────────────────
  
  function sHeader(sz = 10): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz },
      fill:      { patternType: "solid", fgColor: { rgb: BG_HEADER } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border:    allThin(),
    };
  }
  
  function sTitle(sz = 12, bold = false): CellStyle {
    return {
      font:      { name: FONT, sz, bold },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }
  
  function sDate(): CellStyle {
    return {
      font:      { name: FONT, sz: 9 },
      alignment: { horizontal: "center", vertical: "center" },
      border:    allThin(),
    };
  }
  
  function sNum(leftMed = false): CellStyle {
    return {
      font:      { name: "Arial Narrow", sz: 9 },
      alignment: { horizontal: "right", vertical: "center" },
      numFmt:    '#,##0.00;\\-#,##0.00;"-"',
      border:    leftMed ? medLeft() : allThin(),
    };
  }
  
  function sTxt(): CellStyle {
    return {
      font:      { name: FONT, sz: 8 },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      border:    allThin(),
    };
  }
  
  function sTotalLabel(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 10 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
      alignment: { horizontal: "center", vertical: "center" },
      border:    allThin(),
    };
  }
  
  function sTotalNum(): CellStyle {
    return {
      font:      { name: "Arial Narrow", bold: true, sz: 9 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
      alignment: { horizontal: "right", vertical: "center" },
      numFmt:    '#,##0.00;\\-#,##0.00;"-"',
      border:    allThin(),
    };
  }
  
  function sGrandLabel(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 11 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_GRAND } },
      alignment: { horizontal: "center", vertical: "center" },
      border:    { left:medium(), right:medium(), top:medium(), bottom:thick() },
    };
  }
  
  function sGrandNum(): CellStyle {
    return {
      font:      { name: "Arial Narrow", bold: true, sz: 10 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_GRAND } },
      alignment: { horizontal: "right", vertical: "center" },
      numFmt:    '#,##0.00;\\-#,##0.00;"-"',
      border:    { left:medium(), right:medium(), top:medium(), bottom:thick() },
    };
  }
  
  // ── Cell factories ─────────────────────────────────────────────────────────
  
  function C(v: string | number, s: CellStyle): CellObject {
    return { v, t: typeof v === "number" ? "n" : "s", s } as CellObject;
  }
  function CE(s: CellStyle): CellObject {
    return { v: "", t: "s", s } as CellObject;
  }
  
  // ── Helpers ────────────────────────────────────────────────────────────────
  
  function parseNum(v: string | number | null | undefined): number {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return v;
    // Strip leading '-' for display (values stored with '-' prefix)
    return parseFloat(String(v).replace(/,/g, "").replace(/^-/, "")) || 0;
  }
  
  function parseSign(v: string | number | null | undefined): number {
    if (v == null || v === "") return 0;
    const s = String(v).trim();
    const neg = s.startsWith("-");
    const n = parseFloat(s.replace(/,/g, "").replace(/^-/, "")) || 0;
    return neg ? -n : n;
  }
  
  function fmtDate(s: string): string {
    if (!s) return "";
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }
  
  const HEADERS = [
    "ວັນທີ",
    "ລວມໜີ້",
    "ລວມມີ",
    "ລາງວັນ Sokxay",
    "ໂຊກຊ້ອນໂຊກ",
    "ຄ່າທໍານຽມ ໂຊກໄຊ",
    "ວົງລໍ້ໂຊກໄຊ",
    "ຄ່າທໍານຽມ ວົງລໍ້",
    "ອາກອນ ໂຊກໄຊ",
    "ລາງວັນ SCN",
    "ຄ່າທໍານຽມ SCN",
    "ໂອນເງິນ-ໜີ້",
    "ໂອນເງິນ-ມີ",
    "Bank Fee",
    "ອື່ນໆ",
    "ສ່ວນຕ່າງ",
  ];
  
  const NCOLS = HEADERS.length; // 16
  
  // ── Sheet builder ──────────────────────────────────────────────────────────
  
  function buildSheet(
    dateDisplay: string,
    dataRows: ReconciliationRow[],
    totalRow: ReconciliationRow | null,
  ): WorkSheet {
    const ws: WorkSheet = {};
    const merges: XLSXStyle.Range[] = [];
  
    const S = (r: number, c: number, cl: CellObject) => {
      ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
    };
    const M = (r1: number, c1: number, r2: number, c2: number) => {
      merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
    };
  
    // ── R0-R2: Title ───────────────────────────────────────────────────────
    S(0, 0, C("   ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ", sTitle(12)));
    S(1, 0, C("    ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ", sTitle(12)));
    S(2, 0, C(`ການທຽບຍອດ BCEL (ບັນຊີຈ່າຍ-2201300002167) ວັນທີ ${dateDisplay}`, sTitle(13, true)));
    M(0, 0, 0, NCOLS - 1);
    M(1, 0, 1, NCOLS - 1);
    M(2, 0, 2, NCOLS - 1);
  
    // ── R3: blank ──────────────────────────────────────────────────────────
    for (let c = 0; c < NCOLS; c++) S(3, c, CE(sTitle()));
    M(3, 0, 3, NCOLS - 1);
  
    // ── R4: Column headers ─────────────────────────────────────────────────
    HEADERS.forEach((h, c) => S(4, c, C(h, sHeader(9))));
  
    // ── R5+: Data rows ─────────────────────────────────────────────────────
    const numKeys: (keyof ReconciliationRow)[] = [
      "ລວມໜີ້", "ລວມມີ",
      "ລາງວັນ Sokxay", "ໂຊກຊ້ອນໂຊກ",
      "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ ໂຊກໄຊ",
      "ວົງລໍ້ໂຊກໄຊ",
      "ຄ່າທໍານຽມໂອນລາງວັນ ວົງລໍ້ໂຊກໄຊ",
      "ອາກອນລາງວັນ ໂຊກໄຊ",
      "ລາງວັນ SCN",
      "ຄ່າທໍານຽມໂອນລາງວັນຫວຍ SCN",
      "ການໂອນເງິນ - ໜີ້", "ການໂອນເງິນ - ມີ",
      "Bank Fee",
      "ສ່ວນຕ່າງ",
    ];
  
    let grandDebit = 0, grandCredit = 0;
  
    dataRows.forEach((row, i) => {
      const r = 5 + i;
      // A: date
      const dateVal = row["ວັນທີ"] ?? "";
      S(r, 0, C(dateVal, sDate()));
  
      // B-N, P = numeric cols (in order)
      const vals = [
        parseSign(row["ລວມໜີ້"]),
        parseSign(row["ລວມມີ"]),
        parseSign(row["ລາງວັນ Sokxay"]),
        parseSign(row["ໂຊກຊ້ອນໂຊກ"]),
        parseSign(row["ຄ່າທໍານຽມໂອນລາງວັນຫວຍ ໂຊກໄຊ"]),
        parseSign(row["ວົງລໍ້ໂຊກໄຊ"]),
        parseSign(row["ຄ່າທໍານຽມໂອນລາງວັນ ວົງລໍ້ໂຊກໄຊ"]),
        parseSign(row["ອາກອນລາງວັນ ໂຊກໄຊ"]),
        parseSign(row["ລາງວັນ SCN"]),
        parseSign(row["ຄ່າທໍານຽມໂອນລາງວັນຫວຍ SCN"]),
        parseSign(row["ການໂອນເງິນ - ໜີ້"]),
        parseSign(row["ການໂອນເງິນ - ມີ"]),
        parseSign(row["Bank Fee"]),
      ];
  
      vals.forEach((v, ci) => S(r, 1 + ci, C(v === 0 ? "" : v, sNum())));
  
      // O: ອື່ນໆ (text)
      S(r, 14, C(row["ອື່ນໆ"] ?? "", sTxt()));
  
      // P: ສ່ວນຕ່າງ
      const diff = parseSign(row["ສ່ວນຕ່າງ"]);
      S(r, 15, C(diff === 0 ? "" : diff, sNum()));
  
      grandDebit  += parseNum(row["ລວມໜີ້"]);
      grandCredit += parseNum(row["ລວມມີ"]);
    });
  
    // ── Total row (ROLLUP grand total from Oracle) ─────────────────────────
    if (totalRow) {
      const rT = 5 + dataRows.length;
      S(rT, 0, C("ລວມທັງໝົດ", sTotalLabel()));
      const tVals = [
        parseSign(totalRow["ລວມໜີ້"]),
        parseSign(totalRow["ລວມມີ"]),
        parseSign(totalRow["ລາງວັນ Sokxay"]),
        parseSign(totalRow["ໂຊກຊ້ອນໂຊກ"]),
        parseSign(totalRow["ຄ່າທໍານຽມໂອນລາງວັນຫວຍ ໂຊກໄຊ"]),
        parseSign(totalRow["ວົງລໍ້ໂຊກໄຊ"]),
        parseSign(totalRow["ຄ່າທໍານຽມໂອນລາງວັນ ວົງລໍ້ໂຊກໄຊ"]),
        parseSign(totalRow["ອາກອນລາງວັນ ໂຊກໄຊ"]),
        parseSign(totalRow["ລາງວັນ SCN"]),
        parseSign(totalRow["ຄ່າທໍານຽມໂອນລາງວັນຫວຍ SCN"]),
        parseSign(totalRow["ການໂອນເງິນ - ໜີ້"]),
        parseSign(totalRow["ການໂອນເງິນ - ມີ"]),
        parseSign(totalRow["Bank Fee"]),
      ];
      tVals.forEach((v, ci) => S(rT, 1 + ci, C(v === 0 ? "" : v, sTotalNum())));
      S(rT, 14, CE(sTotalLabel()));
      const tDiff = parseSign(totalRow["ສ່ວນຕ່າງ"]);
      S(rT, 15, C(tDiff === 0 ? "" : tDiff, sTotalNum()));
  
      // ── Grand summary row ────────────────────────────────────────────────
      
    }
  
    // ── Signature ────────────────────────────────────────────────────────
    const rSig = 5 + dataRows.length + (totalRow ? 4 : 3);
    const sSig: CellStyle = { font: { name: FONT, sz: 11 }, alignment: { horizontal: "center" } };
    S(rSig, 3,  C("ຜູ້ສ້າງ",   sSig));
    S(rSig, 8,  C("ຜູ້ກວດສອບ", sSig));
    S(rSig, 13, C("ຜູ້ອະນຸມັດ", sSig));
  
    // ── Column widths ─────────────────────────────────────────────────────
    ws["!cols"] = [
      { wch: 12 },  // A date
      { wch: 16 },  // B ລວມໜີ້
      { wch: 14 },  // C ລວມມີ
      { wch: 16 },  // D ລາງວັນ Sokxay
      { wch: 16 },  // E ໂຊກຊ້ອນໂຊກ
      { wch: 16 },  // F ຄ່າທໍານຽມ ໂຊກໄຊ
      { wch: 14 },  // G ວົງລໍ້
      { wch: 16 },  // H ຄ່າທໍານຽມ ວົງລໍ້
      { wch: 14 },  // I ອາກອນ
      { wch: 14 },  // J ລາງວັນ SCN
      { wch: 16 },  // K ຄ່າທໍານຽມ SCN
      { wch: 14 },  // L ໂອນ-ໜີ້
      { wch: 14 },  // M ໂອນ-ມີ
      { wch: 14 },  // N Bank Fee
      { wch: 28 },  // O ອື່ນໆ
      { wch: 14 },  // P ສ່ວນຕ່າງ
    ];
  
    const lastDataRow = 5 + dataRows.length + (totalRow ? 2 : 1) + 4;
    ws["!rows"] = [
      { hpt: 20 }, { hpt: 20 }, { hpt: 22 }, { hpt: 10 }, { hpt: 36 },
      ...Array.from({ length: dataRows.length }, () => ({ hpt: 22 })),
      { hpt: 26 }, { hpt: 28 },
    ];
  
    ws["!merges"] = merges;
    ws["!ref"] = XLSXStyle.utils.encode_range({ r: 0, c: 0 }, { r: lastDataRow, c: NCOLS - 1 });

    // ── Print setup: A4 landscape, fit all 16 columns on 1 page wide ───────
    // xlsx-js-style uses the same OOXML keys as SheetJS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ws as any)["!pageSetup"] = {
      paperSize:   9,            // 9 = A4
      orientation: "landscape",
      fitToPage:   1,            // 1 = true (enable fit-to-page mode)
      fitToWidth:  1,            // shrink to fit 1 page wide
      fitToHeight: 0,            // unlimited pages tall
      scale:       100,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ws as any)["!margins"] = {
      left:   0.31, right:  0.31,
      top:    0.39, bottom: 0.79,
      header: 0.20, footer: 0.20,
    };

    return ws;
  }
  
  // ── Public API ─────────────────────────────────────────────────────────────
  
  export async function exportBcelReconciliation(
    rows: ReconciliationRow[],
    dateFrom: string,
    dateTo: string,
  ): Promise<void> {
    const dataRows = rows.filter((r) => r["ວັນທີ"] !== null && r["ວັນທີ"] !== "");
    const totalRow = rows.find((r) => r["ວັນທີ"] === null || r["ວັນທີ"] === "") ?? null;
  
    const dateDisplay =
      dateFrom === dateTo
        ? fmtDate(dateFrom)
        : `${fmtDate(dateFrom)} ຫາ ${fmtDate(dateTo)}`;
  
    const ws = buildSheet(dateDisplay, dataRows, totalRow);
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, "Bank Reconciliation");

    // Enable fitToPage at the sheet-properties level (required by OOXML)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wsAny = wb.Sheets["Bank Reconciliation"] as any;
    if (!wsAny["!sheetPr"]) wsAny["!sheetPr"] = {};
    wsAny["!sheetPr"].pageSetUpPr = { fitToPage: true };

    XLSXStyle.writeFile(
      wb,
      `BCEL_Reconciliation_${dateFrom || "all"}_to_${dateTo || "all"}.xlsx`,
    );
  }