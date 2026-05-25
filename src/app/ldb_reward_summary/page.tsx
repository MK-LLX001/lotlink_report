"use client";
import React, { useState, useMemo } from "react";
import {
  RefreshCw, Search, AlertCircle, BarChart3,
  Printer, X, Filter, FileSpreadsheet,
} from "lucide-react";
import XLSXStyle, {
  type CellObject,
  type CellStyle,
  type CellStyleColor,
  type BorderType,
  type WorkSheet,
} from "xlsx-js-style";

// ══════════════════════════════════════════════════════════════════════════════
//  Types
// ══════════════════════════════════════════════════════════════════════════════

interface LdbRow {
  "ງວດ":                  string | number;
  "ຈຳນວນລາງວັນ Sokxay":   string | number;
  "ໂຊກຊ້ອນໂຊກ":            string | number;
  "Spin":                  string | number;
  "ລາງວັນ SCN":             string | number;
  "LDB_FEE_REWARD_FTR":    string | number;
  "FTR":                   string | number;
  "FTR_FEE":               string | number;
  "LDB_FEE_DEEPLINK":      string | number;
  "LDB_FEE_LOTTO_SELL":    string | number;
  "ລວມຫນີ້ທັງໝົດ":          string | number;
  "ລວມມີທັງໝົດ":            string | number;
  "ອາກອນ5%":               string | number;
}

interface LdbTaxRow {
  DATE_TIME: string;
  DRAWID:    string | number;
  DEPOSIT:   number;
}

// ══════════════════════════════════════════════════════════════════════════════
//  Excel helpers — xlsx-js-style
//  Cols A–H (0–7):
//    A=ລຳດັບ  B=ງວດທີ
//    C=ລາງວັນ(Sokxay)  D=ໂຊກຊ້ອນໂຊກ(Sokxay)  E=ໂຊກSpin
//    F=ລາງວັນ(SCN)  G=ໂຊກຊ້ອນໂຊກ(SCN)
//    H=ອາກອນ5%
// ══════════════════════════════════════════════════════════════════════════════

const FONT      = "Phetsarath OT";
const BG_HEADER = "A9D18E";   // green
const BG_TOTAL  = "C6EFCE";   // light green
const LAST_COL  = 7;          // H (0-indexed)

type BSide = { color: CellStyleColor; style?: BorderType };
const thin   = (): BSide => ({ style: "thin",   color: { rgb: "000000" } });
const medium = (): BSide => ({ style: "medium", color: { rgb: "000000" } });
const thick  = (): BSide => ({ style: "thick",  color: { rgb: "000000" } });
const allThin  = (): CellStyle["border"] => ({ left:thin(), right:thin(), top:thin(), bottom:thin() });
const medLeft  = (): CellStyle["border"] => ({ left:medium(), right:thin(), top:thin(), bottom:thin() });

const sTitle = (sz = 12, bold = false): CellStyle => ({
  font:      { name: FONT, sz, bold },
  alignment: { horizontal: "center", vertical: "center" },
});
const sHeader = (sz = 10): CellStyle => ({
  font:      { name: FONT, bold: true, sz },
  fill:      { patternType: "solid", fgColor: { rgb: BG_HEADER } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border:    allThin(),
});
const sData = (align: "center" | "right" = "right", leftMed = false): CellStyle => ({
  font:      { name: FONT, sz: 10 },
  alignment: { horizontal: align, vertical: "center" },
  numFmt:    "#,##0",
  border:    leftMed ? medLeft() : allThin(),
});
const sDataText = (align: "center" | "left" = "center"): CellStyle => ({
  font:      { name: FONT, sz: 10 },
  alignment: { horizontal: align, vertical: "center" },
  border:    allThin(),
});
const sSum = (): CellStyle => ({
  font:      { name: FONT, bold: true, sz: 10 },
  fill:      { patternType: "solid", fgColor: { rgb: BG_HEADER } },
  alignment: { horizontal: "center", vertical: "center" },
  numFmt:    "#,##0",
  border:    allThin(),
});
const sTotalLabel = (): CellStyle => ({
  font:      { name: FONT, bold: true, sz: 11 },
  fill:      { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
  alignment: { horizontal: "center", vertical: "center" },
  border:    { bottom: thick() },
});
const sTotalValue = (): CellStyle => ({
  font:      { name: FONT, bold: true, sz: 11 },
  fill:      { patternType: "solid", fgColor: { rgb: BG_TOTAL } },
  alignment: { horizontal: "center", vertical: "center" },
  numFmt:    "#,##0",
  border:    { bottom: thick() },
});

const C  = (v: string | number, s: CellStyle): CellObject => ({ v, t: typeof v === "number" ? "n" : "s", s } as CellObject);
const CE = (s: CellStyle): CellObject => ({ v: "", t: "s", s } as CellObject);

function parseNum(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/,/g, "")) || 0;
}

function fmtDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

const MONTH_LAO: Record<number, string> = {
  1:"ມັງກອນ",2:"ກຸມພາ",3:"ມີນາ",4:"ເມສາ",5:"ພຶດສະພາ",6:"ມິຖຸນາ",
  7:"ກໍລະກົດ",8:"ສິງຫາ",9:"ກັນຍາ",10:"ຕຸລາ",11:"ພະຈິກ",12:"ທັນວາ",
};
function monthLabel(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  return `ເດືອນ ${MONTH_LAO[d.getMonth()+1] ?? ""} ${d.getFullYear()}`;
}

function buildSheet(dateDisplay: string, dataRows: LdbRow[], taxItems: LdbTaxRow[]): WorkSheet {
  const ws: WorkSheet = {};
  const merges: XLSXStyle.Range[] = [];
  const S = (r: number, c: number, cl: CellObject) => { ws[XLSXStyle.utils.encode_cell({ r, c })] = cl; };
  const M = (r1: number, c1: number, r2: number, c2: number) => { merges.push({ s:{r:r1,c:c1}, e:{r:r2,c:c2} }); };

  // ── R1-R3: Title ────────────────────────────────────────────────────────────
  // Merge A:H (cols 0-7)
  S(0,0, C("   ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ",                        sTitle(12)));
  S(1,0, C("    ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ",        sTitle(12)));
  S(2,0, C(`ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນຫວຍຂອງ (LDB) ວັນທີ${dateDisplay}`,   sTitle(12, true)));
  M(0,0, 0,LAST_COL); M(1,0, 1,LAST_COL); M(2,0, 2,LAST_COL);

  // ── R4: blank ───────────────────────────────────────────────────────────────
  S(3,0, CE(sTitle())); M(3,0, 3,LAST_COL);

  // ── R5: group headers ───────────────────────────────────────────────────────
  //  A=ລຳດັບ (merge R5:R6)
  //  B=ງວດທີ (merge R5:R6)
  //  C-E = ການຈ່າຍລາງວັນແອັບ Sokxay (merge C5:E5) — ລາງວັນ / ໂຊກຊ້ອນໂຊກ / ໂຊກ Spin
  //  F-G = ການຈ່າຍລາງວັນແອັບ SCN (merge F5:G5) — ລາງວັນ / ໂຊກຊ້ອນໂຊກ
  //  H=ອາກອນ 5% (merge R5:R6)
  S(4,0, C("ລຳດັບ",                              sHeader(10))); M(4,0, 5,0);
  S(4,1, C("ງວດທີ",                              sHeader(11))); M(4,1, 5,1);
  S(4,2, C("ການຈ່າຍລາງວັນແອັບ Sokxay",           sHeader(11)));
  S(4,3, CE(sHeader(11))); S(4,4, CE(sHeader(11)));
  M(4,2, 4,4);
  S(4,5, C("ການຈ່າຍລາງວັນແອັບ SCN",              sHeader(11)));
  S(4,6, CE(sHeader(11)));
  M(4,5, 4,6);
  S(4,7, C("ອາກອນ 5%",                           sHeader(10))); M(4,7, 5,7);

  // ── R6: sub-headers ─────────────────────────────────────────────────────────
  S(5,0, CE(sHeader(10))); S(5,1, CE(sHeader(11)));
  S(5,2, C("ລາງວັນ",       sHeader(10)));
  S(5,3, C("ໂຊກຊ້ອນໂຊກ",  sHeader(10)));
  S(5,4, C("ໂຊກ Spin",    sHeader(10)));
  S(5,5, C("ລາງວັນ",       sHeader(10)));
  S(5,6, C("ໂຊກຊ້ອນໂຊກ",  sHeader(10)));
  S(5,7, CE(sHeader(10)));

  // ── Data rows ───────────────────────────────────────────────────────────────
  // Map from LdbRow fields to the 5 data columns:
  //   C = ຈຳນວນລາງວັນ Sokxay  (Sokxay ລາງວັນ)
  //   D = ໂຊກຊ້ອນໂຊກ           (Sokxay ໂຊກຊ້ອນໂຊກ)
  //   E = Spin                  (Sokxay ໂຊກ Spin)
  //   F = ລາງວັນ SCN             (SCN ລາງວັນ)
  //   G = LDB_FEE_REWARD_FTR    (SCN ໂຊກຊ້ອນໂຊກ — closest match)
  //   H = ອາກອນ5% from taxItems

  let sumC=0, sumD=0, sumE=0, sumF=0, sumG=0, sumH=0;
  for (const dr of dataRows) {
    sumC += parseNum(dr["ຈຳນວນລາງວັນ Sokxay"]);
    sumD += parseNum(dr["ໂຊກຊ້ອນໂຊກ"]);
    sumE += parseNum(dr["Spin"]);
    sumF += parseNum(dr["ລາງວັນ SCN"]);
    sumG += parseNum(dr["LDB_FEE_REWARD_FTR"]);
  }
  sumH = taxItems.reduce((s,t) => s + t.DEPOSIT, 0);

  const totalRows = Math.max(dataRows.length, taxItems.length);

  for (let i=0; i<totalRows; i++) {
    const r  = 6 + i;
    const dr = dataRows[i] ?? null;
    const tx = taxItems[i] ?? null;

    if (dr) {
      S(r,0, C(i+1, { font:{name:FONT,sz:10}, alignment:{horizontal:"center",vertical:"center"}, border:medLeft() }));
      S(r,1, C(String(dr["ງວດ"]),                        sDataText("center")));
      S(r,2, C(parseNum(dr["ຈຳນວນລາງວັນ Sokxay"]),      sData("right")));
      S(r,3, C(parseNum(dr["ໂຊກຊ້ອນໂຊກ"]),               sData("right")));
      S(r,4, C(parseNum(dr["Spin"]),                      sData("right")));
      S(r,5, C(parseNum(dr["ລາງວັນ SCN"]),                sData("right")));
      S(r,6, C(parseNum(dr["LDB_FEE_REWARD_FTR"]),        sData("right")));
    } else {
      S(r,0, CE({ font:{name:FONT,sz:10}, border:medLeft() }));
      for (let c=1; c<=6; c++) S(r,c, CE(sData("right")));
    }
    S(r,7, tx ? C(tx.DEPOSIT, sData("right")) : CE(sData("right")));
  }

  // ── SUM row ─────────────────────────────────────────────────────────────────
  const rSum = 6 + totalRows;
  // A-B merged, empty label
  S(rSum,0, CE(sSum())); S(rSum,1, CE(sSum())); M(rSum,0, rSum,1);
  S(rSum,2, C(sumC, sSum()));
  S(rSum,3, C(sumD, sSum()));
  S(rSum,4, C(sumE, sSum()));
  S(rSum,5, C(sumF, sSum()));
  S(rSum,6, C(sumG, sSum()));
  S(rSum,7, C(sumH, sSum()));

  // ── TOTAL row ────────────────────────────────────────────────────────────────
  // "ລວມຈ່າຍທັງໝົດ" label (A-B), grand total = sum of all 5 data cols (C-E merge)
  const rTot  = rSum + 1;
  const grand = sumC + sumD + sumE + sumF + sumG;
  S(rTot,0, C("ລວມຈ່າຍທັງໝົດ", sTotalLabel())); S(rTot,1, CE(sTotalLabel())); M(rTot,0, rTot,1);
  S(rTot,2, C(grand, sTotalValue()));
  S(rTot,3, CE(sTotalLabel())); S(rTot,4, CE(sTotalLabel()));
  M(rTot,2, rTot,4);
  for (let c=5; c<=LAST_COL; c++) S(rTot,c, CE(sTotalLabel()));

  // ── Signature rows ───────────────────────────────────────────────────────────
  const rSig = rTot + 3;
  const sSig: CellStyle = { font:{name:FONT,sz:11}, alignment:{horizontal:"center"} };
  S(rSig,2, C("ຜູ້ກວດກາ",  sSig));
  S(rSig,5, C("ຜູ້ສະຫຼຸບ", sSig));

  // ── Column widths ────────────────────────────────────────────────────────────
  //  A     B      C      D      E      F      G      H
  ws["!cols"] = [
    {wch:6}, {wch:11}, {wch:18}, {wch:16}, {wch:14}, {wch:18}, {wch:16}, {wch:14},
  ];
  ws["!rows"] = [
    {hpt:15},{hpt:15},{hpt:16},{hpt:8},
    {hpt:30},{hpt:30},
    ...Array.from({length:totalRows}, () => ({hpt:20})),
    {hpt:24},{hpt:32},
    {hpt:15},{hpt:15},{hpt:20},
  ];
  ws["!merges"] = merges;
  ws["!ref"] = XLSXStyle.utils.encode_range({r:0,c:0}, {r:rSig,c:LAST_COL});
  return ws;
}

async function exportLdbReward(
  rows:     LdbRow[],
  taxItems: LdbTaxRow[],
  dateFrom: string,
  dateTo:   string,
): Promise<void> {
  const dataRows    = rows.filter(r => String(r["ງວດ"]) !== "ລວມທັງໝົດ");
  const dateDisplay = dateFrom === dateTo
    ? fmtDate(dateFrom)
    : `${fmtDate(dateFrom)} ຫາ ${fmtDate(dateTo)}`;
  const ws = buildSheet(dateDisplay, dataRows, taxItems);
  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, (monthLabel(dateFrom) || "LDB Report").slice(0,31));
  XLSXStyle.writeFile(wb, `LDB_Reward_${dateFrom||"all"}_to_${dateTo||"all"}.xlsx`);
}

async function fetchLdbTaxRows(dateFrom: string, dateTo: string): Promise<LdbTaxRow[]> {
  const qs = new URLSearchParams({view:"ldb_tax_reward_items"});
  if (dateFrom) qs.set("date_from", dateFrom);
  if (dateTo)   qs.set("date_to",   dateTo);
  const res  = await fetch(`/api/oracle?${qs}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "ດຶງ LDB Tax ລົ້ມເຫຼວ");
  return Array.isArray(json.rows) ? json.rows : [];
}

// ══════════════════════════════════════════════════════════════════════════════
//  Print CSS
// ══════════════════════════════════════════════════════════════════════════════

const PRINT_CSS = `
  @media print {
    @page { size: A3 landscape; margin: 10mm 8mm 20mm 8mm; }

    @page {
      @bottom-center {
        content: "ໜ້າ " counter(page) " / " counter(pages);
        font-size: 9px;
        font-family: 'Phetsarath OT', 'Phetsarath', sans-serif;
        color: #000;
      }
    }

    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body * { visibility: hidden; }
    .print-area, .print-area * { visibility: visible; }
    .print-area { position: absolute; top: 0; left: 0; width: 100%; overflow: visible; padding: 0; box-sizing: border-box; }
    .no-print { display: none !important; }

    * {
      font-family: 'Phetsarath OT', 'Phetsarath', sans-serif !important;
      color: #000 !important;
      box-shadow: none !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    table {
      font-size: 7px !important;
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      border: 1px solid #000 !important;
    }

    th, td {
      padding: 2px 2px !important;
      font-size: 7px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      border: 1px solid #000 !important;
    }

    thead tr th {
      background: #a9d18e !important;
      background-color: #a9d18e !important;
      font-weight: bold !important;
      text-align: center !important;
    }

    tr.total-row td {
      background: #a9d18e !important;
      background-color: #a9d18e !important;
      font-weight: bold !important;
    }

    tr.grand-total-row td {
      background: #c6efce !important;
      background-color: #c6efce !important;
      font-weight: bold !important;
      border: 2px solid #000 !important;
    }

    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }
    .overflow-x-auto { overflow: visible !important; }

    .print-signature {
      display: flex !important;
      justify-content: space-around;
      margin-top: 20mm;
      page-break-inside: avoid;
    }
    .print-signature .sig-box { text-align: center; width: 160px; }
    .print-signature .sig-line {
      border-top: 1px solid #000 !important;
      margin-top: 15mm;
      padding-top: 4px;
      font-size: 10px;
    }
    .print-signature .sig-role { font-size: 9px; margin-top: 2px; }
  }
`;

// ══════════════════════════════════════════════════════════════════════════════
//  Component
// ══════════════════════════════════════════════════════════════════════════════

const isTotal = (row: LdbRow) => row["ງວດ"] === "ລວມທັງໝົດ";

export default function LdbRewardSummaryPage() {
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [rows,        setRows]        = useState<LdbRow[]>([]);
  const [taxItems,    setTaxItems]    = useState<LdbTaxRow[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [printTime,   setPrintTime]   = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo,   setAppliedTo]   = useState("");

  const fetchData = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({view:"ldb_reward_summary"});
      if (from) qs.set("date_from", from);
      if (to)   qs.set("date_to",   to);
      const res  = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(Array.isArray(json.rows) ? json.rows : []);
      const tax = await fetchLdbTaxRows(from, to);
      setTaxItems(tax);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    setAppliedFrom(dateFrom);
    setAppliedTo(dateTo);
    setHasSearched(true);
    fetchData(dateFrom, dateTo);
  };

  const handleClear = () => {
    setDateFrom(""); setDateTo("");
    setAppliedFrom(""); setAppliedTo("");
    setHasSearched(false);
    setRows([]); setTaxItems([]); setError(null);
  };

  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    setTimeout(() => window.print(), 100);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportLdbReward(rows, taxItems, appliedFrom, appliedTo);
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const allDataRows = useMemo(() => rows.filter(r => !isTotal(r)), [rows]);
  const totalRow    = useMemo(() => rows.find(r => isTotal(r)),    [rows]);

  const parseN = (v: string | number | null | undefined) =>
    parseFloat(String(v ?? "0").replace(/,/g, "")) || 0;

  const mergedRows = useMemo(() => {
    const maxLen = Math.max(allDataRows.length, taxItems.length);
    return Array.from({length: maxLen}, (_, i) => ({
      row: allDataRows[i] ?? null,
      tx:  taxItems[i]    ?? null,
      idx: i,
    })).filter(({row, tx}) => {
      const hasRow = row ? !!row["ງວດ"] : false;
      const hasTx  = tx  ? tx.DEPOSIT !== 0 : false;
      return hasRow || hasTx;
    });
  }, [allDataRows, taxItems]);

  const hasData   = hasSearched && mergedRows.length > 0;
  const hasFilter = dateFrom || dateTo;
  const tax5Total = useMemo(() => taxItems.reduce((s,t) => s + t.DEPOSIT, 0), [taxItems]);

  const grandDebt = useMemo(() => totalRow ? parseN(totalRow["ລວມຫນີ້ທັງໝົດ"]) : 0, [totalRow]);
  const grandCred = useMemo(() => totalRow ? parseN(totalRow["ລວມມີທັງໝົດ"])    : 0, [totalRow]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", {minimumFractionDigits:0, maximumFractionDigits:0});

  const fmtVal = (v: string | number | null | undefined): string => {
    if (v == null || v === "") return "";
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
    if (isNaN(n) || n === 0) return "";
    return fmt(n);
  };

  const TH  = "px-1.5 py-2 text-center font-bold text-slate-700 whitespace-nowrap bg-green-50 border border-black text-[9px]";
  const THG = "px-1.5 py-2 text-center font-bold text-slate-700 whitespace-nowrap bg-emerald-100 border border-black text-[9px]";
  const TD  = "px-1.5 py-1.5 text-right font-mono border border-black text-[9px] whitespace-nowrap";
  const TDC = "px-1.5 py-1.5 text-center font-mono border border-black text-[9px]";
  const TDH = "px-1.5 py-1.5 text-right font-mono border border-black text-[9px] whitespace-nowrap bg-emerald-50";

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">

        {/* ── Screen Header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <BarChart3 size={18} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                ສະຫຼຸບລາງວັນ LDB — LDB_STMT
              </h1>
              <p className="text-xs text-slate-400">
                ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນ ຈຳແນກຕາມງວດ · ACCT_NO: 0302000010005221
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasData && (
              <>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                >
                  {exporting
                    ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງ Export...</>
                    : <><FileSpreadsheet size={13} /> Export Excel</>}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition"
                >
                  <Printer size={13} /> ພິມ A3
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Filter ─────────────────────────────────────────────────────── */}
        <div className="no-print bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຈາກ (DATE_TIME)</label>
            <input
              type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຫາ (DATE_TIME)</label>
            <input
              type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition"
            >
              {loading
                ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງໂຫຼດ...</>
                : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
            </button>
            {(hasFilter || hasSearched) && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
              >
                <X size={12} /> ລ້າງ
              </button>
            )}
            {hasSearched && (
              <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
                {loading ? "ກໍາລັງດຶງ..." : `${allDataRows.length.toLocaleString()} ງວດ`}
              </span>
            )}
          </div>
        </div>

        {/* ── Error ──────────────────────────────────────────────────────── */}
        {error && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Print Header ───────────────────────────────────────────────── */}
        <div className="hidden print:block mb-2">
          <div style={{display:"flex", flexDirection:"column", alignItems:"flex-start"}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sokxay.png"
              alt="Company Logo"
              style={{height:"48px", width:"auto", objectFit:"contain"}}
            />
            <p style={{fontSize:"9px", color:"#888", margin:"2px 0 0 2px", whiteSpace:"nowrap"}}>
              ພິມວັນທີ: {printTime || new Date().toLocaleString("lo-LA")}
            </p>
          </div>
        </div>

        {/* ── Print title ────────────────────────────────────────────────── */}
        <div className="hidden print:block mb-2" style={{textAlign:"center"}}>
          <div style={{fontSize:"13px", fontWeight:"bold"}}>
            ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
          </div>
          <div style={{fontSize:"11px"}}>
            ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ
          </div>
          <h1 style={{fontSize:"14px", fontWeight:"bold", margin:"4px 0 0 0"}}>
            ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນ LDB
          </h1>
          {(appliedFrom || appliedTo) && (
            <div style={{marginTop:"3px", fontSize:"10px", color:"#555"}}>
              ວັນທີ: {appliedFrom || ""} ຫາ {appliedTo || ""}
            </div>
          )}
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
              <BarChart3 size={36} className="opacity-30" />
              <p className="text-sm">
                ເລືອກວັນທີ ແລ້ວກົດ{" "}
                <span className="font-semibold text-emerald-600">ສະແດງຂໍ້ມູນ</span>
              </p>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <BarChart3 size={36} className="opacity-30" />
              <p className="text-sm">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີທີ່ເລືອກ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={TH}  rowSpan={2}>ລຳດັບ</th>
                    <th className={TH}  rowSpan={2}>ງວດ</th>
                    <th className={THG} colSpan={4}>ການຈ່າຍລາງວັນ Sokxay</th>
                    <th className={THG} colSpan={5}>ຄ່າທຳນຽມ / FTR</th>
                    <th className={TH}  rowSpan={2}>ລວມຫນີ້<br/>ທັງໝົດ</th>
                    <th className={TH}  rowSpan={2}>ລວມມີ<br/>ທັງໝົດ</th>
                    <th className={TH}  rowSpan={2}>ອາກອນ 5%</th>
                  </tr>
                  <tr>
                    <th className={TH}>ລາງວັນ Sokxay</th>
                    <th className={TH}>ໂຊກຊ້ອນໂຊກ</th>
                    <th className={TH}>Spin</th>
                    <th className={TH}>ລາງວັນ SCN</th>
                    <th className={TH}>LDB_FEE_REWARD_FTR</th>
                    <th className={TH}>FTR</th>
                    <th className={TH}>FTR_FEE</th>
                    <th className={TH}>LDB_FEE_DEEPLINK</th>
                    <th className={TH}>LDB_FEE_LOTTO_SELL</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedRows.map(({row, tx}, i) => (
                    <tr key={i} className="hover:bg-emerald-50">
                      <td className={TDC}>{i + 1}</td>
                      <td className={TDC + " text-emerald-700 font-semibold"}>{row?.["ງວດ"] ?? ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ຈຳນວນລາງວັນ Sokxay"])  : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ໂຊກຊ້ອນໂຊກ"])            : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["Spin"])                   : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ລາງວັນ SCN"])              : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["LDB_FEE_REWARD_FTR"])     : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["FTR"])                    : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["FTR_FEE"])                : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["LDB_FEE_DEEPLINK"])       : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["LDB_FEE_LOTTO_SELL"])     : ""}</td>
                      <td className={TDH}>{row ? fmtVal(row["ລວມຫນີ້ທັງໝົດ"])          : ""}</td>
                      <td className={TDH}>{row ? fmtVal(row["ລວມມີທັງໝົດ"])            : ""}</td>
                      <td className={TD}>{tx  ? fmtVal(tx.DEPOSIT)                    : ""}</td>
                    </tr>
                  ))}

                  {/* SUM row */}
                  {totalRow && (
                    <tr className="total-row bg-green-200 font-bold">
                      <td className={TDC + " bg-green-200 font-bold"} colSpan={2}>ລວມທັງໝົດ</td>
                      <td className={TD + " bg-green-200 font-bold"}>{fmtVal(totalRow["ຈຳນວນລາງວັນ Sokxay"])}</td>
                      <td className={TD + " bg-green-200 font-bold"}>{fmtVal(totalRow["ໂຊກຊ້ອນໂຊກ"])}</td>
                      <td className={TD + " bg-green-200 font-bold"}>{fmtVal(totalRow["Spin"])}</td>
                      <td className={TD + " bg-green-200 font-bold"}>{fmtVal(totalRow["ລາງວັນ SCN"])}</td>
                      <td className={TD + " bg-green-200 font-bold"}>{fmtVal(totalRow["LDB_FEE_REWARD_FTR"])}</td>
                      <td className={TD + " bg-green-200 font-bold"}>{fmtVal(totalRow["FTR"])}</td>
                      <td className={TD + " bg-green-200 font-bold"}>{fmtVal(totalRow["FTR_FEE"])}</td>
                      <td className={TD + " bg-green-200 font-bold"}>{fmtVal(totalRow["LDB_FEE_DEEPLINK"])}</td>
                      <td className={TD + " bg-green-200 font-bold"}>{fmtVal(totalRow["LDB_FEE_LOTTO_SELL"])}</td>
                      <td className={TDH + " bg-green-200 font-bold"}>{fmtVal(totalRow["ລວມຫນີ້ທັງໝົດ"])}</td>
                      <td className={TDH + " bg-green-200 font-bold"}>{fmtVal(totalRow["ລວມມີທັງໝົດ"])}</td>
                      <td className={TD + " bg-green-200 font-bold"}>{fmtVal(tax5Total)}</td>
                    </tr>
                  )}

                  {/* Grand total row */}
                  {totalRow && grandDebt > 0 && (
                    <tr className="grand-total-row bg-emerald-100 font-bold">
                      <td className="px-3 py-2 text-left font-bold border border-black text-[10px] bg-emerald-100" colSpan={2}>
                        ລວມຈ່າຍທັງໝົດ (ລວມຫນີ້)
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold border border-black text-[11px] bg-emerald-100" colSpan={3}>
                        {fmt(grandDebt)}
                      </td>
                      <td className="px-3 py-2 text-left font-bold border border-black text-[10px] bg-emerald-100" colSpan={2}>
                        ລວມໄດ້ຮັບ (ລວມມີ)
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold border border-black text-[11px] bg-emerald-100" colSpan={7}>
                        {fmt(grandCred)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Signature (print only) ─────────────────────────────────────── */}
        {hasData && (
          <div className="print-signature hidden">
            <div className="sig-box">
              <div className="sig-line">ຜູ້ສະຫຼຸບ</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ກວດສອບ</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ອະນຸມັດ</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
