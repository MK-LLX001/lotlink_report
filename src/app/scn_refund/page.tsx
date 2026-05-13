"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  RefreshCw, Search, ChevronUp, ChevronDown,
  AlertCircle, FileDown, Printer, X, Filter, RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { logActivity } from "@/lib/activityService";
import { exportBcelRefundExcel } from "@/lib/exportExcelLib";

interface RefundRow {
  TID: string | null;
  TT_TXN: number | null;
  REFUND_AMT: number | null;
}

interface Totals {
  TT_TXN: number;
  REFUND_AMT: number;
}

type SortKey = keyof RefundRow;
type SortDir = "asc" | "desc";

const ZERO_TOTALS: Totals = { TT_TXN: 0, REFUND_AMT: 0 };
const PAGE_SIZE = 100;

const fmt = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString("en-US");

function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  if (sort.key !== col) return <ChevronUp size={12} className="opacity-20" />;
  return sort.dir === "asc"
    ? <ChevronUp size={12} className="text-blue-600" />
    : <ChevronDown size={12} className="text-blue-600" />;
}

export default function ScnBcelRefundPage() {
  const { user } = useAuth();

  const [pageRows,    setPageRows]    = useState<RefundRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totals,      setTotals]      = useState<Totals>(ZERO_TOTALS);
  const [loading,     setLoading]     = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Filter inputs
  const [drawid, setDrawid] = useState("");
  const [search, setSearch] = useState("");

  // Committed filter + pagination + sort
  const [applied, setApplied] = useState({ drawid: "", search: "" });
  const [page,    setPage]    = useState(1);
  const [sort,    setSort]    = useState<{ key: SortKey; dir: SortDir }>({ key: "TID", dir: "asc" });

  const printRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (
    filters: typeof applied, pg: number, sortState: typeof sort,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({
        view: "bcel_refund",
        page: String(pg),
        pageSize: String(PAGE_SIZE),
      });
      if (filters.drawid) sp.set("tid", filters.drawid);
      if (filters.search) sp.set("q",      filters.search);
      sp.set("sortKey", sortState.key as string);
      sp.set("sortDir", sortState.dir);

      const res  = await fetch(`/api/oracle?${sp.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setPageRows(json.rows   ?? []);
      setTotal   (json.total  ?? 0);
      setTotals  (json.totals ?? ZERO_TOTALS);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasSearched) return;
    fetchPage(applied, page, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort]);

  const handleApplyFilter = () => {
    const f = { drawid, search };
    setApplied(f);
    setPage(1);
    setHasSearched(true);
    fetchPage(f, 1, sort);
    if (user) logActivity({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      action: "bcel_refund_search",
      detail: `ຄົ້ນຫາ: ${drawid || search || "ທັງໝົດ"}`,
    });
  };

  const clearFilters = () => {
    setDrawid(""); setSearch("");
    setApplied({ drawid: "", search: "" });
    setHasSearched(false);
    setPage(1);
    setPageRows([]);
    setTotal(0);
    setTotals(ZERO_TOTALS);
  };

  const toggleSort = (key: SortKey) => {
    const next: typeof sort = { key, dir: sort.key === key && sort.dir === "asc" ? "desc" : "asc" };
    setSort(next);
    setPage(1);
    if (hasSearched) fetchPage(applied, 1, next);
  };

  // Export ALL pages to Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const sp = new URLSearchParams({
        view: "bcel_refund",
        page: "1",
        pageSize: "9999",
      });
      if (applied.drawid) sp.set("tid", applied.drawid);
      if (applied.search) sp.set("q",      applied.search);
      sp.set("sortKey", sort.key as string);
      sp.set("sortDir", sort.dir);

      const res  = await fetch(`/api/oracle?${sp.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Export ລົ້ມເຫຼວ");
      exportBcelRefundExcel(json.rows ?? [], filterSummary || undefined);
      if (user) logActivity({
        uid: user.uid, displayName: user.displayName, email: user.email,
        action: "bcel_refund_export", detail: `Export Excel ${(json.rows ?? []).length} ລາຍການ`,
      });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
    if (user) logActivity({
      uid: user.uid, displayName: user.displayName, email: user.email,
      action: "bcel_refund_print", detail: `ພິມລາຍງານ ${total.toLocaleString()} ລາຍການ`,
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter  = drawid || search;
  const pageFrom   = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageTo     = Math.min(page * PAGE_SIZE, total);

  const filterSummary = [
    applied.drawid && `ງວດ: ${applied.drawid}`,
    applied.search && `ຄົ້ນຫາ: "${applied.search}"`,
  ].filter(Boolean).join("  |  ");

  const TH = "px-3 py-2.5 text-center font-bold text-slate-700 cursor-pointer hover:text-blue-600 select-none whitespace-nowrap bg-blue-100 border border-black text-[11px]";

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: fixed; inset: 0; padding: 12mm 10mm; }
          .no-print { display: none !important; }
          .hidden.print\\:block { display: block !important; }

          /* ── ຕາຕະລາງ: ຮູບແບບດຽວກັນທຸກໜ້າ ── */
          .print-area table { font-size: 9px !important; font-family: 'Phetsarath OT', 'Noto Sans Lao', sans-serif !important; border-collapse: collapse !important; width: 100% !important; }
          .print-area table th,
          .print-area table td { border: 1px solid #000 !important; padding: 3px 6px !important; }
          /* Header: Phetsarath OT ຕົວໜາ ຂະໜາດ 11 */
          .print-area table th { background-color: #fef08a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Phetsarath OT', 'Noto Sans Lao', sans-serif !important; font-size: 11px !important; font-weight: bold !important; }
          /* ຕົວເລກໃນ data rows: Arial Narrow */
          .print-area table td.num { font-family: 'Arial Narrow', Arial, sans-serif !important; font-size: 9px !important; }
          /* Footer ສຸດທ້າຍ: Phetsarath OT ຕົວໜາ ຂະໜາດ 11 */
          .print-area table tfoot td { background-color: #fef08a !important; font-family: 'Phetsarath OT', 'Noto Sans Lao', sans-serif !important; font-size: 11px !important; font-weight: bold !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-area table tfoot td.num { font-family: 'Arial Narrow', Arial, sans-serif !important; font-size: 11px !important; font-weight: bold !important; }
          .print-area table tr:nth-child(even) td { background-color: #fff !important; }

          /* ── ລຶບ border-radius ຂອງ container ── */
          .print-area .rounded-xl { border-radius: 0 !important; border: none !important; }
          .print-area .overflow-hidden { overflow: visible !important; }

          /* ── ລາຍເຊັນ ── */
          .print-signature {
            display: flex !important;
            justify-content: space-around;
            margin-top: 20mm;
            page-break-inside: avoid;
          }
          .print-signature .sig-box { text-align: center; width: 180px; }
          .print-signature .sig-line { border-top: 1px solid #000 !important; margin-top: 15mm; padding-top: 4px; font-size: 8px; width: 120px; margin-left: auto; margin-right: auto; }
          .print-signature .sig-role { font-size: 9px; margin-top: 2px; }

          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>

      <div className="print-area flex flex-col gap-4" ref={printRef}>

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <RotateCcw size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ລາຍງານ BCEL Refund ຫວຍ SCN</h1>
              <p className="text-xs text-slate-400">APP_V_SCN_BCEL_REFUND</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasSearched && pageRows.length > 0 && (
              <>
                <button
                  onClick={handleExport}
                  disabled={exporting || loading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition"
                >
                  {exporting
                    ? <><RefreshCw size={13} className="animate-spin" /> ກໍາລັງ Export...</>
                    : <><FileDown size={13} /> Export Excel</>}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition"
                >
                  <Printer size={13} /> ພິມ
                </button>
              </>
            )}
            <button
              onClick={() => hasSearched && fetchPage(applied, page, sort)}
              disabled={loading || !hasSearched}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> ໂຫຼດໃໝ່
            </button>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-wrap items-end gap-2 p-4 bg-blue-50 rounded-xl border border-blue-200 no-print">
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>

          {/* DRAWID */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ງວດ (DRAWID)</label>
            <input
              value={drawid}
              onChange={e => setDrawid(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
              placeholder="ກອງດ້ວຍ DRAWID..."
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-44"
            />
          </div>

          {/* Text search
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-xs text-slate-500 font-medium">ຄົ້ນຫາ</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
                placeholder="ຄົ້ນຫາ DRAWID..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div> */}

          {/* Buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleApplyFilter}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition"
            >
              {loading
                ? <><RefreshCw size={13} className="animate-spin" /> ກໍາລັງໂຫຼດ...</>
                : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
            </button>
            {(hasFilter || hasSearched) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
              >
                <X size={12} /> ລ້າງ
              </button>
            )}
            {hasSearched && (
              <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
                {loading ? "ກໍາລັງດຶງ..." : `${total.toLocaleString()} ລາຍການ`}
              </span>
            )}
          </div>
        </div>

        {/* ── Print header ── */}
        <div className="hidden print:block mb-2">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sokxay.png" alt="Logo" style={{ height: "48px", width: "auto", objectFit: "contain" }} />
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

        {/* ── Print title ── */}
        <div className="hidden print:block mb-2" style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>
            ລາຍງານ BCEL Refund ຫວຍ SCN
          </h1>
          {filterSummary && (
            <div style={{ marginTop: "3px", fontSize: "10px", color: "#555" }}>
              ຕົວກອງ: {filterSummary}
            </div>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
              <RefreshCw size={20} className="animate-spin" />
              <span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <Search size={36} className="opacity-30" />
              <p className="text-sm">
                ກອງຂໍ້ມູນແລ້ວກົດ <span className="font-semibold text-blue-600">ສະແດງຂໍ້ມູນ</span>
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className={TH} style={{ width: "50px" }}>
                        <span className="flex items-center justify-center gap-1">ລຳດັບ</span>
                      </th>
                      {([
                        ["TID",        "ງວດ"],
                        ["TT_TXN",     "ຈຳນວນ Transaction"],
                        ["REFUND_AMT", "ຈຳນວນເງິນ Refund (ກີບ)"],
                      ] as [SortKey, string][]).map(([key, label]) => (
                        <th key={key} onClick={() => toggleSort(key)} className={TH}>
                          <span className="flex items-center justify-center gap-1">
                            {label}
                            <SortIcon col={key} sort={sort} />
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-16 text-slate-400">
                          <RotateCcw size={32} className="mx-auto mb-2 opacity-30" />
                          <p>ບໍ່ມີຂໍ້ມູນ</p>
                        </td>
                      </tr>
                    ) : pageRows.map((r, i) => (
                      <tr key={i} className={`hover:bg-blue-50 border-b border-slate-100 ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                        <td className="px-2 py-1.5 text-center text-slate-400 border border-black text-[10px]">
                          {(pageFrom + i).toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5 text-center font-mono text-blue-700 font-semibold border border-black">
                          {r.TID ?? "-"}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono border border-black num">
                          {fmtInt(r.TT_TXN)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono font-semibold text-emerald-700 border border-black num">
                          {fmt(r.REFUND_AMT)}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* ── Totals footer ── */}
                  {pageRows.length > 0 && (
                    <tfoot>
                      <tr className="bg-blue-200 font-bold text-xs">
                        <td className="px-2 py-2 border border-black text-center" colSpan={2}>
                          ລວມໜ້ານີ້ ({pageFrom.toLocaleString()}–{pageTo.toLocaleString()} / {total.toLocaleString()})
                        </td>
                        <td className="px-2 py-2 text-right font-mono border border-black num">
                          {fmtInt(totals.TT_TXN)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-emerald-700 border border-black num">
                          {fmt(totals.REFUND_AMT)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-slate-50 no-print">
                  <span className="text-xs text-slate-500">
                    ສະແດງ {pageFrom.toLocaleString()}–{pageTo.toLocaleString()} ຈາກ {total.toLocaleString()} ລາຍການ
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
                    >
                      <ChevronUp size={14} className="rotate-[-90deg]" />
                    </button>
                    <span className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || loading}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
                    >
                      <ChevronDown size={14} className="rotate-[-90deg]" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Signature (print only) ── */}
        {hasSearched && pageRows.length > 0 && (
          <div className="print-signature hidden">
            <div className="sig-box"><div className="sig-line">ອຳນວຍການ ບໍລິສັດ <br /> Sokxay One Plus E-commerce</div><div className="sig-role"></div></div>
            <div className="sig-box"><div className="sig-line">ຜູ້ຈັດການບັນຊີ <br /> ບໍລິສັດ ຫວຍ</div><div className="sig-role"></div></div>
            <div className="sig-box"><div className="sig-line">IT ບໍລິສັດ <br /> Sokxay One Plus E-commerce</div><div className="sig-role"></div></div>
            <div className="sig-box"><div className="sig-line">ຜູ້ສັງລວມ</div><div className="sig-role"></div></div>
          </div>
        )}

      </div>
    </>
  );
}