// lib/exportBcelTax5.ts
// ════════════════════════════════════════════════════════════════════════════
//  Export ສະຫຼຸບລາງວັນ BCEL — xlsx-js-style@1.2.0
//
//  Type fixes (v1.2.0 compatible):
//  - ໃຊ້ CellObject (ບໍ່ແມ່ນ XLSXStyle.Cell ທີ່ບໍ່ exist)
//  - ໃຊ້ BorderType  (ບໍ່ແມ່ນ XLSXStyle.BorderStyle)
//  - fill: { patternType, fgColor }  (ບໍ່ມີ `type` field)
//  - border sides: { color: CellStyleColor; style?: BorderType }
//
//  Layout (ຕາມ template example_reportBCEL.xlsx):
//  R1-R3  = Title (merged A:K)
//  R4     = blank
//  R5-R6  = Table header:  A5:A6, B5:B6, C5:F5, H5:J5, K5:K6
//  R7+    = Data: A-J = DRAWID rows, K = Tax5 items (independent)
//  SUM    = flexible row after last data row
//  TOTAL  = SUM+1,  SIG = TOTAL+3
// ════════════════════════════════════════════════════════════════════════════

import XLSXStyle, {
    type CellObject,
    type CellStyle,
    type CellStyleColor,
    type BorderType,
    type WorkSheet,
  } from "xlsx-js-style";
  
  // ── Types ─────────────────────────────────────────────────────────────────────
  
  export interface BcelRow {
    ງວດ:              string;
    ລາງວັນ:           string;
    ໂຊກຊ້ອນໂຊກ:       string;
    ຄ່າທຳນຽມ:         string;
    "ໂຊກ Spin":        string;
    ຄ່າທຳນຽມ_SPIN:    string;
    "ລາງວັນ SCN":      string;
    "ໂຊກຊ້ອນໂຊກ SCN": string;
    "ຄ່າທຳນຽມ SCN":   string;
    "ອາກອນ5%":         string;
  }
  
  export interface Tax5Row {
    BANK_DATE: string;
    DRAWID:    string | number;
    BANK_CR:   number;
  }
  
  // ── Constants ─────────────────────────────────────────────────────────────────
  
  const FONT       = "Phetsarath OT";
  const BG_HEADER  = "9DC3E6";
  const BG_TOTAL   = "DAEEF3";
  
  // ── Border helpers ────────────────────────────────────────────────────────────
  
  type BSide = { color: CellStyleColor; style?: BorderType };
  
  const thin    = (): BSide => ({ style: "thin",   color: { rgb: "000000" } });
  const medium  = (): BSide => ({ style: "medium", color: { rgb: "000000" } });
  // xlsx-js-style@1.2.0 does not have "double" BorderType → use "thick" for bottom double-line effect
  const thickB  = (): BSide => ({ style: "thick",  color: { rgb: "000000" } });
  
  const allThin  = (): CellStyle["border"] => ({ left:thin(), right:thin(), top:thin(), bottom:thin() });
  const kBorder  = (): CellStyle["border"] => ({ left:medium(), right:medium(), top:thin(), bottom:thin() });
  const aBorder  = (): CellStyle["border"] => ({ left:medium(), right:thin(), top:thin(), bottom:thin() });
  
  // ── Style builders ────────────────────────────────────────────────────────────
  
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
  
  function sData(align: "center" | "right" = "right", leftMed = false): CellStyle {
    return {
      font:      { name: FONT, sz: 11 },
      alignment: { horizontal: align, vertical: "center" },
      numFmt:    "_(* #,##0.00_);_(* \\(#,##0.00\\);_(* \"-\"??_);_(@_)",
      border:    leftMed ? aBorder() : allThin(),
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
  
  const MONTH_LAO: Record<number, string> = {
    1:"ມັງກອນ",2:"ກຸມພາ",3:"ມີນາ",4:"ເມສາ",5:"ພຶດສະພາ",6:"ມິຖຸນາ",
    7:"ກໍລະກົດ",8:"ສິງຫາ",9:"ກັນຍາ",10:"ຕຸລາ",11:"ພະຈິກ",12:"ທັນວາ",
  };
  
  function fmtDate(s: string): string {
    if (!s) return "";
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }
  
  function monthLabel(s: string): string {
    if (!s) return "";
    const d = new Date(s);
    return `ເດືອນ ${MONTH_LAO[d.getMonth()+1] ?? ""} ${d.getFullYear()}`;
  }
  
  // ── Sheet builder ─────────────────────────────────────────────────────────────
  
  function buildSheet(dateDisplay: string, dataRows: BcelRow[], tax5Items: Tax5Row[]): WorkSheet {
    const ws: WorkSheet = {};
    const merges: XLSXStyle.Range[] = [];
  
    const S = (r: number, c: number, cl: CellObject) => {
      ws[XLSXStyle.utils.encode_cell({ r, c })] = cl;
    };
    const M = (r1: number, c1: number, r2: number, c2: number) => {
      merges.push({ s:{r:r1,c:c1}, e:{r:r2,c:c2} });
    };
  
    // ── R1-R3: Title ──────────────────────────────────────────────────────────
    S(0,0, C("   ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",                         sTitle(12)));
    S(1,0, C("    ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ",         sTitle(12)));
    S(2,0, C(`ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນຫວຍຂອງ (BCEL) ວັນທີ ${dateDisplay}`,    sTitle(12, true)));
    M(0,0, 0,10); M(1,0, 1,10); M(2,0, 2,10);
  
    // ── R4: blank ─────────────────────────────────────────────────────────────
    S(3,0, CE(sTitle())); M(3,0, 3,10);
  
    // ── R5: Group header ──────────────────────────────────────────────────────
    // Merges: A5:A6, B5:B6, C5:F5 (Sokxay 4 cols), H5:J5 (SCN), K5:K6
    S(4,0,  C("ລຳດັບ",                    sHeader(11)));
    S(4,1,  C("ງວດທີ",                     sHeader(12)));
    S(4,2,  C("ການຈ່າຍລາງວັນແອັບ Sokxay", sHeader(12)));
    for (let c=3; c<=5; c++) S(4,c, CE(sHeader(12)));  // fill C5:F5 merge
    S(4,6,  CE(sHeader(11)));                           // G5 standalone
    S(4,7,  C("ການຈ່າຍລາງວັນແອັບ SCN",    sHeader(12)));
    for (let c=8; c<=9; c++) S(4,c, CE(sHeader(12)));
    S(4,10, C("ອາກອນ 5%",                  sHeader(12)));
  
    M(4,0,  5,0);   // A5:A6
    M(4,1,  5,1);   // B5:B6
    M(4,2,  4,5);   // C5:F5  ✅ 4 cols only
    M(4,7,  4,9);   // H5:J5
    M(4,10, 5,10);  // K5:K6
  
    // ── R6: Sub-column header ─────────────────────────────────────────────────
    S(5,0,  CE(sHeader(11)));
    S(5,1,  CE(sHeader(12)));
    S(5,2,  C("ລາງວັນ",     sHeader(11)));
    S(5,3,  C("ໂຊກຊ້ອນໂຊກ", sHeader(11)));
    S(5,4,  C("ຄ່າທຳນຽມ",   sHeader(11)));
    S(5,5,  C("ໂຊກ Spin",    sHeader(11)));
    S(5,6,  C("ຄ່າທຳນຽມ",   sHeader(11))); // G6 = ຄ່າທຳນຽມ Spin
    S(5,7,  C("ລາງວັນ",     sHeader(11)));
    S(5,8,  C("ໂຊກຊ້ອນໂຊກ", sHeader(11)));
    S(5,9,  C("ຄ່າທຳນຽມ",   sHeader(11)));
    S(5,10, CE(sHeader(11)));
  
    // ── R7+: Data rows ────────────────────────────────────────────────────────
    const totalRows = Math.max(dataRows.length, tax5Items.length);
  
    let sumC=0,sumD=0,sumE=0,sumF=0,sumG=0,sumH=0,sumI=0,sumJ=0;
    for (const dr of dataRows) {
      sumC += parseNum(dr["ລາງວັນ"]);
      sumD += parseNum(dr["ໂຊກຊ້ອນໂຊກ"]);
      sumE += parseNum(dr["ຄ່າທຳນຽມ"]);
      sumF += parseNum(dr["ໂຊກ Spin"]);
      sumG += parseNum(dr["ຄ່າທຳນຽມ_SPIN"]);
      sumH += parseNum(dr["ລາງວັນ SCN"]);
      sumI += parseNum(dr["ໂຊກຊ້ອນໂຊກ SCN"]);
      sumJ += parseNum(dr["ຄ່າທຳນຽມ SCN"]);
    }
    const sumK = tax5Items.reduce((s,t) => s + t.BANK_CR, 0);
  
    for (let i=0; i<totalRows; i++) {
      const r  = 6 + i;
      const dr = dataRows[i]  ?? null;
      const tx = tax5Items[i] ?? null;
  
      if (dr) {
        S(r,0, C(i+1, { font:{name:FONT,sz:11}, alignment:{horizontal:"center",vertical:"center"}, border:aBorder() }));
        S(r,1, C(dr["ງວດ"], { font:{name:FONT,sz:11}, alignment:{horizontal:"center",vertical:"center"}, border:allThin() }));
        const amts = [
          parseNum(dr["ລາງວັນ"]),
          parseNum(dr["ໂຊກຊ້ອນໂຊກ"]),
          parseNum(dr["ຄ່າທຳນຽມ"]),
          parseNum(dr["ໂຊກ Spin"]),
          parseNum(dr["ຄ່າທຳນຽມ_SPIN"]),
          parseNum(dr["ລາງວັນ SCN"]),
          parseNum(dr["ໂຊກຊ້ອນໂຊກ SCN"]),
          parseNum(dr["ຄ່າທຳນຽມ SCN"]),
        ];
        for (let ci=0; ci<8; ci++) S(r, 2+ci, C(amts[ci], sData("right")));
      } else {
        for (let c=0; c<=9; c++) S(r,c, CE(c===0 ? sData("center",true) : sData("right")));
      }
  
      // Col K: independent of A-J, always fill from tax5Items
      S(r, 10, tx ? C(tx.BANK_CR, sKData()) : CE(sKData()));
    }
  
    // ── SUM row ───────────────────────────────────────────────────────────────
    const rSum = 6 + totalRows;
    S(rSum,0,  CE(sSum()));
    S(rSum,1,  CE(sSum()));
    S(rSum,2,  C(sumC,sSum()));
    S(rSum,3,  C(sumD,sSum()));
    S(rSum,4,  C(sumE,sSum()));
    S(rSum,5,  C(sumF,sSum()));
    S(rSum,6,  C(sumG,sSum()));
    S(rSum,7,  C(sumH,sSum()));
    S(rSum,8,  C(sumI,sSum()));
    S(rSum,9,  C(sumJ,sSum()));
    S(rSum,10, C(sumK,sSum()));
  
    // ── TOTAL row ─────────────────────────────────────────────────────────────
    const rTot  = rSum + 1;
    const grand = sumC+sumD+sumE+sumF+sumG+sumH+sumI+sumJ;
    S(rTot,0, C("ລວມຈ່າຍທັງໝົດ", sTotalLabel()));
    S(rTot,1, CE(sTotalLabel()));
    S(rTot,2, C(grand, sTotalValue()));
    S(rTot,3, CE(sTotalValue()));
    S(rTot,4, CE(sTotalValue()));
    for (let c=5; c<=10; c++) S(rTot,c, CE(sTotalLabel()));
    M(rTot,0, rTot,1);
    M(rTot,2, rTot,4);
  
    // ── Signature row (+3 from TOTAL) ─────────────────────────────────────────
    const rSig = rTot + 3;
    const sSig: CellStyle = { font:{name:FONT,sz:11}, alignment:{horizontal:"center"} };
    S(rSig,4, C("ຜູ້ກວດກາ",  sSig));
    S(rSig,9, C("ຜູ້ສະຫຼຸບ", sSig));
  
    // ── Metadata ──────────────────────────────────────────────────────────────
    ws["!cols"] = [
      {wch:5.82},{wch:13.18},{wch:23.18},{wch:22.27},{wch:18.27},
      {wch:17.54},{wch:15.73},{wch:19.82},{wch:14.54},{wch:16.27},{wch:19.27},
    ];
    ws["!rows"] = [
      {hpt:20.5},{hpt:20.5},{hpt:20.5},{hpt:21.0},{hpt:32.25},{hpt:31.5},
      ...Array.from({length: totalRows}, () => ({hpt:25})),
      {hpt:34.5},{hpt:39.75},{hpt:20.5},{hpt:20.5},{hpt:20.5},
    ];
    ws["!merges"] = merges;
    ws["!ref"] = XLSXStyle.utils.encode_range({r:0,c:0}, {r:rSig,c:10});
  
    return ws;
  }
  
  // ── Public API ────────────────────────────────────────────────────────────────
  
  /**
   * exportBcelTax5
   * - bcelRows   : rows ຈາກ view=bcel_reward_summary (exclude total row)
   * - tax5Items  : rows ຈາກ view=bcel_tax5_items (TAX LOTTERY PRIZE individual)
   *                ໃສ່ col K, 1 item ຕໍ່ 1 ແຖວ, INDEPENDENT ຈາກ DRAWID rows
   */
  export async function exportBcelTax5(
    bcelRows:  BcelRow[],
    tax5Items: Tax5Row[],
    dateFrom:  string,
    dateTo:    string,
  ): Promise<void> {
    const dataRows    = bcelRows.filter(r => r["ງວດ"] !== "ລວມທັງໝົດ");
    const dateDisplay = dateFrom === dateTo
      ? fmtDate(dateFrom)
      : `${fmtDate(dateFrom)} ຫາ ${fmtDate(dateTo)}`;
  
    const ws = buildSheet(dateDisplay, dataRows, tax5Items);
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, (monthLabel(dateFrom) || "BCEL Report").slice(0,31));
    XLSXStyle.writeFile(wb, `BCEL_Tax5_${dateFrom||"all"}_to_${dateTo||"all"}.xlsx`);
  }
  
  /**
   * fetchTax5Rows — ດຶງ TAX LOTTERY PRIZE individual ຈາກ API
   */
  export async function fetchTax5Rows(dateFrom: string, dateTo: string): Promise<Tax5Row[]> {
    const qs = new URLSearchParams({view:"bcel_tax5_items"});
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo)   qs.set("date_to",   dateTo);
    const res  = await fetch(`/api/oracle?${qs}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "ດຶງ TAX5 ລົ້ມເຫຼວ");
    return Array.isArray(json.rows) ? json.rows : [];
  }