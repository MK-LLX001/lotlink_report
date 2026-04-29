"use client";
import { useState, useMemo } from "react";
import { Download, Search, ChevronUp, ChevronDown, FileSpreadsheet, AlertCircle, Calendar, Printer, X, Filter, RefreshCw } from "lucide-react";
import { exportMonthExcel, type MonthRow } from "@/lib/exportExcelLib";
import { useAuth } from "@/lib/authContext";
import { logActivity } from "@/lib/activityService";

type SortKey = keyof MonthRow;
type SortDir = "asc" | "desc";

const fmt = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number | null | undefined) => n == null ? 0 : Number(n);

function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  if (sort.key !== col) return <ChevronUp size={12} className="opacity-20" />;
  return sort.dir === "asc" ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />;
}

export default function ScnLottoSellMonthPage() {
  const { user, perm } = useAuth();
  const [rows, setRows]         = useState<MonthRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [sort, setSort]         = useState<{ key: SortKey; dir: SortDir }>({ key: "MONTH", dir: "desc" });

  // Draft filter inputs
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo]     = useState("");
  const [search, setSearch]       = useState("");

  // Applied (shown in badge + print header)
  const [appliedFrom, setAppliedFrom]     = useState("");
  const [appliedTo, setAppliedTo]         = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const fetchData = async (from: string, to: string, q: string) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ view: "month" });
      if (from) params.set("month_from", from);
      if (to)   params.set("month_to",   to);
      if (q)    params.set("q",          q);
      const res  = await fetch(`/api/oracle?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(json.rows ?? []);
      setSearched(true);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  const handleApply = () => {
    setAppliedFrom(monthFrom);
    setAppliedTo(monthTo);
    setAppliedSearch(search);
    fetchData(monthFrom, monthTo, search);
    if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "lotto_search", detail: `ເດືອນ: ${monthFrom||""}~${monthTo||""} ${search||""}`.trim() });
  };

  const handleClear = () => {
    setMonthFrom(""); setMonthTo(""); setSearch("");
    setAppliedFrom(""); setAppliedTo(""); setAppliedSearch("");
    setRows([]); setSearched(false); setError(null);
  };

  const hasFilter  = monthFrom || monthTo || search;
  const hasApplied = appliedFrom || appliedTo || appliedSearch;

  const sorted = useMemo(() => {
    const filtered = rows.filter(r => {
      const month = String(r.MONTH ?? "");
      if (appliedFrom && month < appliedFrom) return false;
      if (appliedTo   && month > appliedTo)   return false;
      if (appliedSearch) {
        const q = appliedSearch.toLowerCase();
        if (!month.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, appliedFrom, appliedTo, appliedSearch]);

  const totals = useMemo(() => ({
    TT_COUNT:            sorted.reduce((s,r)=>s+fmtN(r.TT_COUNT),0),
    BILL_AMT:            sorted.reduce((s,r)=>s+fmtN(r.BILL_AMT),0),
    PAYMENT_AMT:         sorted.reduce((s,r)=>s+fmtN(r.PAYMENT_AMT),0),
    DIFF_PAYMENT:        sorted.reduce((s,r)=>s+fmtN(r.DIFF_PAYMENT),0),
    SCN_PRO_AMT:         sorted.reduce((s,r)=>s+fmtN(r.SCN_PRO_AMT),0),
    SCN_COUPON_AMT:      sorted.reduce((s,r)=>s+fmtN(r.SCN_COUPON_AMT),0),
    DISCOUNT_15_PERCENT: sorted.reduce((s,r)=>s+fmtN(r.DISCOUNT_15_PERCENT),0),
    DIFF_PRO:            sorted.reduce((s,r)=>s+fmtN(r.DIFF_PRO),0),
    COM_5_PERCENT:       sorted.reduce((s,r)=>s+fmtN(r.COM_5_PERCENT),0),
    FINAL_SCN_COM:       sorted.reduce((s,r)=>s+fmtN(r.FINAL_SCN_COM),0),
  }), [sorted]);

  const toggleSort = (key: SortKey) =>
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));

  const filterSummary = [
    appliedFrom   && `ຈາກ: ${appliedFrom}`,
    appliedTo     && `ຫາ: ${appliedTo}`,
    appliedSearch && `ຄົ້ນຫາ: "${appliedSearch}"`,
  ].filter(Boolean).join("  |  ");

  const handlePrint = () => {
    if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "lotto_print", detail: `ເດືອນ: ${appliedFrom||""}~${appliedTo||""} (${sorted.length} ລາຍການ)` });
    window.print();
  };

  const PRINT_CSS = `
    @media print {
      @page { size: A4 landscape; margin: 10mm 10mm 20mm 10mm; }

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
        font-size: 10px !important;
        width: 100% !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
        border: 1px solid #000 !important;
        box-shadow: none !important;
        background: #fff !important;
      }

      th, td {
        padding: 3px 5px !important;
        font-size: 10px !important;
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
        border: 1px solid #000 !important;
      }

      td.font-mono, td[class*="font-mono"] {
        font-size: 11px !important;
        font-family: 'Arial Narrow', Arial, sans-serif !important;
      }

      tbody tr.grandtotal-row td {
        background: #a0a0a0 !important;
        background-color: #a0a0a0 !important;
        font-weight: bold !important;
        border: 1px solid #000 !important;
      }

      col.c-month    { width: 10% !important; }
      col.c-count    { width: 8%  !important; }
      col.c-bill     { width: 9%  !important; }
      col.c-payment  { width: 9%  !important; }
      col.c-diff-pay { width: 9%  !important; }
      col.c-scnpro   { width: 9%  !important; }
      col.c-dis15    { width: 8%  !important; }
      col.c-diffpro  { width: 8%  !important; }
      col.c-coupon   { width: 8%  !important; }
      col.c-com5     { width: 8%  !important; }
      col.c-final    { width: 12% !important; }

      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
.overflow-x-auto { overflow: visible !important; }

      .print-area img {
        display: block !important;
        visibility: visible !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-signature {
        display: flex !important;
        justify-content: space-around;
        margin-top: 20mm;
        page-break-inside: avoid;
      }

      .print-signature .sig-box {
        text-align: center;
        width: 180px;
      }

      .print-signature .sig-line {
        border-top: 1px solid #000 !important;
        margin-top: 15mm;
        padding-top: 4px;
        font-size: 10px;
      }

      .print-signature .sig-role {
        font-size: 9px;
        margin-top: 2px;
      }
    }
  `;

  const TH = "px-2 py-2 text-center font-bold text-slate-700 cursor-pointer hover:text-teal-600 select-none whitespace-nowrap bg-yellow-100 border border-black text-[11px]";

  return (
    <>
      <style>{PRINT_CSS}</style>

      <div className="print-area flex flex-col gap-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
              <Calendar size={18} className="text-teal-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ລາຍງານຍອດຂາຍຫວຍ SCN - ສັງລວມເປັນເດືອນ</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { exportMonthExcel(sorted); if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "lotto_export", detail: `ເດືອນ: ${appliedFrom||""}~${appliedTo||""} (${sorted.length} ລາຍການ)` }); }} disabled={sorted.length === 0 || !perm("issue_export")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition">
              <Download size={13} /> Export Excel
            </button>
            {perm("issue_print") && (
              <button onClick={handlePrint} disabled={sorted.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-40 transition">
                <Printer size={13} /> ພິມ A4
              </button>
            )}
          </div>
        </div>

        {/* Filter Box */}
        <div className="no-print bg-teal-50 border border-teal-200 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-teal-700 font-semibold text-sm mb-3">
            <Filter size={14} />
            ຕົວກອງຂໍ້ມູນ
            <span className="text-xs font-normal text-slate-400 ml-1">— ກຳນົດຕົວກອງແລ້ວກົດ "ຄົ້ນຫາ" ຂໍ້ມູນຈຶ່ງຈະສະແດງ</span>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">ເດືອນເລີ່ມຕົ້ນ</label>
              <input type="month" value={monthFrom} onChange={e => setMonthFrom(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleApply()}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white w-44" />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">ເດືອນສິ້ນສຸດ</label>
              <input type="month" value={monthTo} onChange={e => setMonthTo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleApply()}
                className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white w-44" />
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label className="text-xs text-slate-500 font-medium">ຄົ້ນຫາ (ຂໍ້ຄວາມ)</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleApply()}
                  placeholder="ຕົວຢ່າງ: 2026-01..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <button onClick={handleApply} disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition shadow-sm">
                {loading
                  ? <><RefreshCw size={14} className="animate-spin" /> ກໍາລັງໂຫຼດ...</>
                  : <><Search size={14} /> ຄົ້ນຫາ</>}
              </button>
              {(hasFilter || searched) && (
                <button onClick={handleClear}
                  className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                  <X size={12} /> ລ້າງ
                </button>
              )}
            </div>
          </div>

          {/* Applied badge */}
          {hasApplied && !loading && (
            <div className="mt-3 flex items-center gap-2 text-xs text-teal-800 bg-teal-100 border border-teal-200 rounded-lg px-3 py-2 w-fit">
              <Filter size={11} />
              ສະແດງຂໍ້ມູນ: <strong>{filterSummary || "ທັງໝົດ"}</strong>
              &nbsp;·&nbsp; <strong>{sorted.length.toLocaleString()}</strong> ເດືອນ
            </div>
          )}
        </div>

{/* Print header: Logo + date only, no border */}
        <div className="hidden print:block mb-2">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sokxay.png"
              alt="Company Logo"
              style={{ height: "48px", width: "auto", objectFit: "contain" }}
            />
            <p style={{ fontSize: "9px", color: "#888", margin: "2px 0 0 2px", whiteSpace: "nowrap" }}>
              ພິມວັນທີ: {new Date().toLocaleString("lo-LA")}
            </p>
            {user?.displayName && (
              <p style={{ fontSize: "9px", color: "#888", margin: "1px 0 0 2px", whiteSpace: "nowrap" }}>
                ຜູ້ພິມ: {user.displayName}
              </p>
            )}
          </div>
        </div>

        {/* Print title: centered, outside table container, no border */}
        <div className="hidden print:block mb-2" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>ລາຍງານຍອດຂາຍຫວຍ SCN - ສັງລວມເປັນເດືອນ</h1>
          {filterSummary && (
            <div style={{ marginTop: "3px", fontSize: "10px", color: "#555" }}>
              ຕົວກອງ: {filterSummary}
            </div>
          )}
        </div>

        {error && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div><p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p><p className="text-xs opacity-80 mt-0.5">{error}</p></div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {!searched && !loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 no-print gap-2">
              <Calendar size={44} className="opacity-20" />
              <p className="text-sm font-medium text-slate-500">ກຳນົດຕົວກອງ ແລ້ວກົດ "ຄົ້ນຫາ" ເພື່ອດຶງຂໍ້ມູນ</p>
              <p className="text-xs opacity-60">ສາມາດເລືອກ ເດືອນເລີ່ມ–ສິ້ນສຸດ ຫຼື ຄົ້ນຫາດ້ວຍຂໍ້ຄວາມ</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" /><span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <colgroup>
                  <col className="c-month" />
                  <col className="c-count" />
                  <col className="c-bill" />
                  <col className="c-payment" />
                  <col className="c-diff-pay" />
                  <col className="c-scnpro" />
                  <col className="c-dis15" />
                  <col className="c-diffpro" />
                  <col className="c-coupon" />
                  <col className="c-com5" />
                  <col className="c-final" />
                </colgroup>
                <thead>
                  <tr className="bg-yellow-100">
                    {([
                      ["MONTH","ເດືອນ"],["TT_COUNT","ຈຳນວນລາຍການ"],["BILL_AMT","ຍອດໃບບິນ"],
                      ["PAYMENT_AMT","ຍອດຊຳລະ"],["DIFF_PAYMENT","ສ່ວນຕ່າງຍອດຊໍາລະ"],
                      ["SCN_PRO_AMT","ສ່ວນຫຼຸດ SCN"],["DISCOUNT_15_PERCENT","ສ່ວນຫຼຸດ 15%"],
                      ["DIFF_PRO","ສ່ວນຕ່າງສ່ວນຫຼຸດ"],["SCN_COUPON_AMT","ຄູປອງ SCN"],
                      ["COM_5_PERCENT","5% SCN"],["FINAL_SCN_COM","ເງີນທີ່ SCN ຈະໄດ້ຮັບ"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th key={key} onClick={() => toggleSort(key)} className={TH}>
                        <span className="flex items-center justify-center gap-1">{label}<SortIcon col={key} sort={sort} /></span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-16 text-slate-400">
                      <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-30" /><p>ບໍ່ມີຂໍ້ມູນ</p>
                    </td></tr>
                  ) : (
                    <>
                      {sorted.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-300">
                          <td className="px-2 py-1.5 text-center font-mono text-teal-700 font-semibold border border-black">{r.MONTH}</td>
                          <td className="px-2 py-1.5 text-right font-mono border border-black">{fmtN(r.TT_COUNT).toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.BILL_AMT)}</td>
                          <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.PAYMENT_AMT)}</td>
                          <td className={`px-2 py-1.5 text-right font-mono border border-black ${fmtN(r.DIFF_PAYMENT)<0?"text-red-600":"text-emerald-600"}`}>{fmt(r.DIFF_PAYMENT)}</td>
                          <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.SCN_PRO_AMT)}</td>
                          <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.DISCOUNT_15_PERCENT)}</td>
                          <td className={`px-2 py-1.5 text-right font-mono border border-black ${fmtN(r.DIFF_PRO)<0?"text-red-600":"text-emerald-600"}`}>{fmt(r.DIFF_PRO)}</td>
                          <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.SCN_COUPON_AMT)}</td>
                          <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.COM_5_PERCENT)}</td>
                          <td className="px-2 py-1.5 text-right font-mono font-semibold text-blue-700 border border-black">{fmt(r.FINAL_SCN_COM)}</td>
                        </tr>
                      ))}
                      {/* Grand total */}
                      <tr className="grandtotal-row bg-gray-400 font-bold text-sm">
                        <td className="px-2 py-2 border border-black text-xs">{sorted.length} ເດືອນ</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{totals.TT_COUNT.toLocaleString()}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(totals.BILL_AMT)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(totals.PAYMENT_AMT)}</td>
                        <td className={`px-2 py-2 text-right font-mono border border-black ${totals.DIFF_PAYMENT<0?"text-red-600":"text-emerald-600"}`}>{fmt(totals.DIFF_PAYMENT)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(totals.SCN_PRO_AMT)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(totals.DISCOUNT_15_PERCENT)}</td>
                        <td className={`px-2 py-2 text-right font-mono border border-black ${totals.DIFF_PRO<0?"text-red-600":"text-emerald-600"}`}>{fmt(totals.DIFF_PRO)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(totals.SCN_COUPON_AMT)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(totals.COM_5_PERCENT)}</td>
                        <td className="px-2 py-2 text-right font-mono text-blue-700 border border-black">{fmt(totals.FINAL_SCN_COM)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Signature section — hidden on screen, visible on print */}
        {searched && sorted.length > 0 && (
          <div className="print-signature hidden">
            <div className="sig-box">
              <div className="sig-line">ອຳນວຍການ ບໍລິສັດ <br /> Sokxay One Plus E-commerce</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ຈັດການບັນຊີ <br /> ບໍລິສັດ ຫວຍ</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
            <div className="sig-box">
              <div className="sig-line">IT ບໍລິສັດ <br /> Sokxay One Plus E-commerce</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ສັງລວມ</div>
              <div className="sig-role">( .............................................. )</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}