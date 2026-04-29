"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  RefreshCw, Search, ChevronUp, ChevronDown, FileSpreadsheet,
  AlertCircle, Printer, X, Filter, Gift, Layers,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { logActivity } from "@/lib/activityService";

interface RewardChannelRow {
  DRAWID: number;
  DRAW_DATE: string;
  CHANNEL: string;
  TT_TXN: number;
  TT_PAID_REAWRD: number;
  LOTLINK_REWARD: number;
  LOTLINK_REWARD_AFTER_TAX: number;
  LOTLINK_TAX_REWARD: number;
  SOKXAY_PRO: number;
  SCN_PRO: number;
  DIFF_REWARD: number;
}

type SortKey = keyof RewardChannelRow;
type SortDir = "asc" | "desc";

const fmt  = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number | null | undefined) => n == null ? 0 : Number(n);
const fmtDate = (s: string | null | undefined) => { if (!s) return "-"; const d = String(s).slice(0, 10).split("-"); return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : String(s).slice(0, 10); };


function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  if (sort.key !== col) return <ChevronUp size={12} className="opacity-20" />;
  return sort.dir === "asc"
    ? <ChevronUp size={12} className="text-blue-500" />
    : <ChevronDown size={12} className="text-blue-500" />;
}

// Group by DRAWID (for subtotal rows per draw)
function groupByDraw(rows: RewardChannelRow[]) {
  const map = new Map<string, RewardChannelRow[]>();
  for (const r of rows) {
    const key = String(r.DRAWID ?? "?");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return map;
}

export default function ScnRewardDrawidChannelPage() {
  const { user, perm } = useAuth();

  const [allDrawIds,  setAllDrawIds]  = useState<string[]>([]);
  const [allChannels, setAllChannels] = useState<string[]>([]);
  const [loadingIds,  setLoadingIds]  = useState(true);
  const [idsError,    setIdsError]    = useState<string | null>(null);

  const [rows,        setRows]        = useState<RewardChannelRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError,   setRowsError]   = useState<string | null>(null);

  const [search,    setSearch]    = useState("");
  const [drawFrom,  setDrawFrom]  = useState("");
  const [drawTo,    setDrawTo]    = useState("");
  const [channel,   setChannel]   = useState("");
  const [sort,      setSort]      = useState<{ key: SortKey; dir: SortDir }>({ key: "DRAWID", dir: "desc" });

  const [appliedSearch,  setAppliedSearch]  = useState("");
  const [appliedFrom,    setAppliedFrom]    = useState("");
  const [appliedTo,      setAppliedTo]      = useState("");
  const [appliedChannel, setAppliedChannel] = useState("");
  const [hasSearched,    setHasSearched]    = useState(false);

  const fetchOptions = async () => {
    setLoadingIds(true);
    setIdsError(null);
    try {
      const [rRes, cRes] = await Promise.all([
        fetch("/api/oracle?view=roundids"),
        fetch("/api/oracle?view=reward_channel"),
      ]);
      const rJson = await rRes.json();
      const cJson = await cRes.json();
      const ids: string[] = (rJson.rows ?? [])
        .map((r: Record<string, unknown>) => String(r.ROUNDID ?? "")).filter(Boolean);
      const channels: string[] = Array.from(new Set<string>(
        (cJson.rows ?? []).map((r: Record<string, unknown>) => String(r.CHANNEL ?? "")).filter(Boolean)
      )).sort();
      setAllDrawIds(ids);
      setAllChannels(channels);
    } catch (e: unknown) {
      setIdsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingIds(false);
    }
  };

  useEffect(() => { fetchOptions(); }, []);

  const fetchRows = async (from: string, to: string, ch: string) => {
    setLoadingRows(true);
    setRowsError(null);
    try {
      const qs = new URLSearchParams({ view: "reward_channel" });
      if (from) qs.set("from",    from);
      if (to)   qs.set("to",      to);
      if (ch)   qs.set("channel", ch);
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
    setAppliedChannel(channel);
    setHasSearched(true);
    fetchRows(drawFrom, drawTo, channel);
    if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "reward_search", detail: `DRAWID: ${drawFrom || ""}~${drawTo || ""} Channel: ${channel || "ທັງໝົດ"}` });
  };

  const clearFilters = () => {
    setSearch(""); setDrawFrom(""); setDrawTo(""); setChannel("");
    setAppliedSearch(""); setAppliedFrom(""); setAppliedTo(""); setAppliedChannel("");
    setHasSearched(false);
    setRows([]);
  };

  const filtered = useMemo(() => {
    if (!hasSearched) return [];
    const q = appliedSearch.toLowerCase();
    const data = rows.filter(r => {
      if (q && !(
        String(r.DRAWID ?? "").includes(q) ||
        r.DRAW_DATE?.toLowerCase().includes(q) ||
        r.CHANNEL?.toLowerCase().includes(q)
      )) return false;
      return true;
    });
    return [...data].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, appliedSearch, sort, hasSearched]);

  const grouped = useMemo(() => groupByDraw(filtered), [filtered]);

  const grandTotal = useMemo(() => ({
    TT_TXN:                   filtered.reduce((s, r) => s + fmtN(r.TT_TXN), 0),
    TT_PAID_REAWRD:           filtered.reduce((s, r) => s + fmtN(r.TT_PAID_REAWRD), 0),
    LOTLINK_REWARD:           filtered.reduce((s, r) => s + fmtN(r.LOTLINK_REWARD), 0),
    LOTLINK_REWARD_AFTER_TAX: filtered.reduce((s, r) => s + fmtN(r.LOTLINK_REWARD_AFTER_TAX), 0),
    LOTLINK_TAX_REWARD:       filtered.reduce((s, r) => s + fmtN(r.LOTLINK_TAX_REWARD), 0),
    SOKXAY_PRO:               filtered.reduce((s, r) => s + fmtN(r.SOKXAY_PRO), 0),
    SCN_PRO:                  filtered.reduce((s, r) => s + fmtN(r.SCN_PRO), 0),
    DIFF_REWARD:              filtered.reduce((s, r) => s + fmtN(r.DIFF_REWARD), 0),
  }), [filtered]);

  const toggleSort = (key: SortKey) =>
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));

  const hasFilter = search || drawFrom || drawTo || channel;

  const filterSummary = [
    appliedFrom    && `DRAWID ຈາກ: ${appliedFrom}`,
    appliedTo      && `DRAWID ຫາ: ${appliedTo}`,
    appliedChannel && `Channel: ${appliedChannel}`,
    appliedSearch  && `ຄົ້ນຫາ: "${appliedSearch}"`,
  ].filter(Boolean).join("  |  ");

  const handlePrint = () => {
    if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "reward_print", detail: `DRAWID: ${appliedFrom || ""}~${appliedTo || ""} (${filtered.length} ລາຍການ)` });
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
        border: 1px solid #000 !important;
        color: #000 !important;
        background: #fff !important;
        background-color: #fff !important;
        box-shadow: none !important;
      }
      thead tr th, thead th {
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
      .print-signature .sig-box { text-align: center; width: 180px; }
      .print-signature .sig-line { border-top: 1px solid #000 !important; margin-top: 15mm; padding-top: 4px; font-size: 10px; }
      .print-signature .sig-role { font-size: 9px; margin-top: 2px; }
    }
  `;

  const TH = "px-2 py-2 text-center font-bold text-slate-700 cursor-pointer hover:text-purple-600 select-none whitespace-nowrap bg-yellow-100 border border-black text-[11px]";

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <Layers size={18} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ລາຍງານ ການຈ່າຍລາງວັນ SCN - ສັງລວມຕາມງວດ + Channel</h1>
              <p className="text-xs text-slate-400">APP_V_SCN_REWARD_DRAWID_CHANEL</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchOptions}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-black text-slate-600 hover:bg-slate-50 transition">
              <RefreshCw size={13} className={loadingIds ? "animate-spin" : ""} /> ໂຫຼດໃໝ່
            </button>
            {perm("issue_print") && (
              <button onClick={handlePrint} disabled={filtered.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-40 transition">
                <Printer size={13} /> ພິມ A4
              </button>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="no-print bg-purple-50 border border-purple-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-purple-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ງວດເລີ່ມຕົ້ນ</label>
            <select value={drawFrom} onChange={e => setDrawFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white w-48 disabled:opacity-50"
              disabled={loadingIds || allDrawIds.length === 0}>
              <option value="">-- ທັງໝົດ --</option>
              {allDrawIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ງວດສິ້ນສຸດ</label>
            <select value={drawTo} onChange={e => setDrawTo(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white w-48 disabled:opacity-50"
              disabled={loadingIds || allDrawIds.length === 0}>
              <option value="">-- ທັງໝົດ --</option>
              {allDrawIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ຊ່ອງທາງການຊຳລະເງິນ</label>
            <select value={channel} onChange={e => setChannel(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white w-44 disabled:opacity-50"
              disabled={loadingIds}>
              <option value="">-- ທັງໝົດ --</option>
              {allChannels.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs text-slate-500 font-medium">ຄົ້ນຫາ</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
                placeholder="ງວດ, ວັນທີ, ຊ່ອງທາງຊຳລະ..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button onClick={handleApplyFilter} disabled={loadingIds || loadingRows}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 transition">
              {loadingRows
                ? <><RefreshCw size={13} className="animate-spin" /> ກໍາລັງໂຫຼດ...</>
                : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
            </button>
            {(hasFilter || hasSearched) && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                <X size={12} /> ລ້າງ
              </button>
            )}
            <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
              {loadingIds ? "ກໍາລັງໂຫຼດ..." : loadingRows ? "ກໍາລັງດຶງ..." : hasSearched ? `${filtered.length.toLocaleString()} ລາຍການ` : `${allDrawIds.length.toLocaleString()} ງວດ`}
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
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>ລາຍງານ ການຈ່າຍລາງວັນ SCN - ສັງລວມຕາມງວດ + Channel</h1>
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

        {/* Table */}
        <div className="bg-white border border-black rounded-xl overflow-hidden">
          {loadingIds ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" /><span className="text-sm">ກໍາລັງໂຫຼດ...</span>
            </div>
          ) : loadingRows ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-400 no-print">
              <RefreshCw size={20} className="animate-spin" /><span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 no-print">
              <Search size={36} className="opacity-30" />
              <p className="text-sm">ເລືອກງວດແລ້ວກົດ <span className="font-semibold text-purple-600">ສະແດງຂໍ້ມູນ</span></p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-yellow-100">
                    {([
                      ["DRAWID", "ງວດ"], ["DRAW_DATE", "ວັນທີ"], ["CHANNEL", "ຊ່ອງທາງຊຳລະ"],
                      ["TT_TXN", "ຈໍານວນລາຍການ"],
                      ["TT_PAID_REAWRD", "ລາງວັນທີ່ຈ່າຍ"],
                      ["LOTLINK_REWARD", "ລາງວັນ Lotlink"],
                      ["LOTLINK_REWARD_AFTER_TAX", "ລາງວັນ (ຫຼັງຫັກພາສີ)"],
                      ["LOTLINK_TAX_REWARD", "ພາສີ Lotlink"],
                      ["SOKXAY_PRO", "Sokxay Pro"],
                      ["SCN_PRO", "SCN Pro"],
                      ["DIFF_REWARD", "ສ່ວນຕ່າງ Reward"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th key={key} onClick={() => toggleSort(key)} className={TH}>
                        <span className="flex items-center justify-center gap-1">{label}<SortIcon col={key} sort={sort} /></span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={11} className="text-center py-16 text-slate-400">
                      <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-30" />
                      <p>{rows.length > 0 ? `ບໍ່ມີຂໍ້ມູນທີ່ຕົງກັບ "${appliedSearch}"` : "ບໍ່ມີຂໍ້ມູນໃນຊ່ວງທີ່ເລືອກ"}</p>
                    </td></tr>
                  ) : (
                    <>
                      {Array.from(grouped.entries()).map(([drawKey, gRows]) => {
                        const sub = {
                          TT_TXN:                   gRows.reduce((s, r) => s + fmtN(r.TT_TXN), 0),
                          TT_PAID_REAWRD:           gRows.reduce((s, r) => s + fmtN(r.TT_PAID_REAWRD), 0),
                          LOTLINK_REWARD:           gRows.reduce((s, r) => s + fmtN(r.LOTLINK_REWARD), 0),
                          LOTLINK_REWARD_AFTER_TAX: gRows.reduce((s, r) => s + fmtN(r.LOTLINK_REWARD_AFTER_TAX), 0),
                          LOTLINK_TAX_REWARD:       gRows.reduce((s, r) => s + fmtN(r.LOTLINK_TAX_REWARD), 0),
                          SOKXAY_PRO:               gRows.reduce((s, r) => s + fmtN(r.SOKXAY_PRO), 0),
                          SCN_PRO:                  gRows.reduce((s, r) => s + fmtN(r.SCN_PRO), 0),
                          DIFF_REWARD:              gRows.reduce((s, r) => s + fmtN(r.DIFF_REWARD), 0),
                        };
                        return (
                          <React.Fragment key={drawKey}>
                            {gRows.map((r, i) => (
                              <tr key={`${drawKey}-${i}`} className="hover:bg-purple-50">
                                <td className="px-2 py-1.5 text-center font-mono text-purple-700 font-semibold border border-black">{r.DRAWID}</td>
                                <td className="px-2 py-1.5 text-center border border-black">{fmtDate(r.DRAW_DATE)}</td>
                                <td className="px-2 py-1.5 text-center font-semibold text-indigo-700 border border-black">{r.CHANNEL}</td>
                                <td className="px-2 py-1.5 text-right font-mono border border-black">{fmtN(r.TT_TXN).toLocaleString()}</td>
                                <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.TT_PAID_REAWRD)}</td>
                                <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.LOTLINK_REWARD)}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-emerald-700 border border-black">{fmt(r.LOTLINK_REWARD_AFTER_TAX)}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-red-600 border border-black">{fmt(r.LOTLINK_TAX_REWARD)}</td>
                                <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.SOKXAY_PRO)}</td>
                                <td className="px-2 py-1.5 text-right font-mono text-blue-700 font-semibold border border-black">{fmt(r.SCN_PRO)}</td>
                                <td className={`px-2 py-1.5 text-right font-mono border border-black ${fmtN(r.DIFF_REWARD) < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(r.DIFF_REWARD)}</td>
                              </tr>
                            ))}
                            {/* Subtotal per DRAWID */}
                            <tr className="subtotal-row bg-gray-200 font-bold">
                              <td className="px-2 py-1.5 text-xs border border-black" colSpan={3}>ລວມງວດ {drawKey}</td>
                              <td className="px-2 py-1.5 text-right font-mono border border-black">{sub.TT_TXN.toLocaleString()}</td>
                              <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(sub.TT_PAID_REAWRD)}</td>
                              <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(sub.LOTLINK_REWARD)}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-emerald-700 border border-black">{fmt(sub.LOTLINK_REWARD_AFTER_TAX)}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-red-600 border border-black">{fmt(sub.LOTLINK_TAX_REWARD)}</td>
                              <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(sub.SOKXAY_PRO)}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-blue-700 border border-black">{fmt(sub.SCN_PRO)}</td>
                              <td className={`px-2 py-1.5 text-right font-mono border border-black ${sub.DIFF_REWARD < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(sub.DIFF_REWARD)}</td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                      {/* Grand total */}
                      <tr className="grandtotal-row bg-gray-400 font-bold text-sm">
                        <td className="px-2 py-2 border border-black" colSpan={3}>ລວມທັງໝົດ</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{grandTotal.TT_TXN.toLocaleString()}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(grandTotal.TT_PAID_REAWRD)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(grandTotal.LOTLINK_REWARD)}</td>
                        <td className="px-2 py-2 text-right font-mono text-emerald-700 border border-black">{fmt(grandTotal.LOTLINK_REWARD_AFTER_TAX)}</td>
                        <td className="px-2 py-2 text-right font-mono text-red-600 border border-black">{fmt(grandTotal.LOTLINK_TAX_REWARD)}</td>
                        <td className="px-2 py-2 text-right font-mono border border-black">{fmt(grandTotal.SOKXAY_PRO)}</td>
                        <td className="px-2 py-2 text-right font-mono text-blue-700 border border-black">{fmt(grandTotal.SCN_PRO)}</td>
                        <td className={`px-2 py-2 text-right font-mono border border-black ${grandTotal.DIFF_REWARD < 0 ? "text-red-600" : "text-emerald-600"}`}>{fmt(grandTotal.DIFF_REWARD)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Signature */}
        {hasSearched && filtered.length > 0 && (
          <div className="print-signature hidden">
            <div className="sig-box"><div className="sig-line">ອຳນວຍການ ບໍລິສັດ <br /> Sokxay One Plus E-commerce</div><div className="sig-role">( .............................................. )</div></div>
            <div className="sig-box"><div className="sig-line">ຜູ້ຈັດການບັນຊີ <br /> ບໍລິສັດ ຫວຍ</div><div className="sig-role">( .............................................. )</div></div>
            <div className="sig-box"><div className="sig-line">IT ບໍລິສັດ <br /> Sokxay One Plus E-commerce</div><div className="sig-role">( .............................................. )</div></div>
            <div className="sig-box"><div className="sig-line">ຜູ້ສັງລວມ</div><div className="sig-role">( .............................................. )</div></div>
          </div>
        )}
      </div>
    </>
  );
}