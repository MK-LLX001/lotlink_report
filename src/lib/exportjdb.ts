// lib/ExportJdb.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ສະຫຼຸບລາງວັນ JDB — xlsx-js-style@1.2.0
//
//  Columns:
//  A = ລຳດັບ  B = ງວດທີ  C = ຈຳນວນລາງວັນ Sokxay  D = ໂຊກຊ້ອນໂຊກ
//  E = ຄ່າທຳນຽມ  F = ອາກອນ 5% (SPLUS_PRICE_TAX BANK_CR)  G = ລວມທັງໝົດ
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
    type CellObject,
    type CellStyle,
    type CellStyleColor,
    type BorderType,
    type WorkSheet,
  } from "xlsx-js-style";
  
  // ── Types ──────────────────────────────────────────────────────────────────────
  
  export interface JdbRow {
    ງວດ:                   string;
    "ຈຳນວນລາງວັນ Sokxay":  string;
    ໂຊກຊ້ອນໂຊກ:            string;
    ຄ່າທຳນຽມ:              string;
    ລວມທັງໝົດ:              string;
  }
  
  export interface JdbTaxRow {
    BANK_DATE: string;
    DRAWID:    string | number;
    BANK_CR:   number;
  }
  
  // ── Constants ──────────────────────────────────────────────────────────────────
  
  const FONT      = "Phetsarath OT";
  const BG_HEADER = "9DC3E6";
  const BG_TOTAL  = "DAEEF3";
  
  // ── Border helpers ─────────────────────────────────────────────────────────────
  
  type BSide = { color: CellStyleColor; style?: BorderType };
  
  const thin   = (): BSide => ({ style: "thin",   color: { rgb: "000000" } });
  const medium = (): BSide => ({ style: "medium", color: { rgb: "000000" } });
  const thickB = (): BSide => ({ style: "thick",  color: { rgb: "000000" } });
  
  const allThin  = (): CellStyle["border"] => ({ left: thin(), right: thin(), top: thin(), bottom: thin() });
  const kBorder  = (): CellStyle["border"] => ({ left: medium(), right: medium(), top: thin(), bottom: thin() });
  
  // ── Style builders ─────────────────────────────────────────────────────────────
  
  function sHeader(sz = 12): CellStyle {
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
  
  function sData(align: "center" | "right" = "right"): CellStyle {
    return {
      font:      { name: FONT, sz: 11 },
      alignment: { horizontal: align, vertical: "center" },
      numFmt:    "_(* #,##0.00_);_(* \\(#,##0.00\\);_(* \"-\"??_);_(@_)",
      border:    allThin(),
    };
  }
  
  function sKData(): CellStyle {
    return {
      font:      { name: FONT, sz: 11 },
      alignment: { horizontal: "center", vertical: "center" },
      numFmt:    "_-* #,##0_-;\\-* #,##0_-;_-* \"-\"??_-;_-@_-",
      border:    kBorder(),
    };
  }
  
  function sTotalData(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 11 },
      alignment: { horizontal: "right", vertical: "center" },
      numFmt:    "_(* #,##0.00_);_(* \\(#,##0.00\\);_(* \"-\"??_);_(@_)",
      border:    allThin(),
      fill:      { patternType: "solid", fgColor: { rgb: "D9D9D9" } },
    };
  }
  
  function sSum(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 11 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_HEADER } },
      alignment: { horizontal: "center", vertical: "center" },
      numFmt:    "_(* #,##0.00_);_(* \\(#,##0.00\\);_(* \"-\"??_);_(@_)",
      border:    allThin(),
    };
  }
  
  function sTotalLabel(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 12 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
      alignment: { horizontal: "center", vertical: "center" },
      border:    { bottom: thickB() },
    };
  }
  
  function sTotalValue(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 12 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
      alignment: { horizontal: "center", vertical: "center" },
      numFmt:    "_(* #,##0.00_);_(* \\(#,##0.00\\);_(* \"-\"??_);_(@_)",
      border:    { bottom: thickB() },
    };
  }
  
  // ── Cell factories ─────────────────────────────────────────────────────────────
  
  function C(v: string | number, s: CellStyle): CellObject {
    return { v, t: typeof v === "number" ? "n" : "s", s } as CellObject;
  }
  
  function CE(s: CellStyle): CellObject {
    return { v: "", t: "s", s } as CellObject;
  }
  
  // ── Helpers ────────────────────────────────────────────────────────────────────
  
  function parseNum(v: string | number | null | undefined): number {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return v;
    return parseFloat(String(v).replace(/,/g, "")) || 0;
  }
  
  const MONTH_LAO: Record<number, string> = {
    1:"ມັງກອນ", 2:"ກຸມພາ",   3:"ມີນາ",      4:"ເມສາ",
    5:"ພຶດສະພາ", 6:"ມິຖຸນາ",  7:"ກໍລະກົດ",   8:"ສິງຫາ",
    9:"ກັນຍາ",  10:"ຕຸລາ",    11:"ພະຈິກ",    12:"ທັນວາ",
  };
  
  function fmtDate(s: string): string {
    if (!s) return "";
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  
  function monthLabel(s: string): string {
    if (!s) return "";
    const d = new Date(s);
    return `ເດືອນ ${MONTH_LAO[d.getMonth() + 1] ?? ""} ${d.getFullYear()}`;
  }
  
  // ── Sheet builder ──────────────────────────────────────────────────────────────
  
  function buildSheet(dateDisplay: string, dataRows: JdbRow[], taxItems: JdbTaxRow[]): WorkSheet {
    const ws: WorkSheet = {};
    const merges: XLSXStyle.Range[] = [];
  
    const S = (r: number, c: number, cl: CellObject) => {
      ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
    };
    const M = (r1: number, c1: number, r2: number, c2: number) => {
      merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
    };
  
    // ── R1-R3: Title (merged A:G) ───────────────────────────────────────────────
    S(0, 0, C("   ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",                     sTitle(12)));
    S(1, 0, C("    ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ",     sTitle(12)));
    S(2, 0, C(`ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນຫວຍຂອງ (JDB) ວັນທີ ${dateDisplay}`, sTitle(12, true)));
    M(0, 0, 0, 6); M(1, 0, 1, 6); M(2, 0, 2, 6);
  
    // ── R4: blank ───────────────────────────────────────────────────────────────
    S(3, 0, CE(sTitle())); M(3, 0, 3, 6);
  
    // ── R5: Table header ────────────────────────────────────────────────────────
    S(4, 0, C("ລຳດັບ",                  sHeader(11)));
    S(4, 1, C("ງວດທີ",                   sHeader(12)));
    S(4, 2, C("ຈຳນວນລາງວັນ Sokxay",     sHeader(12)));
    S(4, 3, C("ໂຊກຊ້ອນໂຊກ",             sHeader(11)));
    S(4, 4, C("ຄ່າທຳນຽມ",               sHeader(11)));
    S(4, 5, C("ອາກອນ 5%",               sHeader(11)));  // SPLUS_PRICE_TAX BANK_CR
    S(4, 6, C("ລວມທັງໝົດ",              sHeader(12)));
  
    // ── Calculate sums ──────────────────────────────────────────────────────────
    const totalRows = Math.max(dataRows.length, taxItems.length);
    let sumC = 0, sumD = 0, sumE = 0;
    for (const dr of dataRows) {
      sumC += parseNum(dr["ຈຳນວນລາງວັນ Sokxay"]);
      sumD += parseNum(dr["ໂຊກຊ້ອນໂຊກ"]);
      sumE += parseNum(dr["ຄ່າທຳນຽມ"]);
    }
    const sumF     = taxItems.reduce((s, t) => s + t.BANK_CR, 0);  // ອາກອນ5%
    const sumTotal = sumC + sumD + sumE;                             // ລວມທັງໝົດ (ບໍ່ລວມ ອາກອນ)
  
    // ── R6+: Data rows ──────────────────────────────────────────────────────────
    for (let i = 0; i < totalRows; i++) {
      const r  = 5 + i;
      const dr = dataRows[i]  ?? null;
      const tx = taxItems[i]  ?? null;
  
      if (dr) {
        const rowTotal = parseNum(dr["ລວມທັງໝົດ"]) ||
          (parseNum(dr["ຈຳນວນລາງວັນ Sokxay"]) + parseNum(dr["ໂຊກຊ້ອນໂຊກ"]) + parseNum(dr["ຄ່າທຳນຽມ"]));
  
        S(r, 0, C(i + 1,
          { font: { name: FONT, sz: 11 }, alignment: { horizontal: "center", vertical: "center" }, border: allThin() }));
        S(r, 1, C(dr["ງວດ"],
          { font: { name: FONT, sz: 11 }, alignment: { horizontal: "center", vertical: "center" }, border: allThin() }));
        S(r, 2, C(parseNum(dr["ຈຳນວນລາງວັນ Sokxay"]), sData("right")));
        S(r, 3, C(parseNum(dr["ໂຊກຊ້ອນໂຊກ"]),          sData("right")));
        S(r, 4, C(parseNum(dr["ຄ່າທຳນຽມ"]),             sData("right")));
        S(r, 6, C(rowTotal,
          { ...sData("right"), font: { name: FONT, sz: 11, bold: true } }));
      } else {
        for (let c = 0; c <= 4; c++) S(r, c, CE(sData("right")));
        S(r, 6, CE(sData("right")));
      }
  
      // Col F: ອາກອນ 5% — independent ຈາກ A-E (ຄືກັນກັບ BCEL pattern)
      S(r, 5, tx ? C(tx.BANK_CR, sKData()) : CE(sKData()));
    }
  
    // ── SUM row ──────────────────────────────────────────────────────────────────
    const rSum = 5 + totalRows;
    S(rSum, 0, CE(sSum()));
    S(rSum, 1, CE(sSum()));
    S(rSum, 2, C(sumC,     sSum()));
    S(rSum, 3, C(sumD,     sSum()));
    S(rSum, 4, C(sumE,     sSum()));
    S(rSum, 5, C(sumF,     sSum()));
    S(rSum, 6, C(sumTotal, sSum()));
  
    // ── TOTAL row ─────────────────────────────────────────────────────────────────
    const rTot = rSum + 1;
    S(rTot, 0, C("ລວມຈ່າຍທັງໝົດ", sTotalLabel()));
    S(rTot, 1, CE(sTotalLabel()));
    S(rTot, 2, C(sumTotal, sTotalValue()));
    S(rTot, 3, CE(sTotalValue()));
    S(rTot, 4, CE(sTotalValue()));
    S(rTot, 5, CE(sTotalLabel()));
    S(rTot, 6, CE(sTotalLabel()));
    M(rTot, 0, rTot, 1);
    M(rTot, 2, rTot, 4);
  
    // ── Signature row (+3 from TOTAL) ─────────────────────────────────────────────
    const rSig = rTot + 3;
    const sSig: CellStyle = { font: { name: FONT, sz: 11 }, alignment: { horizontal: "center" } };
    S(rSig, 3, C("ຜູ້ກວດກາ",  sSig));
    S(rSig, 6, C("ຜູ້ສະຫຼຸບ", sSig));
  
    // ── Metadata ──────────────────────────────────────────────────────────────────
    ws["!cols"] = [
      { wch: 7 },    // A: ລຳດັບ
      { wch: 13 },   // B: ງວດທີ
      { wch: 26 },   // C: ຈຳນວນລາງວັນ Sokxay
      { wch: 22 },   // D: ໂຊກຊ້ອນໂຊກ
      { wch: 18 },   // E: ຄ່າທຳນຽມ
      { wch: 19 },   // F: ອາກອນ 5%
      { wch: 24 },   // G: ລວມທັງໝົດ
    ];
    ws["!rows"] = [
      { hpt: 20.5 }, { hpt: 20.5 }, { hpt: 20.5 }, { hpt: 21.0 }, { hpt: 32.25 },
      ...Array.from({ length: totalRows }, () => ({ hpt: 25 })),
      { hpt: 34.5 }, { hpt: 39.75 }, { hpt: 20.5 }, { hpt: 20.5 }, { hpt: 20.5 },
    ];
    ws["!merges"] = merges;
    ws["!ref"]    = XLSXStyle.utils.encode_range({ r: 0, c: 0 }, { r: rSig, c: 6 });
  
    return ws;
  }
  
  // ── Public API ─────────────────────────────────────────────────────────────────
  
  /**
   * exportJdbReward
   * - jdbRows  : rows ຈາກ view=jdb_reward_summary (ລວມ total row — filter internally)
   * - taxItems : rows ຈາກ view=jdb_tax5_items (SPLUS_PRICE_TAX BANK_CR, 1 item/ແຖວ)
   */
  export async function exportJdbReward(
    jdbRows:  JdbRow[],
    taxItems: JdbTaxRow[],
    dateFrom: string,
    dateTo:   string,
  ): Promise<void> {
    const dataRows    = jdbRows.filter(r => r["ງວດ"] !== "ລວມທັງໝົດ");
    const dateDisplay = dateFrom === dateTo
      ? fmtDate(dateFrom)
      : `${fmtDate(dateFrom)} ຫາ ${fmtDate(dateTo)}`;
  
    const ws = buildSheet(dateDisplay, dataRows, taxItems);
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, (monthLabel(dateFrom) || "JDB Report").slice(0, 31));
    XLSXStyle.writeFile(wb, `JDB_Reward_${dateFrom || "all"}_to_${dateTo || "all"}.xlsx`);
  }
  
  /**
   * fetchJdbTax5Rows — ດຶງລາຍການ SPLUS_PRICE_TAX (ອາກອນ 5%) individual
   */
  export async function fetchJdbTax5Rows(dateFrom: string, dateTo: string): Promise<JdbTaxRow[]> {
    const qs = new URLSearchParams({ view: "jdb_tax5_items" });
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo)   qs.set("date_to",   dateTo);
    const res  = await fetch(`/api/oracle?${qs}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "ດຶງ JDB TAX5 ລົ້ມເຫຼວ");
    return Array.isArray(json.rows) ? json.rows : [];
  }