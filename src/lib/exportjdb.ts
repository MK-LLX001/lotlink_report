// lib/ExportJdb.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ສະຫຼຸບລາງວັນ JDB — xlsx-js-style@1.2.0
//
//  Layout (ຕາມ template ບໍດສະຫຼຸບລາງວັນJDB4_2026.xlsx):
//  R1-R3  = Title (merged A:J)
//  R4     = blank
//  R5-R6  = Table header:
//             A5:A6 = ລຳດັບ, B5:B6 = ງວດທີ
//             C5:F5 = ການຈ່າຍລາງວັນແອັບ Sokxay (4 cols)
//             G5:H5 = ການຈ່າຍລາງວັນແອັບ SCN (2 cols)
//             I5:I6 = ອາກອນ 5%
//             J5:J6 = ຄ່າທຳນຽມ
//  R6:    = sub-headers: ລາງວັນ, ທຳນຽມ, ໂຊກຊ້ອນໂຊກ, ໂຊກ Spin | ລາງວັນ, ໂຊກຊ້ອນໂຊກ
//  R7+    = Data rows: A=seq, B=ງວດ, C=ລາງວັນSokxay, D=ທຳນຽມ, E=ໂຊກຊ້ອນໂຊກ,
//             F=ໂຊກSpin, G=ລາງວັນSCN, H=ໂຊກຊ້ອນໂຊກSCN, I=ອາກອນ5%(tax), J=ຄ່າທຳນຽມ(other)
//  SUM    = flexible row: C-I totals
//  TOTAL  = ລວມຈ່າຍທັງໝົດ (merged A:B label, merged C:E value)
//  BLANK  = 2 blank rows
//  SIG    = ຜູ້ສະຫຼຸບ (col H)
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
    type CellObject,
    type CellStyle,
    type CellStyleColor,
    type BorderType,
    type WorkSheet,
  } from "xlsx-js-style";
  
  // ── Types ─────────────────────────────────────────────────────────────────────
  
  export interface JdbRow {
    "ງວດ":              string | number;
    "ລາງວັນ Sokxay":    string | number;
    "ໂຊກຊ້ອນໂຊກ":       string | number;
    "ທຳນຽມ":            string | number;
    "ໂຊກ Spin":         string | number;
    "ລາງວັນ SCN":       string | number;
    "ໂຊກຊ້ອນໂຊກ SCN":  string | number;
  }
  
  export interface JdbTaxRow {
    BANK_DATE: string;
    DRAWID:    string | number;
    BANK_CR:   number;
  }
  
  export interface JdbOtherRow {
    TXN_TYPE:         string;
    BANK_DESCRIPTION: string;
    BANK_DATE:        string;
    BANK_DR:          number;
  }
  
  // ── Constants ─────────────────────────────────────────────────────────────────
  
  const FONT      = "Phetsarath OT";
  const BG_HEADER = "9DC3E6";   // light blue — header & SUM rows
  const BG_TOTAL  = "BDD7EE";   // lighter blue — ລວມຈ່າຍທັງໝົດ row
  const BG_OTHER  = "FFF2CC";   // yellow — other items rows
  
  // ── Border helpers ────────────────────────────────────────────────────────────
  
  type BSide = { color: CellStyleColor; style?: BorderType };
  
  const thin   = (): BSide => ({ style: "thin",   color: { rgb: "000000" } });
  const medium = (): BSide => ({ style: "medium", color: { rgb: "000000" } });
  const thick  = (): BSide => ({ style: "thick",  color: { rgb: "000000" } });
  
  const allThin  = (): CellStyle["border"] => ({ left:thin(), right:thin(), top:thin(), bottom:thin() });
  const medLeft  = (): CellStyle["border"] => ({ left:medium(), right:thin(), top:thin(), bottom:thin() });
  
  // ── Style builders ────────────────────────────────────────────────────────────
  
  function sTitle(sz = 12, bold = false): CellStyle {
    return {
      font:      { name: FONT, sz, bold },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }
  
  function sHeader(sz = 11): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz },
      fill:      { patternType: "solid", fgColor: { rgb: BG_HEADER } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border:    allThin(),
    };
  }
  
  function sData(align: "center" | "right" = "right", leftMed = false): CellStyle {
    return {
      font:      { name: FONT, sz: 11 },
      alignment: { horizontal: align, vertical: "center" },
      numFmt:    "#,##0",
      border:    leftMed ? medLeft() : allThin(),
    };
  }
  
  function sDataText(align: "center" | "left" = "center"): CellStyle {
    return {
      font:      { name: FONT, sz: 11 },
      alignment: { horizontal: align, vertical: "center" },
      border:    allThin(),
    };
  }
  
  function sSum(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 11 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_HEADER } },
      alignment: { horizontal: "center", vertical: "center" },
      numFmt:    "#,##0",
      border:    allThin(),
    };
  }
  
  function sTotalLabel(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 12 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
      alignment: { horizontal: "center", vertical: "center" },
      border:    { bottom: thick() },
    };
  }
  
  function sTotalValue(): CellStyle {
    return {
      font:      { name: FONT, bold: true, sz: 12 },
      fill:      { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
      alignment: { horizontal: "center", vertical: "center" },
      numFmt:    "#,##0",
      border:    { bottom: thick() },
    };
  }
  
  function sOtherLabel(): CellStyle {
    return {
      font:      { name: FONT, sz: 10, italic: true, color: { rgb: "5C4A00" } },
      fill:      { patternType: "solid", fgColor: { rgb: BG_OTHER } },
      alignment: { horizontal: "left", vertical: "center", wrapText: true },
      border:    allThin(),
    };
  }
  
  function sOtherValue(): CellStyle {
    return {
      font:      { name: FONT, sz: 10, bold: true, color: { rgb: "7B5C00" } },
      fill:      { patternType: "solid", fgColor: { rgb: BG_OTHER } },
      alignment: { horizontal: "right", vertical: "center" },
      numFmt:    "#,##0",
      border:    allThin(),
    };
  }
  
  // ── Cell factories ────────────────────────────────────────────────────────────
  
  function C(v: string | number, s: CellStyle): CellObject {
    return { v, t: typeof v === "number" ? "n" : "s", s } as CellObject;
  }
  
  function CE(s: CellStyle): CellObject {
    return { v: "", t: "s", s } as CellObject;
  }
  
  // ── Helpers ───────────────────────────────────────────────────────────────────
  
  function parseNum(v: string | number | null | undefined): number {
    if (v == null || v === "") return 0;
    if (typeof v === "number") return v;
    return parseFloat(String(v).replace(/,/g, "")) || 0;
  }
  
  function fmtDate(s: string): string {
    if (!s) return "";
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  
  const MONTH_LAO: Record<number, string> = {
    1:"ມັງກອນ", 2:"ກຸມພາ", 3:"ມີນາ", 4:"ເມສາ", 5:"ພຶດສະພາ", 6:"ມິຖຸນາ",
    7:"ກໍລະກົດ", 8:"ສິງຫາ", 9:"ກັນຍາ", 10:"ຕຸລາ", 11:"ພະຈິກ", 12:"ທັນວາ",
  };
  
  function monthLabel(s: string): string {
    if (!s) return "";
    const d = new Date(s);
    return `ເດືອນ ${MONTH_LAO[d.getMonth() + 1] ?? ""} ${d.getFullYear()}`;
  }
  
  // ── Sheet builder ─────────────────────────────────────────────────────────────
  
  function buildSheet(
    dateDisplay: string,
    dataRows:    JdbRow[],
    taxItems:    JdbTaxRow[],
    otherItems:  JdbOtherRow[],
  ): WorkSheet {
    const ws: WorkSheet = {};
    const merges: XLSXStyle.Range[] = [];
  
    // Total columns = 10 (A–J, index 0–9)
    const LAST_COL = 9; // J
  
    const S = (r: number, c: number, cl: CellObject) => {
      ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
    };
    const M = (r1: number, c1: number, r2: number, c2: number) => {
      merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
    };
  
    // ── R1-R3: Title ────────────────────────────────────────────────────────────
    S(0, 0, C("   ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",                        sTitle(12)));
    S(1, 0, C("    ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ",        sTitle(12)));
    S(2, 0, C(`ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນຫວຍຂອງ (JDB) ວັນທີ ${dateDisplay}`,   sTitle(12, true)));
    M(0, 0, 0, LAST_COL);
    M(1, 0, 1, LAST_COL);
    M(2, 0, 2, LAST_COL);
  
    // ── R4: blank ───────────────────────────────────────────────────────────────
    S(3, 0, CE(sTitle()));
    M(3, 0, 3, LAST_COL);
  
    // ── R5: Group headers ────────────────────────────────────────────────────────
    // A5:A6 = ລຳດັບ,  B5:B6 = ງວດທີ
    // C5:F5 = Sokxay (4 cols: C,D,E,F)
    // G5:H5 = SCN    (2 cols: G,H)
    // I5:I6 = ອາກອນ 5%
    // J5:J6 = ຄ່າທຳນຽມ
    S(4, 0, C("ລຳດັບ",                    sHeader(11)));
    S(4, 1, C("ງວດທີ",                    sHeader(12)));
    S(4, 2, C("ການຈ່າຍລາງວັນແອັບ Sokxay", sHeader(12)));
    for (let c = 3; c <= 5; c++) S(4, c, CE(sHeader(12)));
    S(4, 6, C("ການຈ່າຍລາງວັນແອັບ SCN",   sHeader(12)));
    S(4, 7, CE(sHeader(12)));
    S(4, 8, C("ອາກອນ 5%",                 sHeader(12)));
    S(4, 9, C("ຄ່າທຳນຽມ",                 sHeader(12)));
  
    M(4, 0, 5, 0);  // A5:A6
    M(4, 1, 5, 1);  // B5:B6
    M(4, 2, 4, 5);  // C5:F5  (Sokxay 4 cols)
    M(4, 6, 4, 7);  // G5:H5  (SCN 2 cols)
    M(4, 8, 5, 8);  // I5:I6
    M(4, 9, 5, 9);  // J5:J6
  
    // ── R6: Sub-column headers ───────────────────────────────────────────────────
    S(5, 0, CE(sHeader(11)));
    S(5, 1, CE(sHeader(12)));
    S(5, 2, C("ລາງວັນ",      sHeader(11)));
    S(5, 3, C("ທຳນຽມ",       sHeader(11)));
    S(5, 4, C("ໂຊກຊ້ອນໂຊກ",  sHeader(11)));
    S(5, 5, C("ໂຊກ Spin",    sHeader(11)));
    S(5, 6, C("ລາງວັນ",      sHeader(11)));
    S(5, 7, C("ໂຊກຊ້ອນໂຊກ",  sHeader(11)));
    S(5, 8, CE(sHeader(11)));
    S(5, 9, CE(sHeader(11)));
  
    // ── R7+: Data rows ───────────────────────────────────────────────────────────
    const totalDataRows = Math.max(dataRows.length, taxItems.length);
  
    let sumC = 0, sumD = 0, sumE = 0, sumF = 0, sumG = 0, sumH = 0, sumI = 0;
    for (const dr of dataRows) {
      sumC += parseNum(dr["ລາງວັນ Sokxay"]);
      sumD += parseNum(dr["ທຳນຽມ"]);
      sumE += parseNum(dr["ໂຊກຊ້ອນໂຊກ"]);
      sumF += parseNum(dr["ໂຊກ Spin"]);
      sumG += parseNum(dr["ລາງວັນ SCN"]);
      sumH += parseNum(dr["ໂຊກຊ້ອນໂຊກ SCN"]);
    }
    const sumI_tax = taxItems.reduce((s, t) => s + t.BANK_CR, 0);
    sumI = sumI_tax;
  
    for (let i = 0; i < totalDataRows; i++) {
      const r  = 6 + i;
      const dr = dataRows[i]  ?? null;
      const tx = taxItems[i]  ?? null;
  
      if (dr) {
        S(r, 0, C(i + 1,          { font:{name:FONT,sz:11}, alignment:{horizontal:"center",vertical:"center"}, border:medLeft() }));
        S(r, 1, C(String(dr["ງວດ"]), sDataText("center")));
        S(r, 2, C(parseNum(dr["ລາງວັນ Sokxay"]),   sData("right")));
        S(r, 3, C(parseNum(dr["ທຳນຽມ"]),            sData("right")));
        S(r, 4, C(parseNum(dr["ໂຊກຊ້ອນໂຊກ"]),       sData("right")));
        S(r, 5, C(parseNum(dr["ໂຊກ Spin"]),          sData("right")));
        S(r, 6, C(parseNum(dr["ລາງວັນ SCN"]),        sData("right")));
        S(r, 7, C(parseNum(dr["ໂຊກຊ້ອນໂຊກ SCN"]),   sData("right")));
      } else {
        S(r, 0, CE({ font:{name:FONT,sz:11}, border:medLeft() }));
        for (let c = 1; c <= 7; c++) S(r, c, CE(sData("right")));
      }
  
      // Col I: ອາກອນ 5% (independent tax items)
      S(r, 8, tx ? C(tx.BANK_CR, sData("right")) : CE(sData("right")));
      // Col J: ຄ່າທຳນຽມ — empty in data rows (otherItems appended below)
      S(r, 9, CE(sData("right")));
    }
  
    // ── SUM row ──────────────────────────────────────────────────────────────────
    const rSum = 6 + totalDataRows;
    S(rSum, 0, CE(sSum()));
    S(rSum, 1, CE(sSum()));
    S(rSum, 2, C(sumC, sSum()));
    S(rSum, 3, C(sumD, sSum()));
    S(rSum, 4, C(sumE, sSum()));
    S(rSum, 5, C(sumF, sSum()));
    S(rSum, 6, C(sumG, sSum()));
    S(rSum, 7, C(sumH, sSum()));
    S(rSum, 8, C(sumI, sSum()));
    S(rSum, 9, CE(sSum()));
    M(rSum, 0, rSum, 1);
  
    // ── TOTAL row ─────────────────────────────────────────────────────────────────
    const rTot  = rSum + 1;
    const grand = sumC + sumD + sumE + sumF + sumG + sumH;
    S(rTot, 0, C("ລວມຈ່າຍທັງໝົດ", sTotalLabel()));
    S(rTot, 1, CE(sTotalLabel()));
    S(rTot, 2, C(grand, sTotalValue()));
    S(rTot, 3, CE(sTotalValue()));
    S(rTot, 4, CE(sTotalValue()));
    for (let c = 5; c <= LAST_COL; c++) S(rTot, c, CE(sTotalLabel()));
    M(rTot, 0, rTot, 1);  // A:B merged label
    M(rTot, 2, rTot, 4);  // C:E merged value
  
    // ── Other items rows (ຄ່າທຳນຽມ) ─────────────────────────────────────────────
    let rOther = rTot + 1;
    for (const oth of otherItems) {
      const label = `[${oth.TXN_TYPE}] ${oth.BANK_DESCRIPTION} (${oth.BANK_DATE})`;
      S(rOther, 0, CE({ font:{name:FONT,sz:10}, fill:{patternType:"solid",fgColor:{rgb:BG_OTHER}}, border:allThin() }));
      S(rOther, 1, C(label, sOtherLabel()));
      for (let c = 2; c <= 8; c++) S(rOther, c, CE({ font:{name:FONT,sz:10}, fill:{patternType:"solid",fgColor:{rgb:BG_OTHER}}, border:allThin() }));
      S(rOther, 9, C(oth.BANK_DR, sOtherValue()));
      M(rOther, 1, rOther, 8);
      rOther++;
    }
  
    // ── Signature row ─────────────────────────────────────────────────────────────
    const rSig = rOther + 2;
    const sSig: CellStyle = { font: { name: FONT, sz: 11 }, alignment: { horizontal: "center" } };
    S(rSig, 7, C("ຜູ້ສະຫຼຸບ", sSig));
  
    // ── Column widths (ຕາມ template) ──────────────────────────────────────────────
    ws["!cols"] = [
      { wch: 5.86  }, // A: ລຳດັບ
      { wch: 12.29 }, // B: ງວດທີ
      { wch: 18.71 }, // C: ລາງວັນ Sokxay
      { wch: 14.71 }, // D: ທຳນຽມ
      { wch: 17.57 }, // E: ໂຊກຊ້ອນໂຊກ
      { wch: 17.43 }, // F: ໂຊກ Spin
      { wch: 16.14 }, // G: ລາງວັນ SCN
      { wch: 18.43 }, // H: ໂຊກຊ້ອນໂຊກ SCN
      { wch: 18.29 }, // I: ອາກອນ 5%
      { wch: 17.00 }, // J: ຄ່າທຳນຽມ
    ];
  
    // ── Row heights ───────────────────────────────────────────────────────────────
    ws["!rows"] = [
      { hpt: 15.0  }, // R1
      { hpt: 15.0  }, // R2
      { hpt: 15.75 }, // R3
      { hpt: 15.0  }, // R4 blank
      { hpt: 29.25 }, // R5 group header
      { hpt: 28.5  }, // R6 sub-header
      ...Array.from({ length: totalDataRows }, () => ({ hpt: 24.95 })),
      { hpt: 35.25 }, // SUM row
      { hpt: 43.5  }, // TOTAL row
      ...Array.from({ length: otherItems.length }, () => ({ hpt: 28.0 })),
      { hpt: 15.0  }, // blank before sig
      { hpt: 15.0  }, // blank before sig
      { hpt: 18.0  }, // sig
    ];
  
    ws["!merges"] = merges;
    ws["!ref"] = XLSXStyle.utils.encode_range({ r: 0, c: 0 }, { r: rSig, c: LAST_COL });
  
    return ws;
  }
  
  // ── Public API ─────────────────────────────────────────────────────────────────
  
  /**
   * exportJdbReward
   * - rows       : ຈາກ view=jdb_reward_summary (includes total row ທີ່ filter ອອກ)
   * - taxItems   : ຈາກ view=jdb_tax5_items (ອາກອນ 5%, 1 item/row, col I)
   * - otherItems : ຈາກ view=jdb_other_items (ຄ່າທຳນຽມ misc, appended after TOTAL)
   */
  export async function exportJdbReward(
    rows:       JdbRow[],
    taxItems:   JdbTaxRow[],
    otherItems: JdbOtherRow[],
    dateFrom:   string,
    dateTo:     string,
  ): Promise<void> {
    const dataRows    = rows.filter(r => String(r["ງວດ"]) !== "ລວມທັງໝົດ");
    const dateDisplay = dateFrom === dateTo
      ? fmtDate(dateFrom)
      : `${fmtDate(dateFrom)} ຫາ ${fmtDate(dateTo)}`;
  
    const ws = buildSheet(dateDisplay, dataRows, taxItems, otherItems);
    const wb = XLSXStyle.utils.book_new();
    const sheetName = (monthLabel(dateFrom) || "JDB Report").slice(0, 31);
    XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
    XLSXStyle.writeFile(wb, `JDB_Reward_${dateFrom || "all"}_to_${dateTo || "all"}.xlsx`);
  }
  
  /**
   * fetchJdbTax5Rows — ດຶງ ອາກອນ 5% individual ຈາກ API
   */
  export async function fetchJdbTax5Rows(dateFrom: string, dateTo: string): Promise<JdbTaxRow[]> {
    const qs = new URLSearchParams({ view: "jdb_tax5_items" });
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo)   qs.set("date_to",   dateTo);
    const res  = await fetch(`/api/oracle?${qs}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "ດຶງ JDB Tax5 ລົ້ມເຫຼວ");
    return Array.isArray(json.rows) ? json.rows : [];
  }