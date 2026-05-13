"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Download, RefreshCw, Search, ChevronUp, ChevronDown, FileSpreadsheet, AlertCircle, BarChart3, Printer, X, Filter } from "lucide-react";
import { exportDrawidExcel, type DrawRow } from "@/lib/exportExcelLib";
import { useAuth } from "@/lib/authContext";
import { logActivity } from "@/lib/activityService";

type SortKey = keyof DrawRow;
type SortDir = "asc" | "desc";

const fmt = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number | null | undefined) => n == null ? 0 : Number(n);

function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  if (sort.key !== col) return <ChevronUp size={12} className="opacity-20" />;
  return sort.dir === "asc" ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />;
}

function groupByMonth(rows: DrawRow[]) {
  const map = new Map<string, DrawRow[]>();
  for (const r of rows) {
    const parts = r.DRAW_DATE?.split("/");
    const key = parts?.length === 3
      ? `${parts[2]}-${String(parts[0]).padStart(2,"0")}`
      : r.DRAW_DATE?.slice(0,7) ?? "?";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

export default function ScnLottoSellDrawidPage() {
  const { user, perm } = useAuth();
  // ── dropdown options (ໂຫຼດໄວ ຈາກ roundids endpoint) ──
  const [allDrawIds, setAllDrawIds] = useState<string[]>([]);
  const [loadingIds, setLoadingIds] = useState(true);
  const [idsError,   setIdsError]   = useState<string | null>(null);

  // ── ຂໍ້ມູນຕາຕະລາງ (ໂຫຼດສະເພາະຕອນ filter) ──
  const [rows, setRows]         = useState<DrawRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError,   setRowsError]   = useState<string | null>(null);

  const [search, setSearch]   = useState("");
  const [sort, setSort]       = useState<{ key: SortKey; dir: SortDir }>({ key: "DRAW_DATE", dir: "desc" });
  const [drawFrom, setDrawFrom] = useState("");
  const [drawTo,   setDrawTo]   = useState("");

  // Applied state
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedFrom,   setAppliedFrom]   = useState("");
  const [appliedTo,     setAppliedTo]     = useState("");
  const [hasSearched,   setHasSearched]   = useState(false);

  // ── Step 1: ໂຫຼດ ROUNDID list ທັນທີ (ໄວ) ──
  const fetchRoundIds = async () => {
    setLoadingIds(true);
    setIdsError(null);
    try {
      const res  = await fetch("/api/oracle?view=roundids");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງ ROUNDID ລົ້ມເຫຼວ");
      const ids: string[] = (json.rows ?? [])
        .map((r: Record<string, unknown>) => String(r.ROUNDID ?? ""))
        .filter(Boolean);
      setAllDrawIds(ids);
    } catch (e: unknown) {
      setIdsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingIds(false);
    }
  };

  useEffect(() => { fetchRoundIds(); }, []);

  // ── Step 2: ໂຫຼດຂໍ້ມູນຕາຕະລາງ ສະເພາະຕອນກົດ "ສະແດງຂໍ້ມູນ" ──
  const fetchRows = async (from: string, to: string) => {
    setLoadingRows(true);
    setRowsError(null);
    try {
      const qs = new URLSearchParams({ view: "drawid" });
      if (from) qs.set("from", from);
      if (to)   qs.set("to",   to);
      const res  = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e: unknown) {
      setRowsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingRows(false);
    }
  };

  const handleApplyFilter = () => {
    setAppliedSearch(search);
    setAppliedFrom(drawFrom);
    setAppliedTo(drawTo);
    setHasSearched(true);
    fetchRows(drawFrom, drawTo);
    if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "lotto_search", detail: `Draw: ${drawFrom||""}~${drawTo||""} ${search||""}`.trim() });
  };

  const clearFilters = () => {
    setSearch(""); setDrawFrom(""); setDrawTo("");
    setAppliedSearch(""); setAppliedFrom(""); setAppliedTo("");
    setHasSearched(false);
    setRows([]);
  };

  // ── Client-side search filter (ທຳງານໃນ rows ທີ່ດຶງມາແລ້ວ) ──
  const filtered = useMemo(() => {
    if (!hasSearched) return [];
    const q = appliedSearch.toLowerCase();
    const data = rows.filter(r => {
      if (q && !(r.DRAWID?.toLowerCase().includes(q) || r.DRAW_DATE?.toLowerCase().includes(q))) return false;
      return true;
    });
    return [...data].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, appliedSearch, sort, hasSearched]);

  const grouped     = useMemo(() => groupByMonth(filtered), [filtered]);

  const grandTotal = useMemo(() => ({
    TT_COUNT:            filtered.reduce((s, r) => s + fmtN(r.TT_COUNT), 0),
    BILL_AMT:            filtered.reduce((s, r) => s + fmtN(r.BILL_AMT), 0),
    PAYMENT_AMT:         filtered.reduce((s, r) => s + fmtN(r.PAYMENT_AMT), 0),
    DIFF_PAYMENT:        filtered.reduce((s, r) => s + fmtN(r.DIFF_PAYMENT), 0),
    SCN_PRO_AMT:         filtered.reduce((s, r) => s + fmtN(r.SCN_PRO_AMT), 0),
    SCN_COUPON_AMT:      filtered.reduce((s, r) => s + fmtN(r.SCN_COUPON_AMT), 0),
    DISCOUNT_15_PERCENT: filtered.reduce((s, r) => s + fmtN(r.DISCOUNT_15_PERCENT), 0),
    DIFF_PRO:            filtered.reduce((s, r) => s + fmtN(r.DIFF_PRO), 0),
    COM_5_PERCENT:       filtered.reduce((s, r) => s + fmtN(r.COM_5_PERCENT), 0),
    FINAL_SCN_COM:       filtered.reduce((s, r) => s + fmtN(r.FINAL_SCN_COM), 0),
  }), [filtered]);

  const toggleSort = (key: SortKey) =>
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));

  const hasFilter = search || drawFrom || drawTo;

  const filterSummary = [
    appliedFrom && `DRAWID ຈາກ: ${appliedFrom}`,
    appliedTo   && `DRAWID ຫາ: ${appliedTo}`,
    appliedSearch && `ຄົ້ນຫາ: "${appliedSearch}"`,
  ].filter(Boolean).join("  |  ");

  const handlePrint = () => {
    if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "lotto_print", detail: `Draw: ${appliedFrom||""}~${appliedTo||""} (${filtered.length} ລາຍການ)` });
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

      tbody tr.subtotal-row td {
        background: #d0d0d0 !important;
        background-color: #d0d0d0 !important;
        font-weight: bold !important;
        border: 1px solid #000 !important;
      }

      tbody tr.grandtotal-row td {
        background: #a0a0a0 !important;
        background-color: #a0a0a0 !important;
        font-weight: bold !important;
        border: 1px solid #000 !important;
      }

      col.c-drawid   { width: 7% !important; }
      col.c-date     { width: 8% !important; }
      col.c-count    { width: 7% !important; }
      col.c-bill     { width: 9% !important; }
      col.c-payment  { width: 9% !important; }
      col.c-diff-pay { width: 9% !important; }
      col.c-scnpro   { width: 8% !important; }
      col.c-dis15    { width: 8% !important; }
      col.c-diffpro  { width: 8% !important; }
      col.c-coupon   { width: 8% !important; }
      col.c-com5     { width: 8% !important; }
      col.c-final    { width: 11% !important; }

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

  const TH = "px-2 py-2 text-center font-bold text-slate-700 cursor-pointer hover:text-violet-600 select-none whitespace-nowrap bg-yellow-100 border border-black text-[11px]";

  return (
    <>
      <style>{PRINT_CSS}</style>

      <div className="print-area flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <BarChart3 size={18} className="text-violet-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ລາຍງານຍອດຂາຍຫວຍ SCN - ສັງລວມເປັນງວດ</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchRoundIds()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-black text-slate-600 hover:bg-slate-50 transition">
              <RefreshCw size={13} className={loadingIds ? "animate-spin" : ""} /> ໂຫຼດໃໝ່
            </button>
            <button onClick={() => { exportDrawidExcel(filtered); if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "lotto_export", detail: `Draw: ${appliedFrom||""}~${appliedTo||""} (${filtered.length} ລາຍການ)` }); }} disabled={filtered.length === 0 || !perm("issue_export")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition">
              <Download size={13} /> Export Excel
            </button>
            {perm("issue_print") && (
              <button onClick={handlePrint} disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-40 transition">
                <Printer size={13} /> ພິມ A4
              </button>
            )}
          </div>
        </div>

        {/* ===== FILTER BOX ===== */}
        <div className="no-print bg-violet-50 border border-violet-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-violet-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>

          {/* Draw ID From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ງວດເລີ່ມຕົ້ນ (DRAWID)</label>
            <select
              value={drawFrom}
              onChange={e => setDrawFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white w-52 disabled:opacity-50"
              disabled={loadingIds || allDrawIds.length === 0}
            >
              <option value="">-- ທັງໝົດ --</option>
              {allDrawIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>

          {/* Draw ID To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ງວດສິ້ນສຸດ (DRAWID)</label>
            <select
              value={drawTo}
              onChange={e => setDrawTo(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white w-52 disabled:opacity-50"
              disabled={loadingIds || allDrawIds.length === 0}
            >
              <option value="">-- ທັງໝົດ --</option>
              {allDrawIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-xs text-slate-500 font-medium">ຄົ້ນຫາ</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
                placeholder="ຄົ້ນຫາ ງວດ, ວັນທີ..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={handleApplyFilter}
              disabled={loadingIds || loadingRows}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition"
            >
              {loadingRows
                ? <><RefreshCw size={13} className="animate-spin" /> ກໍາລັງໂຫຼດ...</>
                : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
            </button>
            {(hasFilter || hasSearched) && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                <X size={12} /> ລ້າງຕົວກອງ
              </button>
            )}
            <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
              {loadingIds
                ? "ກໍາລັງໂຫຼດງວດ..."
                : loadingRows
                  ? "ກໍາລັງດຶງຂໍ້ມູນ..."
                  : hasSearched
                    ? `${filtered.length.toLocaleString()} ງວດ`
                    : `ທັງໝົດ ${allDrawIds.length.toLocaleString()} ງວດ`}
            </span>
          </div>
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
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>ລາຍງານຍອດຂາຍຫວຍ SCN - ສັງລວມເປັນງວດ</h1>
          {filterSummary && (
            <div style={{ marginTop: "3px", fontSize: "10px", color: "#555" }}>
              ຕົວກອງ: {filterSummary}
            </div>
          )}
        </div>

        {(idsError || rowsError) && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{idsError ?? rowsError}</p>
            </div>
          </div>
        )}

        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loadingIds ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" /><span className="text-sm">ກໍາລັງໂຫຼດລາຍການງວດ...</span>
            </div>
          ) : loadingRows ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" /><span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
              <Search size={36} className="opacity-30" />
              <p className="text-sm">ເລືອກງວດແລ້ວກົດ <span className="font-semibold text-violet-600">ສະແດງຂໍ້ມູນ</span> ເພື່ອດຶງຂໍ້ມູນ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <colgroup>
                  <col className="c-drawid" />
                  <col className="c-date" />
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
                      ["DRAWID","ງວດ"],["DRAW_DATE","ວັນທີ"],["TT_COUNT","ຈໍານວນລາຍການ"],
                      ["BILL_AMT","ຍອດບຶນຫວຍ"],["PAYMENT_AMT","ຍອດຊຳລະ"],
                      ["DIFF_PAYMENT","ສ່ວນຕ່າງຍອດຊໍາລະ"],
                      ["SCN_PRO_AMT","ສ່ວນຫຼຸດ SCN"],
                      ["DISCOUNT_15_PERCENT","ສ່ວນຫຼຸດ 15%"],
                      ["DIFF_PRO","ສ່ວນຕ່າງສ່ວນຫຼຸດ"],["SCN_COUPON_AMT","ຄູປອງ SCN"],
                      ["COM_5_PERCENT","5% SCN"],["FINAL_SCN_COM","ຈໍານວນເງິນທີ່ SCNຈະໄດ້ຮັບ"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th key={key} onClick={() => toggleSort(key)} className={TH}>
                        <span className="flex items-center justify-center gap-1">{label}<SortIcon col={key} sort={sort} /></span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-16 text-slate-400">
                      <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-30" />
                      <p>{rows.length > 0 ? `ບໍ່ມີຂໍ້ມູນທີ່ຕົງກັບການຄົ້ນຫາ "${appliedSearch}"` : "ບໍ່ມີຂໍ້ມູນໃນຊ່ວງງວດທີ່ເລືອກ"}</p>
                    </td></tr>
                  ) : (
                    <>
                      {Array.from(grouped.entries()).map(([monthKey, gRows]) => {
                        const sub = {
                          TT_COUNT:            gRows.reduce((s,r)=>s+fmtN(r.TT_COUNT),0),
                          BILL_AMT:            gRows.reduce((s,r)=>s+fmtN(r.BILL_AMT),0),
                          PAYMENT_AMT:         gRows.reduce((s,r)=>s+fmtN(r.PAYMENT_AMT),0),
                          DIFF_PAYMENT:        gRows.reduce((s,r)=>s+fmtN(r.DIFF_PAYMENT),0),
                          SCN_PRO_AMT:         gRows.reduce((s,r)=>s+fmtN(r.SCN_PRO_AMT),0),
                          DISCOUNT_15_PERCENT: gRows.reduce((s,r)=>s+fmtN(r.DISCOUNT_15_PERCENT),0),
                          DIFF_PRO:            gRows.reduce((s,r)=>s+fmtN(r.DIFF_PRO),0),
                          SCN_COUPON_AMT:      gRows.reduce((s,r)=>s+fmtN(r.SCN_COUPON_AMT),0),
                          COM_5_PERCENT:       gRows.reduce((s,r)=>s+fmtN(r.COM_5_PERCENT),0),
                          FINAL_SCN_COM:       gRows.reduce((s,r)=>s+fmtN(r.FINAL_SCN_COM),0),
                        };
                        return (
                          <React.Fragment key={monthKey}>
                            {gRows.map((r, i) => (
                              <tr key={`${monthKey}-${i}`} className="hover:bg-slate-300">
                                <td className="px-2 py-1.5 text-center font-mono text-violet-700 font-semibold border border-black">{r.DRAWID}</td>
                                <td className="px-2 py-1.5 text-center border border-black">{r.DRAW_DATE}</td>
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
                            {/* Monthly subtotal */}
                            <tr className="subtotal-row bg-gray-200 font-bold">
                              <td className="px-2 py-1.5 text-xs text-slate-500 border border-black" colSpan={2}>ລວມ {monthKey}</td>
                              <td className="px-2 py-1.5 text-right font-mono border border-black">{sub.TT_COUNT.toLocaleString()}</td>
                              <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(sub.BILL_AMT)}</td>
                              <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(sub.PAYMENT_AMT)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border border-black ${sub.DIFF_PAYMENT<0?"text-red-600":"text-emerald-600"}`}>{fmt(sub.DIFF_PAYMENT)}</td>
                              <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(sub.SCN_PRO_AMT)}</td>
                              <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(sub.DISCOUNT_15_PERCENT)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border border-black ${sub.DIFF_PRO<0?"text-red-600":"text-emerald-600"}`}>{fmt(sub.DIFF_PRO)}</td>
                              <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(sub.SCN_COUPON_AMT)}</td>
                              <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(sub.COM_5_PERCENT)}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-blue-700 border border-black">{fmt(sub.FINAL_SCN_COM)}</td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                      {/* Grand total */}
                      <tr className="grandtotal-row bg-gray-400 font-bold text-sm">
                        <td className="px-2 py-2 border border-black text-xs" colSpan={2}>ລວມທັງໝົດ</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{grandTotal.TT_COUNT.toLocaleString()}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(grandTotal.BILL_AMT)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(grandTotal.PAYMENT_AMT)}</td>
                        <td className={`px-2 py-2 text-right font-mono border border-black ${grandTotal.DIFF_PAYMENT<0?"text-red-600":"text-emerald-600"}`}>{fmt(grandTotal.DIFF_PAYMENT)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(grandTotal.SCN_PRO_AMT)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(grandTotal.DISCOUNT_15_PERCENT)}</td>
                        <td className={`px-2 py-2 text-right font-mono border border-black ${grandTotal.DIFF_PRO<0?"text-red-600":"text-emerald-600"}`}>{fmt(grandTotal.DIFF_PRO)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(grandTotal.SCN_COUPON_AMT)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(grandTotal.COM_5_PERCENT)}</td>
                        <td className="px-2 py-2 text-right font-mono text-blue-700 border border-black">{fmt(grandTotal.FINAL_SCN_COM)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Signature section — hidden on screen, visible on print */}
        {hasSearched && filtered.length > 0 && (
          <div className="print-signature hidden">
            <div className="sig-box">
              <div className="sig-line">ອຳນວຍການ ບໍລິສັດ <br /> Sokxay One Plus E-commerce</div>
              <div className="sig-role"></div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ຈັດການບັນຊີ <br /> ບໍລິສັດ ຫວຍ</div>
              <div className="sig-role"></div>
            </div>
            <div className="sig-box">
              <div className="sig-line">IT ບໍລິສັດ <br /> Sokxay One Plus E-commerce</div>
              <div className="sig-role"></div>
            </div>
            <div className="sig-box">
              <div className="sig-line">ຜູ້ສັງລວມ</div>
              <div className="sig-role"></div>
            </div>
            
          </div>
        )}
      </div>
    </>
  );
}