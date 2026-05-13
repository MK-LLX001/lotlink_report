"use client";
import React, { useState, useMemo } from "react";
import {
  RefreshCw, Search, AlertCircle, BarChart3,
  Printer, X, Filter, FileSpreadsheet,
} from "lucide-react";
import { exportBcelTax5, fetchTax5Rows, type BcelRow, type Tax5Row } from "@/lib/Exportbceltax5";

// ─── helpers ─────────────────────────────────────────────────────────────────
const isTotal = (row: BcelRow) => row["ງວດ"] === "ລວມທັງໝົດ";

// ─── print CSS ───────────────────────────────────────────────────────────────
const PRINT_CSS = `
  @media print {
    @page { size: A4 portrait; margin: 10mm 8mm 20mm 8mm; }

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
      text-shadow: none !important;
      border-radius: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-area div {
      border-radius: 0 !important;
      overflow: visible !important;
      box-shadow: none !important;
      border: none !important;
      background: #fff !important;
      background-color: #fff !important;
    }

    table {
      font-size: 7.5px !important;
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      border: 1px solid #000 !important;
      box-shadow: none !important;
      background: #fff !important;
    }

    th, td {
      padding: 2px 3px !important;
      font-size: 7.5px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      border: 1px solid #000 !important;
      color: #000 !important;
      background: #fff !important;
      background-color: #fff !important;
      box-shadow: none !important;
    }

    thead tr th,
    thead th {
      background: #d0d0d0 !important;
      background-color: #d0d0d0 !important;
      color: #000 !important;
      font-weight: bold !important;
      text-align: center !important;
      border: 1px solid #000 !important;
    }

    td.font-mono, td[class*="font-mono"] {
      font-size: 7.5px !important;
      font-family: 'Arial Narrow', Arial, sans-serif !important;
    }

    tr.total-row td {
      background: #d0d0d0 !important;
      background-color: #d0d0d0 !important;
      font-weight: bold !important;
      border: 1px solid #000 !important;
    }

    tr.grand-total-row td {
      background: #bdd7ee !important;
      background-color: #bdd7ee !important;
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

const COLS: { key: keyof BcelRow; label: string }[] = [
  { key: "ງວດ",              label: "ງວດ" },
  { key: "ລາງວັນ",           label: "ລາງວັນ" },
  { key: "ໂຊກຊ້ອນໂຊກ",       label: "ໂຊກຊ້ອນໂຊກ" },
  { key: "ຄ່າທຳນຽມ",         label: "ຄ່າທຳນຽມ" },
  { key: "ໂຊກ Spin",          label: "ໂຊກ Spin" },
  { key: "ຄ່າທຳນຽມ_SPIN",    label: "ຄ່າທຳນຽມ SPIN" },
  { key: "ລາງວັນ SCN",        label: "ລາງວັນ SCN" },
  { key: "ໂຊກຊ້ອນໂຊກ SCN",   label: "ໂຊກຊ້ອນໂຊກ SCN" },
  { key: "ຄ່າທຳນຽມ SCN",     label: "ຄ່າທຳນຽມ SCN" },
  { key: "ອາກອນ5%",           label: "ອາກອນ 5%" },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function BcelRewardSummaryPage() {
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo,   setDateTo]       = useState("");
  const [rows,      setRows]      = useState<BcelRow[]>([]);
  const [tax5Items, setTax5Items] = useState<Tax5Row[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printTime, setPrintTime] = useState("");

  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo,   setAppliedTo]   = useState("");

  // ── fetch from API ─────────────────────────────────────────────────────────
  const fetchData = async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      // Query 1: main summary rows
      const qs = new URLSearchParams({ view: "bcel_reward_summary" });
      if (from) qs.set("date_from", from);
      if (to)   qs.set("date_to",   to);
      const res  = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(Array.isArray(json.rows) ? json.rows : []);

      // Query 2: tax5 individual items (ຄືກັນກັບ col K ໃນ Excel)
      const tax5 = await fetchTax5Rows(from, to);
      setTax5Items(tax5);
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
    setRows([]); setTax5Items([]); setError(null);
  };

  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    setTimeout(() => window.print(), 100);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportBcelTax5(rows, tax5Items, appliedFrom, appliedTo);
    } catch (e) {
      alert("Export ລົ້ມເຫຼວ: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const allDataRows = useMemo(() => rows.filter(r => !isTotal(r)), [rows]);
  const totalRow    = useMemo(() => rows.find(r => isTotal(r)), [rows]);

  // helper: ກວດວ່າ row ນີ້ມີຂໍ້ມູນໃດໆ ທີ່ບໍ່ເປັນ 0
  const rowHasValue = (r: BcelRow) => {
    const numCols: (keyof BcelRow)[] = [
      "ລາງວັນ", "ໂຊກຊ້ອນໂຊກ", "ຄ່າທຳນຽມ",
      "ໂຊກ Spin", "ຄ່າທຳນຽມ_SPIN",
      "ລາງວັນ SCN", "ໂຊກຊ້ອນໂຊກ SCN", "ຄ່າທຳນຽມ SCN",
    ];
    return numCols.some(k => {
      const v = r[k];
      const n = parseFloat(String(v ?? "0").replace(/,/g, ""));
      return !isNaN(n) && n !== 0;
    });
  };

  // ຮວມ dataRows + tax5Items ໂດຍ index ແລ້ວ filter ອອກຖ້າທັງ 2 ເປັນ 0/ວ່າງ
  const dataRows = useMemo(() => {
    const maxLen = Math.max(allDataRows.length, tax5Items.length);
    return Array.from({ length: maxLen }, (_, i) => ({
      row: allDataRows[i] ?? null,
      tx:  tax5Items[i]   ?? null,
      idx: i,
    })).filter(({ row, tx }) => {
      const hasRowVal = row ? (!!row["ງວດ"] || rowHasValue(row)) : false;
      const hasTxVal  = tx  ? tx.BANK_CR !== 0 : false;
      return hasRowVal || hasTxVal;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDataRows, tax5Items]);

  const hasData   = hasSearched && dataRows.length > 0;
  const hasFilter = dateFrom || dateTo;

  // ອາກອນ5% total = sum ຂອງ tax5Items ທັງໝົດ (ຄືກັນກັບ Excel)
  const tax5Total = useMemo(
    () => tax5Items.reduce((s, t) => s + t.BANK_CR, 0),
    [tax5Items],
  );

  // ລວມຈ່າຍທັງໝົດ = ລາງວັນ + ໂຊກຊ້ອນໂຊກ + ຄ່າທຳນຽມ + ໂຊກ Spin + ຄ່າທຳນຽມ SPIN (ຈາກ totalRow)
  const parseN = (v: string | number | null | undefined) =>
    parseFloat(String(v ?? "0").replace(/,/g, "")) || 0;

  const grandTotal = useMemo(() => {
    if (!totalRow) return 0;
    return (
      parseN(totalRow["ລາງວັນ"]) +
      parseN(totalRow["ໂຊກຊ້ອນໂຊກ"]) +
      parseN(totalRow["ຄ່າທຳນຽມ"]) +
      parseN(totalRow["ໂຊກ Spin"]) +
      parseN(totalRow["ຄ່າທຳນຽມ_SPIN"])
    );
  }, [totalRow]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ຖ້າຄ່າເປັນ 0 ຫຼື "0.00" — ສະແດງຄ່າວ່າງ
  const fmtVal = (v: string | number | null | undefined): string => {
    if (v == null || v === "") return "";
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, ""));
    if (isNaN(n) || n === 0) return "";
    return fmt(n);
  };

  const TH = "px-2 py-2 text-center font-bold text-slate-700 whitespace-nowrap bg-blue-50 border border-black text-[11px]";
  const TD = "px-2 py-1.5 text-right font-mono border border-black text-[11px] whitespace-nowrap";
  const TDC = "px-2 py-1.5 text-center font-mono border border-black text-[11px]";

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">

        {/* ── Screen Header ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <BarChart3 size={18} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                ສະຫຼຸບລາງວັນ BCEL — REWARD_BCEL_STMT
              </h1>
              <p className="text-xs text-slate-400">ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນ ຈຳແນກຕາມງວດ</p>
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
                  <Printer size={13} /> ພິມ A4
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Filter ────────────────────────────────────────────────────── */}
        <div className="no-print bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຈາກ (BANK_DATE)</label>
            <input
              type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຫາ (BANK_DATE)</label>
            <input
              type="date" value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition"
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
                {loading ? "ກໍາລັງດຶງ..." : `${dataRows.length.toLocaleString()} ງວດ`}
              </span>
            )}
          </div>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Print Header: logo + print time (top-left) ───────────────── */}
        <div className="hidden print:block mb-2">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sokxay.png"
              alt="Company Logo"
              style={{ height: "48px", width: "auto", objectFit: "contain" }}
            />
            <p style={{ fontSize: "9px", color: "#888", margin: "2px 0 0 2px", whiteSpace: "nowrap" }}>
              ພິມວັນທີ: {printTime || new Date().toLocaleString("lo-LA")}
            </p>
          </div>
        </div>

        {/* ── Print title: centered ─────────────────────────────────────── */}
        <div className="hidden print:block mb-2" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: "bold" }}>
            ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
          </div>
          <div style={{ fontSize: "11px" }}>
            ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ
          </div>
          <h1 style={{ fontSize: "14px", fontWeight: "bold", margin: "4px 0 0 0" }}>
            ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນ BCEL
          </h1>
          {(appliedFrom || appliedTo) && (
            <div style={{ marginTop: "3px", fontSize: "10px", color: "#555" }}>
              ວັນທີ: {appliedFrom || ""} ຫາ {appliedTo || ""}
            </div>
          )}
        </div>

        {/* ── Table ─────────────────────────────────────────────────────── */}
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
                <span className="font-semibold text-blue-600">ສະແດງຂໍ້ມູນ</span>
              </p>
            </div>
          ) : dataRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <BarChart3 size={36} className="opacity-30" />
              <p className="text-sm">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີທີ່ເລືອກ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>ລຳດັບ</th>
                    {COLS.map(c => (
                      <th key={c.key} className={TH}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map(({ row, tx }, i) => (
                    <tr key={i} className="hover:bg-blue-50">
                      <td className={TDC}>{i + 1}</td>
                      <td className={TDC + " text-blue-700 font-semibold"}>{row?.["ງວດ"] ?? ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ລາງວັນ"])          : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ໂຊກຊ້ອນໂຊກ"])      : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ຄ່າທຳນຽມ"])        : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ໂຊກ Spin"])         : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ຄ່າທຳນຽມ_SPIN"])   : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ລາງວັນ SCN"])       : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ໂຊກຊ້ອນໂຊກ SCN"])  : ""}</td>
                      <td className={TD}>{row ? fmtVal(row["ຄ່າທຳນຽມ SCN"])    : ""}</td>
                      <td className={TD}>{tx  ? fmtVal(tx.BANK_CR)              : ""}</td>
                    </tr>
                  ))}

                  {/* Grand total row — ລວມແຕ່ລະຖັນ */}
                  {totalRow && (
                    <tr className="total-row bg-gray-200 font-bold">
                      <td className={TDC + " bg-gray-200 font-bold"} colSpan={2}>ລວມທັງໝົດ</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ລາງວັນ"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ໂຊກຊ້ອນໂຊກ"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ຄ່າທຳນຽມ"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ໂຊກ Spin"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ຄ່າທຳນຽມ_SPIN"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ລາງວັນ SCN"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ໂຊກຊ້ອນໂຊກ SCN"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(totalRow["ຄ່າທຳນຽມ SCN"])}</td>
                      <td className={TD + " bg-gray-200 font-bold"}>{fmtVal(tax5Total)}</td>
                    </tr>
                  )}

                  {/* ລວມຈ່າຍທັງໝົດ = ລາງວັນ + ໂຊກຊ້ອນໂຊກ + ຄ່າທຳນຽມ + ໂຊກ Spin + ຄ່າທຳນຽມ SPIN */}
                  {totalRow && grandTotal > 0 && (
                    <tr className="grand-total-row bg-blue-100 font-bold">
                      <td
                        className="px-3 py-2 text-left font-bold border border-black text-[11px] bg-blue-100"
                        colSpan={2}
                      >
                        ລວມຈ່າຍທັງໝົດ
                      </td>
                      <td
                        className="px-3 py-2 text-right font-mono font-bold border border-black text-[11px] bg-blue-100"
                        colSpan={9}
                      >
                        {fmt(grandTotal)}
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