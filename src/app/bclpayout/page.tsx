"use client";
import { useState, useCallback } from "react";
import {
  RefreshCw, Search, AlertCircle, FileSpreadsheet,
  ChevronDown, ChevronUp, Filter, X, Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { logActivity } from "@/lib/activityService";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
interface BcelStmtRow {
  BANK_DATE:       string;
  FINAL_DRAWID:    number;
  SOKXAY_REWARD:   number;
  SOKXAY_FEE:      number;
  SOKXAY_NEAR:     number;
  SOKXAY_SPIN:     number;
  SOKXAY_SPIN_FEE: number;
  SCN_REWARD:      number;
  SCN_FEE:         number;
  SCN_NEAR:        number;
  TAX_5PCT:        number;
  FTR_FREE_AMT:    number;
}

interface DailyTotal extends Omit<BcelStmtRow, "FINAL_DRAWID"> {}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n === 0 ? "-" : n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtDate = (s: string) => {
  if (!s) return "-";
  const [y, m, d] = s.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

/** "ລວມຈ່າຍທັງໝົດ" = all columns EXCEPT TAX_5PCT */
const grandTotal = (r: Omit<BcelStmtRow, "BANK_DATE" | "FINAL_DRAWID">) =>
  r.SOKXAY_REWARD + r.SOKXAY_FEE + r.SOKXAY_NEAR + r.SOKXAY_SPIN +
  r.SOKXAY_SPIN_FEE + r.SCN_REWARD + r.SCN_FEE + r.SCN_NEAR + r.FTR_FREE_AMT;

// First day / last day helpers for month picker
const firstDayOfMonth = (y: number, m: number) =>
  `${y}-${String(m).padStart(2, "0")}-01`;
const lastDayOfMonth = (y: number, m: number) => {
  const d = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Today string
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────
export default function BcelStmtReportPage() {
  const { user } = useAuth();
  const now = new Date();

  const [fromDate, setFromDate] = useState(firstDayOfMonth(now.getFullYear(), now.getMonth() + 1));
  const [toDate,   setToDate]   = useState(todayStr());

  const [rows,        setRows]        = useState<BcelStmtRow[]>([]);
  const [dailyTotals, setDailyTotals] = useState<DailyTotal[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo,   setAppliedTo]   = useState("");

  // Which dates are expanded (default: all)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleCollapse = (date: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });

  // ── Quick month selector ────────────────────────────────────────────────────
  const setMonth = (y: number, m: number) => {
    setFromDate(firstDayOfMonth(y, m));
    setToDate(lastDayOfMonth(y, m));
  };

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ view: "bcel_stmt" });
      if (from) sp.set("from", from);
      if (to)   sp.set("to",   to);
      const res  = await fetch(`/api/oracle?${sp}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(json.rows        ?? []);
      setDailyTotals(json.dailyTotals ?? []);
      setAppliedFrom(from);
      setAppliedTo(to);
      setHasSearched(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    fetchData(fromDate, toDate);
    if (user)
      logActivity({ uid: user.uid, displayName: user.displayName, email: user.email,
        action: "bcel_stmt_search", detail: `${fromDate} → ${toDate}` });
  };

  const handleClear = () => {
    setRows([]); setDailyTotals([]); setHasSearched(false); setError(null);
    setAppliedFrom(""); setAppliedTo("");
  };

  // ── Normalize BANK_DATE (oracledb may return Date object or string) ─────────
  const normDate = (v: unknown): string => {
    if (!v) return "";
    if (typeof v === "string") return v.slice(0, 10);
    if (v instanceof Date) {
      const y = v.getFullYear();
      const m = String(v.getMonth() + 1).padStart(2, "0");
      const d = String(v.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return String(v).slice(0, 10);
  };
  const normRows: BcelStmtRow[] = rows.map(r => ({ ...r, BANK_DATE: normDate(r.BANK_DATE) }));
  const normDaily: DailyTotal[] = (dailyTotals as DailyTotal[]).map(d => ({ ...d, BANK_DATE: normDate(d.BANK_DATE) }));

  // ── Group rows by date ──────────────────────────────────────────────────────
  const grouped: Record<string, BcelStmtRow[]> = {};
  for (const r of normRows) {
    if (!grouped[r.BANK_DATE]) grouped[r.BANK_DATE] = [];
    grouped[r.BANK_DATE].push(r);
  }
  const sortedDates = Object.keys(grouped).sort();
  const dailyTotalMap: Record<string, DailyTotal> = {};
  for (const d of normDaily) dailyTotalMap[d.BANK_DATE] = d;

  // ── Grand totals ────────────────────────────────────────────────────────────
  const GT = normDaily.reduce((acc, d) => {
    acc.SOKXAY_REWARD   += d.SOKXAY_REWARD;
    acc.SOKXAY_FEE      += d.SOKXAY_FEE;
    acc.SOKXAY_NEAR     += d.SOKXAY_NEAR;
    acc.SOKXAY_SPIN     += d.SOKXAY_SPIN;
    acc.SOKXAY_SPIN_FEE += d.SOKXAY_SPIN_FEE;
    acc.SCN_REWARD      += d.SCN_REWARD;
    acc.SCN_FEE         += d.SCN_FEE;
    acc.SCN_NEAR        += d.SCN_NEAR;
    acc.TAX_5PCT        += d.TAX_5PCT;
    acc.FTR_FREE_AMT    += d.FTR_FREE_AMT;
    return acc;
  }, { SOKXAY_REWARD:0, SOKXAY_FEE:0, SOKXAY_NEAR:0, SOKXAY_SPIN:0, SOKXAY_SPIN_FEE:0,
       SCN_REWARD:0, SCN_FEE:0, SCN_NEAR:0, TAX_5PCT:0, FTR_FREE_AMT:0 });

  // ── CSS shortcuts ───────────────────────────────────────────────────────────
  const TH  = "px-2 py-2 text-center font-bold text-slate-800 border border-black text-[10px] bg-yellow-100 whitespace-nowrap";
  const TD  = "px-2 py-1.5 text-right font-mono text-[11px] border border-black";
  const TDc = "px-2 py-1.5 text-center font-mono text-[11px] border border-black";
  const TFT = "px-2 py-1.5 text-right font-mono font-bold text-[11px] border border-black bg-yellow-200";

  const monthBtns = [
    { label: "ມັງກອນ", m: 1 }, { label: "ກຸມພາ",  m: 2 }, { label: "ມີນາ",   m: 3 },
    { label: "ເມສາ",   m: 4 }, { label: "ພຶດສະພາ", m: 5 }, { label: "ມິຖຸນາ", m: 6 },
    { label: "ກໍລະກົດ", m: 7 }, { label: "ສິງຫາ",  m: 8 }, { label: "ກັນຍາ",  m: 9 },
    { label: "ຕຸລາ",  m: 10 }, { label: "ພະຈິກ",  m: 11 }, { label: "ທັນວາ",  m: 12 },
  ];

  return (
    <>
      <div className="print-area flex flex-col gap-4">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <FileSpreadsheet size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນຫວຍ (BCEL)
              </h1>
              <p className="text-xs text-slate-400">REWARD_BCEL_STMT</p>
            </div>
          </div>
          <button
            onClick={() => hasSearched && fetchData(appliedFrom, appliedTo)}
            disabled={loading || !hasSearched}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> ໂຫຼດໃໝ່
          </button>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200 no-print">
          <div className="flex items-center gap-1.5 text-amber-700 font-semibold text-sm">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>

          {/* Month shortcuts */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
              <Calendar size={12} /> ເດືອນ {now.getFullYear()}:
            </span>
            {monthBtns.map(({ label, m }) => (
              <button
                key={m}
                onClick={() => setMonth(now.getFullYear(), m)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition ${
                  fromDate === firstDayOfMonth(now.getFullYear(), m)
                    ? "bg-amber-600 text-white border-amber-600"
                    : "border-amber-300 text-amber-700 hover:bg-amber-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date range + search */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">ຈາກວັນທີ</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500 font-medium">ຫາວັນທີ</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleSearch} disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition">
                {loading
                  ? <><RefreshCw size={13} className="animate-spin" /> ກໍາລັງໂຫຼດ...</>
                  : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
              </button>
              {hasSearched && (
                <button onClick={handleClear}
                  className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                  <X size={12} /> ລ້າງ
                </button>
              )}
              {hasSearched && (
                <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
                  {loading ? "ກໍາລັງດຶງ..." : `${sortedDates.length} ວັນ / ${rows.length} ງວດ`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Print header ────────────────────────────────────────────────── */}
        <div className="hidden print:block mb-2">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sokxay.png" alt="Logo" style={{ height: "48px", width: "auto", objectFit: "contain" }} />
            <p style={{ fontSize: "9px", color: "#888", margin: "2px 0 0 2px" }}>
              ພິມວັນທີ: {new Date().toLocaleString("lo-LA")}
            </p>
            {user?.displayName && (
              <p style={{ fontSize: "9px", color: "#888", margin: "1px 0 0 2px" }}>ຜູ້ພິມ: {user.displayName}</p>
            )}
          </div>
        </div>

        {/* ── Empty / Loading state ───────────────────────────────────────── */}
        {!hasSearched && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-white border border-black rounded-xl">
            <FileSpreadsheet size={36} className="opacity-30" />
            <p className="text-sm">ເລືອກຊ່ວງວັນທີ ແລ້ວກົດ <span className="font-semibold text-amber-600">ສະແດງຂໍ້ມູນ</span></p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20 gap-2 text-slate-400 bg-white border border-black rounded-xl">
            <RefreshCw size={20} className="animate-spin" /><span className="text-sm">ກໍາລັງດຶງຂໍ້ມູນ Oracle...</span>
          </div>
        )}

        {/* ── Main report table (matches Excel layout) ─────────────────────── */}
        {hasSearched && !loading && sortedDates.length > 0 && sortedDates.map(date => {
          const dayRows = grouped[date];
          const dt = dailyTotalMap[date];
          const isCollapsed = collapsed.has(date);
          let seq = 0;

          return (
            <div key={date} className="bg-white border border-black rounded-xl overflow-hidden">

              {/* Collapsible date header */}
              <div
                className="flex items-center justify-between px-4 py-2.5 bg-blue-900 text-white cursor-pointer select-none"
                onClick={() => toggleCollapse(date)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">ວັນທີ {fmtDate(date)}</span>
                  <span className="text-xs opacity-70">({dayRows.length} ງວດ)</span>
                </div>
                {dt && (
                  <div className="flex items-center gap-4 text-xs">
                    <span>ລວມຈ່າຍ: <strong>{fmt(grandTotal(dt))}</strong></span>
                    <span>ອາກອນ: <strong className="text-red-300">{fmt(dt.TAX_5PCT)}</strong></span>
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <>
                  {/* Lao gov header */}
                  <div className="text-center py-2 border-b border-slate-200">
                    <p className="text-[11px] text-slate-600">ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ</p>
                    <p className="text-[10px] text-slate-500">ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ</p>
                    <p className="text-[12px] font-semibold text-slate-800 mt-1">
                      ຕາຕາລາງສະຫຼຸບຈ່າຍລາງວັນຫວຍຂອງ (BCEL) ວັນທີ {fmtDate(date)}
                    </p>
                  </div>

                  {/* Single unified table matching Excel */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-yellow-100">
                          <th className={TH} rowSpan={2}>ລຳດັບ</th>
                          <th className={TH} rowSpan={2}>ງວດທີ</th>
                          <th className={TH} colSpan={5}>ການຈ່າຍລາງວັນແອັບ Sokxay</th>
                          <th className={TH} colSpan={3}>ການຈ່າຍລາງວັນແອັບ SCN</th>
                          <th className={TH} rowSpan={2}>ອາກອນ 5%</th>
                          <th className={TH} rowSpan={2}>FTR Free</th>
                        </tr>
                        <tr className="bg-yellow-50">
                          <th className={TH}>ລາງວັນ</th>
                          <th className={TH}>ໂຊກຊ້ອນໂຊກ</th>
                          <th className={TH}>ຄ່າທຳນຽມ</th>
                          <th className={TH}>ໂຊກ Spin</th>
                          <th className={TH}>ຄ່າທຳນຽມ Spin</th>
                          <th className={TH}>ລາງວັນ</th>
                          <th className={TH}>ໂຊກຊ້ອນໂຊກ</th>
                          <th className={TH}>ຄ່າທຳນຽມ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayRows.map((r, i) => {
                          seq++;
                          return (
                            <tr key={i} className="hover:bg-amber-50">
                              <td className={TDc}>{seq}</td>
                              <td className={`${TDc} font-semibold text-amber-700`}>{r.FINAL_DRAWID || "-"}</td>
                              <td className={TD}>{fmt(r.SOKXAY_REWARD)}</td>
                              <td className={TD}>{fmt(r.SOKXAY_NEAR)}</td>
                              <td className={TD}>{fmt(r.SOKXAY_FEE)}</td>
                              <td className={TD}>{fmt(r.SOKXAY_SPIN)}</td>
                              <td className={TD}>{fmt(r.SOKXAY_SPIN_FEE)}</td>
                              <td className={TD}>{fmt(r.SCN_REWARD)}</td>
                              <td className={TD}>{fmt(r.SCN_NEAR)}</td>
                              <td className={TD}>{fmt(r.SCN_FEE)}</td>
                              <td className={`${TD} text-red-600`}>{fmt(r.TAX_5PCT)}</td>
                              <td className={TD}>{fmt(r.FTR_FREE_AMT)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {dt && (
                        <tfoot>
                          {/* ລວມ row */}
                          <tr>
                            <td className={`${TFT} text-center`} colSpan={2}>ລວມ</td>
                            <td className={TFT}>{fmt(dt.SOKXAY_REWARD)}</td>
                            <td className={TFT}>{fmt(dt.SOKXAY_NEAR)}</td>
                            <td className={TFT}>{fmt(dt.SOKXAY_FEE)}</td>
                            <td className={TFT}>{fmt(dt.SOKXAY_SPIN)}</td>
                            <td className={TFT}>{fmt(dt.SOKXAY_SPIN_FEE)}</td>
                            <td className={TFT}>{fmt(dt.SCN_REWARD)}</td>
                            <td className={TFT}>{fmt(dt.SCN_NEAR)}</td>
                            <td className={TFT}>{fmt(dt.SCN_FEE)}</td>
                            <td className={`${TFT} text-red-600`}>{fmt(dt.TAX_5PCT)}</td>
                            <td className={TFT}>{fmt(dt.FTR_FREE_AMT)}</td>
                          </tr>
                          {/* ລວມຈ່າຍທັງໝົດ row */}
                          <tr>
                            <td className="px-2 py-2 border border-black text-center font-bold text-[11px] bg-blue-100 text-blue-900" colSpan={2}>
                              ລວມຈ່າຍທັງໝົດ
                            </td>
                            <td className="px-2 py-2 border border-black text-right font-mono font-bold text-[12px] bg-blue-100 text-blue-900" colSpan={10}>
                              {fmt(grandTotal(dt))}
                            </td>
                          </tr>
                          {/* Signature */}
                          <tr>
                            <td colSpan={6} className="px-4 py-4 border border-black text-center text-[11px] text-slate-500">
                              ຜູ້ກວດກາ: ............................................
                            </td>
                            <td colSpan={6} className="px-4 py-4 border border-black text-center text-[11px] text-slate-500">
                              ຜູ້ສະຫຼຸບ: ............................................
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* ── Multi-day summary table ──────────────────────────────────────── */}
        {hasSearched && !loading && sortedDates.length > 1 && (
          <div className="bg-white border-2 border-blue-900 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-blue-900 text-white">
              <span className="text-sm font-bold">
                ສະຫຼຸບລວມທັງໝົດ ({fmtDate(appliedFrom)} – {fmtDate(appliedTo)})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-yellow-100">
                    <th className={TH} colSpan={2}></th>
                    <th className={TH} colSpan={5}>ການຈ່າຍລາງວັນແອັບ Sokxay</th>
                    <th className={TH} colSpan={3}>ການຈ່າຍລາງວັນແອັບ SCN</th>
                    <th className={TH}>ອາກອນ 5%</th>
                    <th className={TH}>FTR Free</th>
                  </tr>
                  <tr className="bg-yellow-50">
                    <th className={TH}>ວັນທີ</th>
                    <th className={TH}>ລວມຈ່າຍ</th>
                    <th className={TH}>ລາງວັນ</th>
                    <th className={TH}>ໂຊກຊ້ອນໂຊກ</th>
                    <th className={TH}>ຄ່າທຳນຽມ</th>
                    <th className={TH}>ໂຊກ Spin</th>
                    <th className={TH}>ຄ່າທຳນຽມ Spin</th>
                    <th className={TH}>ລາງວັນ</th>
                    <th className={TH}>ໂຊກຊ້ອນໂຊກ</th>
                    <th className={TH}>ຄ່າທຳນຽມ</th>
                    <th className={TH}></th>
                    <th className={TH}></th>
                  </tr>
                </thead>
                <tbody>
                  {normDaily.map((d, i) => (
                    <tr key={i} className="hover:bg-amber-50 border-b border-slate-100">
                      <td className={`${TDc} font-semibold`}>{fmtDate(d.BANK_DATE)}</td>
                      <td className={`${TD} text-blue-800 font-bold`}>{fmt(grandTotal(d))}</td>
                      <td className={TD}>{fmt(d.SOKXAY_REWARD)}</td>
                      <td className={TD}>{fmt(d.SOKXAY_NEAR)}</td>
                      <td className={TD}>{fmt(d.SOKXAY_FEE)}</td>
                      <td className={TD}>{fmt(d.SOKXAY_SPIN)}</td>
                      <td className={TD}>{fmt(d.SOKXAY_SPIN_FEE)}</td>
                      <td className={TD}>{fmt(d.SCN_REWARD)}</td>
                      <td className={TD}>{fmt(d.SCN_NEAR)}</td>
                      <td className={TD}>{fmt(d.SCN_FEE)}</td>
                      <td className={`${TD} text-red-600`}>{fmt(d.TAX_5PCT)}</td>
                      <td className={TD}>{fmt(d.FTR_FREE_AMT)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={`${TFT} text-center`}>ລວມທັງໝົດ</td>
                    <td className={`${TFT} text-blue-900`}>{fmt(grandTotal(GT))}</td>
                    <td className={TFT}>{fmt(GT.SOKXAY_REWARD)}</td>
                    <td className={TFT}>{fmt(GT.SOKXAY_NEAR)}</td>
                    <td className={TFT}>{fmt(GT.SOKXAY_FEE)}</td>
                    <td className={TFT}>{fmt(GT.SOKXAY_SPIN)}</td>
                    <td className={TFT}>{fmt(GT.SOKXAY_SPIN_FEE)}</td>
                    <td className={TFT}>{fmt(GT.SCN_REWARD)}</td>
                    <td className={TFT}>{fmt(GT.SCN_NEAR)}</td>
                    <td className={TFT}>{fmt(GT.SCN_FEE)}</td>
                    <td className={`${TFT} text-red-600`}>{fmt(GT.TAX_5PCT)}</td>
                    <td className={TFT}>{fmt(GT.FTR_FREE_AMT)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Signature ───────────────────────────────────────────────────── */}
        {hasSearched && rows.length > 0 && (
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