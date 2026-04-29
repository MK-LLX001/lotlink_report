"use client";
import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Search, ChevronUp, ChevronDown,
  AlertCircle, Gift, ChevronLeft, ChevronRight, X, Filter,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { logActivity } from "@/lib/activityService";

interface RewardRow {
  DRAWID: number | null;
  DRAW_DATE: string;
  WIN_NUMBER: string;
  BILLNUMBER: string;
  TRANSACTION_NO: string;
  CHANNEL: string;
  OWNER: string;
  LOTLINK_REWARD: number | null;
  LOTLINK_REWARD_AFTER_TAX: number | null;
  LOTLINK_TAX_REWARD: number | null;
  TT_PAID_REAWRD: number | null;
  SOKXAY_PRO: number | null;
  SCN_PRO: number | null;
}

interface Totals {
  LOTLINK_REWARD: number;
  LOTLINK_REWARD_AFTER_TAX: number;
  LOTLINK_TAX_REWARD: number;
  TT_PAID_REAWRD: number;
  SOKXAY_PRO: number;
  SCN_PRO: number;
}

type SortKey = keyof RewardRow;
type SortDir = "asc" | "desc";

const ZERO_TOTALS: Totals = {
  LOTLINK_REWARD: 0, LOTLINK_REWARD_AFTER_TAX: 0, LOTLINK_TAX_REWARD: 0,
  TT_PAID_REAWRD: 0, SOKXAY_PRO: 0, SCN_PRO: 0,
};

const PAGE_SIZE = 100;

const fmt = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s: string | null | undefined) => { if (!s) return "-"; const d = String(s).slice(0, 10).split("-"); return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : String(s).slice(0, 10); };

function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  if (sort.key !== col) return <ChevronUp size={12} className="opacity-20" />;
  return sort.dir === "asc"
    ? <ChevronUp size={12} className="text-blue-500" />
    : <ChevronDown size={12} className="text-blue-500" />;
}

export default function ScnRewardPage() {
  const { user } = useAuth();

  const [pageRows,    setPageRows]    = useState<RewardRow[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totals,      setTotals]      = useState<Totals>(ZERO_TOTALS);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Dropdown options
  const [allDrawIds,  setAllDrawIds]  = useState<string[]>([]);
  const [allChannels, setAllChannels] = useState<string[]>([]);
  const [optsLoading, setOptsLoading] = useState(true);

  // Filter inputs
  const [search,  setSearch]  = useState("");
  const [drawId,  setDrawId]  = useState("");
  const [channel, setChannel] = useState("");
  const [owner,   setOwner]   = useState("");

  // Committed filter + pagination + sort
  const [applied, setApplied] = useState({ search: "", drawId: "", channel: "", owner: "" });
  const [page,    setPage]    = useState(1);
  const [sort,    setSort]    = useState<{ key: SortKey; dir: SortDir }>({ key: "DRAWID", dir: "desc" });

  // Load dropdown options (drawids from roundids, channels from reward)
  useEffect(() => {
    (async () => {
      setOptsLoading(true);
      try {
        const [rRes, cRes] = await Promise.all([
          fetch("/api/oracle?view=roundids"),
          fetch("/api/oracle?view=reward_channel"),
        ]);
        const rJson = await rRes.json();
        const cJson = await cRes.json();
        const ids: string[] = (rJson.rows ?? [])
          .map((r: Record<string, unknown>) => String(r.ROUNDID ?? "")).filter(Boolean);
        const channels: string[] = [...new Set<string>(
          (cJson.rows ?? []).map((r: Record<string, unknown>) => String(r.CHANNEL ?? "")).filter(Boolean)
        )].sort();
        setAllDrawIds(ids);
        setAllChannels(channels);
      } catch (e) {
        console.error(e);
      } finally {
        setOptsLoading(false);
      }
    })();
  }, []);

  const fetchPage = useCallback(async (
    filters: typeof applied, pg: number, sortState: typeof sort,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ view: "reward", page: String(pg), pageSize: String(PAGE_SIZE) });
      if (filters.drawId)  sp.set("drawid",  filters.drawId);
      if (filters.channel) sp.set("channel", filters.channel);
      if (filters.owner)   sp.set("owner",   filters.owner);
      if (filters.search)  sp.set("q",       filters.search);
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
    const f = { search, drawId, channel, owner };
    setApplied(f);
    setPage(1);
    setHasSearched(true);
    fetchPage(f, 1, sort);
    if (user) logActivity({ uid: user.uid, displayName: user.displayName, email: user.email, action: "reward_search", detail: `ຄົ້ນຫາ: ${search || drawId || channel || owner || "ທັງໝົດ"}` });
  };

  const clearFilters = () => {
    setSearch(""); setDrawId(""); setChannel(""); setOwner("");
    setApplied({ search: "", drawId: "", channel: "", owner: "" });
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilter  = search || drawId || channel || owner;
  const pageFrom   = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageTo     = Math.min(page * PAGE_SIZE, total);

  const filterSummary = [
    applied.drawId  && `ງວດ: ${applied.drawId}`,
    applied.channel && `Channel: ${applied.channel}`,
    applied.owner   && `Owner: ${applied.owner}`,
    applied.search  && `ຄົ້ນຫາ: "${applied.search}"`,
  ].filter(Boolean).join("  |  ");


  const TH        = "px-3 py-2.5 text-center font-bold text-slate-700 cursor-pointer hover:text-amber-600 select-none whitespace-nowrap bg-yellow-100 border border-black text-[11px]";
  const selectCls = "px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white w-48 disabled:opacity-50";

  return (
    <>
      <div className="print-area flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <Gift size={18} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800">ລາຍງານ ການຈ່າຍລາງວັນ ຫວຍ SCN - ລາຍລະອຽດ</h1>
            <p className="text-xs text-slate-400">APP_V_SCN_REWARD</p>
          </div>
        </div>
        <button
          onClick={() => hasSearched && fetchPage(applied, page, sort)}
          disabled={loading || !hasSearched}
          className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> ໂຫຼດໃໝ່
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-2 p-4 bg-amber-50 rounded-xl border border-amber-200 no-print">
        <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-sm w-full mb-1">
          <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
        </div>

        {/* DRAWID */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">ງວດ (DRAWID)</label>
          <select value={drawId} onChange={e => setDrawId(e.target.value)}
            className={selectCls} disabled={optsLoading}>
            <option value="">-- ທັງໝົດ --</option>
            {allDrawIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </div>

        {/* Channel */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">ຊ່ອງທາງຊຳລະ</label>
          <select value={channel} onChange={e => setChannel(e.target.value)}
            className={selectCls} disabled={optsLoading}>
            <option value="">-- ທັງໝົດ --</option>
            {allChannels.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Owner search */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-500 font-medium">Owner</label>
          <input value={owner} onChange={e => setOwner(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
            placeholder="ຊື່ Owner..."
            className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white w-40" />
        </div>

        {/* Text search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-xs text-slate-500 font-medium">ຄົ້ນຫາ</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
              placeholder="ເລກໃບ, ເລກ Transaction, ເລກລາງວັນ..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-end gap-2">
          <button onClick={handleApplyFilter} disabled={optsLoading || loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition">
            {loading
              ? <><RefreshCw size={13} className="animate-spin" /> ກໍາລັງໂຫຼດ...</>
              : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
          </button>
          {(hasFilter || hasSearched) && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
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

      {/* Error */}
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
          <h1 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>ລາຍງານ ການຈ່າຍລາງວັນ ຫວຍ SCN - ລາຍລະອຽດ</h1>
          {filterSummary && (
            <div style={{ marginTop: "3px", fontSize: "10px", color: "#555" }}>
              ຕົວກອງ: {filterSummary}
            </div>
          )}
        </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
            <p className="text-xs opacity-80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-black rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
            <RefreshCw size={20} className="animate-spin" /><span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Search size={36} className="opacity-30" />
            <p className="text-sm">ເລືອກ filter ແລ້ວກົດ <span className="font-semibold text-amber-600">ສະແດງຂໍ້ມູນ</span></p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-yellow-100">
                    {([
                      ["DRAWID", "ງວດ"], ["DRAW_DATE", "ວັນທີ"], ["WIN_NUMBER", "ເລກຖືກລາງວັນ"],
                      ["BILLNUMBER", "ເລກໃບ"], ["TRANSACTION_NO", "Transaction No"],
                      ["CHANNEL", "ຊ່ອງທາງຊຳລະ"], ["OWNER", "Owner"],
                      ["LOTLINK_REWARD", "ລາງວັນ Lotlink"], ["LOTLINK_REWARD_AFTER_TAX", "ລາງວັນ (ຫຼັງຫັກພາສີ)"],
                      ["LOTLINK_TAX_REWARD", "ພາສີ Lotlink"], ["TT_PAID_REAWRD", "ລາງວັນທີ່ຈ່າຍ"],
                      ["SOKXAY_PRO", "Sokxay Pro"], ["SCN_PRO", "SCN Pro"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th key={key} onClick={() => toggleSort(key)} className={TH}>
                        <span className="flex items-center justify-center gap-1">{label}<SortIcon col={key} sort={sort} /></span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr><td colSpan={13} className="text-center py-16 text-slate-400">
                      <Gift size={32} className="mx-auto mb-2 opacity-30" />
                      <p>ບໍ່ມີຂໍ້ມູນ</p>
                    </td></tr>
                  ) : pageRows.map((r, i) => (
                    <tr key={i} className="hover:bg-amber-50 border-b border-slate-100">
                      <td className="px-2 py-1.5 text-center font-mono text-amber-700 font-semibold border border-black">{r.DRAWID}</td>
                      <td className="px-2 py-1.5 text-center border border-black">{fmtDate(r.DRAW_DATE)}</td>
                      <td className="px-2 py-1.5 text-center font-mono font-bold text-green-700 border border-black">{r.WIN_NUMBER}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-slate-600 border border-black">{r.BILLNUMBER}</td>
                      <td className="px-2 py-1.5 text-center font-mono text-slate-500 border border-black text-[10px]">{r.TRANSACTION_NO}</td>
                      <td className="px-2 py-1.5 text-center border border-black">{r.CHANNEL}</td>
                      <td className="px-2 py-1.5 text-left border border-black">{r.OWNER}</td>
                      <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.LOTLINK_REWARD)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-emerald-700 border border-black">{fmt(r.LOTLINK_REWARD_AFTER_TAX)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-red-600 border border-black">{fmt(r.LOTLINK_TAX_REWARD)}</td>
                      <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.TT_PAID_REAWRD)}</td>
                      <td className="px-2 py-1.5 text-right font-mono border border-black">{fmt(r.SOKXAY_PRO)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold text-blue-700 border border-black">{fmt(r.SCN_PRO)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals footer */}
                {pageRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-yellow-200 font-bold text-xs">
                      <td className="px-2 py-2 border border-black text-center" colSpan={7}>
                        ລວມໜ້ານີ້ ({pageFrom.toLocaleString()}–{pageTo.toLocaleString()} / {total.toLocaleString()})
                      </td>
                      <td className="px-2 py-2 text-right font-mono border border-black">{fmt(totals.LOTLINK_REWARD)}</td>
                      <td className="px-2 py-2 text-right font-mono text-emerald-700 border border-black">{fmt(totals.LOTLINK_REWARD_AFTER_TAX)}</td>
                      <td className="px-2 py-2 text-right font-mono text-red-600 border border-black">{fmt(totals.LOTLINK_TAX_REWARD)}</td>
                      <td className="px-2 py-2 text-right font-mono border border-black">{fmt(totals.TT_PAID_REAWRD)}</td>
                      <td className="px-2 py-2 text-right font-mono border border-black">{fmt(totals.SOKXAY_PRO)}</td>
                      <td className="px-2 py-2 text-right font-mono text-blue-700 border border-black">{fmt(totals.SCN_PRO)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-slate-50">
                <span className="text-xs text-slate-500">
                  ສະແດງ {pageFrom.toLocaleString()}–{pageTo.toLocaleString()} ຈາກ {total.toLocaleString()} ລາຍການ
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg">
                    {page} / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
        {/* Signature */}
        {hasSearched && pageRows.length > 0 && (
          <div className="print-signature hidden">
            <div className="sig-box"><div className="sig-line">ຜູ້ລາຍງານ</div><div className="sig-role">( .............................................. )</div></div>
            <div className="sig-box"><div className="sig-line">ຜູ້ກວດສອບ</div><div className="sig-role">( .............................................. )</div></div>
            <div className="sig-box"><div className="sig-line">ຜູ້ອະນຸມັດ</div><div className="sig-role">( .............................................. )</div></div>
          </div>
        )}
      </div>
    </>
  );
}