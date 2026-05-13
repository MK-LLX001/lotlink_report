"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  RefreshCw, Search, ChevronUp, ChevronDown,
  AlertCircle, BarChart3, Printer, X, Filter, Banknote, UserX,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { logActivity } from "@/lib/activityService";

interface PayoutDrawRow {
  DRAW_ID:       number;
  TOTAL_AMOUNT:  number;
  TOTAL_COUNT:   number;
  USER_NAME?:    string;
  PAYOUT_USER?:  string;
  PAYOUT_DATE?:  string;
}

type SortKey = keyof PayoutDrawRow;
type SortDir  = "asc" | "desc";

const fmt  = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtN = (n: number | null | undefined) => n == null ? 0 : Number(n);

function SortIcon({ col, sort }: { col: SortKey; sort: { key: SortKey; dir: SortDir } }) {
  if (sort.key !== col) return <ChevronUp size={12} className="opacity-20" />;
  return sort.dir === "asc"
    ? <ChevronUp size={12} className="text-blue-500" />
    : <ChevronDown size={12} className="text-blue-500" />;
}

export default function ScnPayoutDrawidPage() {
  const { user, perm } = useAuth();

  const [allDrawIds,   setAllDrawIds]   = useState<string[]>([]);
  const [loadingIds,   setLoadingIds]   = useState(true);
  const [idsError,     setIdsError]     = useState<string | null>(null);

  // ── Payout users for dropdown ─────────────────────────────────────────────
  const [payoutUsers,  setPayoutUsers]  = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [rows,        setRows]        = useState<PayoutDrawRow[]>([]);
  const [payers,      setPayers]      = useState<{ PAYOUT_USER: string; PAYOUT_DATE: string }[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError,   setRowsError]   = useState<string | null>(null);

  // ── filter state ──────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState("");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [excludeUsers,  setExcludeUsers]  = useState<string[]>([]);
  const [showUserDrop,  setShowUserDrop]  = useState(false);
  const [sort,          setSort]          = useState<{ key: SortKey; dir: SortDir }>({ key: "DRAW_ID", dir: "asc" });

  const [appliedSearch,       setAppliedSearch]       = useState("");
  const [appliedDateFrom,     setAppliedDateFrom]      = useState("");
  const [appliedDateTo,       setAppliedDateTo]        = useState("");
  const [appliedExcludeUsers, setAppliedExcludeUsers]  = useState<string[]>([]);
  const [hasSearched,         setHasSearched]          = useState(false);

  const [printTime, setPrintTime] = useState("");
  useEffect(() => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
  }, []);

  // ── close user dropdown on outside click ─────────────────────────────────
  useEffect(() => {
    if (!showUserDrop) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".user-drop-container")) setShowUserDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserDrop]);

  // ── fetch DRAW_IDs ────────────────────────────────────────────────────────
  const fetchRoundIds = async () => {
    setLoadingIds(true);
    setIdsError(null);
    try {
      const res  = await fetch("/api/oracle?view=roundids");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງ ROUNDID ລົ້ມເຫຼວ");
      const ids: string[] = (json.rows ?? [])
        .map((r: Record<string, unknown>) => String(r.ROUNDID ?? "")).filter(Boolean);
      setAllDrawIds(ids);
    } catch (e: unknown) {
      setIdsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingIds(false);
    }
  };

  // ── fetch payout users for dropdown ──────────────────────────────────────
  const fetchPayoutUsers = async () => {
    setLoadingUsers(true);
    try {
      const res  = await fetch("/api/oracle?view=payout_users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງ users ລົ້ມເຫຼວ");
      setPayoutUsers(Array.isArray(json.users) ? json.users : []);
    } catch {
      // silent — dropdown ຍັງໃຊ້ได้ຄືເດີມ
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchRoundIds();
  }, []);

  // ── fetch payout users only after date is selected ────────────────────────
  useEffect(() => {
    if (dateFrom || dateTo) {
      fetchPayoutUsers();
    } else {
      // reset dropdown when dates are cleared
      setPayoutUsers([]);
      setExcludeUsers([]);
      setShowUserDrop(false);
    }
  }, [dateFrom, dateTo]);

  // ── fetch payout rows ─────────────────────────────────────────────────────
  const fetchRows = async (dtFrom: string, dtTo: string, exclUsers: string[]) => {
    setLoadingRows(true);
    setRowsError(null);
    try {
      const qs = new URLSearchParams({ view: "payout_drawid" });
      if (dtFrom)              qs.set("date_from",    dtFrom);
      if (dtTo)                qs.set("date_to",      dtTo);
      if (exclUsers.length > 0) qs.set("exclude_user", exclUsers.join(","));
      const res  = await fetch(`/api/oracle?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ດຶງຂໍ້ມູນລົ້ມເຫຼວ");
      setRows(Array.isArray(json.rows)    ? json.rows   : []);
      setPayers(Array.isArray(json.payers) ? json.payers : []);
    } catch (e: unknown) {
      setRowsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingRows(false);
    }
  };

  const handleApplyFilter = () => {
    setAppliedSearch(search);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setAppliedExcludeUsers(excludeUsers);
    setHasSearched(true);
    setShowUserDrop(false);
    fetchRows(dateFrom, dateTo, excludeUsers);
    if (user) logActivity({
      uid: user.uid, displayName: user.displayName, email: user.email,
      action: "payout_drawid_search",
      detail: `Payout Date: ${dateFrom || ""}~${dateTo || ""} ຍົກເວັ້ນ: ${excludeUsers.join(", ") || "-"} ${search || ""}`.trim(),
    });
  };

  const clearFilters = () => {
    setSearch(""); setDateFrom(""); setDateTo(""); setExcludeUsers([]); setShowUserDrop(false);
    setAppliedSearch(""); setAppliedDateFrom(""); setAppliedDateTo("");
    setAppliedExcludeUsers([]);
    setHasSearched(false);
    setRows([]);
    setPayers([]);
  };

  // ── client-side filter + sort ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!hasSearched) return [];
    const q = appliedSearch.toLowerCase();
    const data = rows.filter(r => {
      if (q && !String(r.DRAW_ID ?? "").includes(q)) return false;
      return true;
    });
    return [...data].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv : String(av ?? "").localeCompare(String(bv ?? ""));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, appliedSearch, sort, hasSearched]);

  // ── payer list ────────────────────────────────────────────────────────────
  const payerList = useMemo(() =>
    payers.map(p => ({ user: p.PAYOUT_USER, date: p.PAYOUT_DATE })),
  [payers]);

  // ── grand totals ──────────────────────────────────────────────────────────
  const grandTotal = useMemo(() => ({
    TOTAL_COUNT:  filtered.reduce((s, r) => s + fmtN(r.TOTAL_COUNT),  0),
    TOTAL_AMOUNT: filtered.reduce((s, r) => s + fmtN(r.TOTAL_AMOUNT), 0),
  }), [filtered]);

  const toggleSort = (key: SortKey) =>
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc" }));

  const hasFilter = search || dateFrom || dateTo || excludeUsers.length > 0;

  const filterSummary = [
    appliedDateFrom             && `ວັນທີ ຈາກ: ${appliedDateFrom}`,
    appliedDateTo               && `ວັນທີ ຫາ: ${appliedDateTo}`,
    appliedExcludeUsers.length > 0 && `ຍົກເວັ້ນ user: ${appliedExcludeUsers.map(u => `"${u}"`).join(", ")}`,
    appliedSearch               && `ຄົ້ນຫາ: "${appliedSearch}"`,
  ].filter(Boolean).join("  |  ");

  const handlePrint = () => {
    setPrintTime(new Date().toLocaleString("lo-LA"));
    if (user) logActivity({
      uid: user.uid, displayName: user.displayName, email: user.email,
      action: "payout_drawid_print",
      detail: `Payout: ${appliedDateFrom || ""}~${appliedDateTo || ""} (${filtered.length} ງວດ) ຍົກເວັ້ນ: ${appliedExcludeUsers.join(", ") || "-"}`,
    });
    window.print();
  };

  // ── print CSS ─────────────────────────────────────────────────────────────
  // FIX 3: ລຶບ background ທັງໝົດ, ໃຫ້ຂາວສະອາດ
  // FIX 2: payout block ບໍ່ມີ border ຕາລາງ, ຊິດຊ້າຍ
  const PRINT_CSS = `
    @media print {
      @page {
        size: A4 portrait;
        margin: 15mm 15mm 20mm 15mm;
        background: #fff !important;
      }
      @page {
        @bottom-center {
          content: "ໜ້າ " counter(page) " / " counter(pages);
          font-size: 9px;
          font-family: 'Phetsarath OT', 'Phetsarath', sans-serif;
          color: #000;
        }
      }

      /* ── ລຶບ background ທັງໝົດ ── */
      html, body {
        background: #fff !important;
        background-color: #fff !important;
        background-image: none !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body * { visibility: hidden; }
      .print-area, .print-area * { visibility: visible; }
      .print-area {
        position: absolute;
        top: 0; left: 0;
        width: 100%;
        overflow: visible;
        padding: 0;
        box-sizing: border-box;
        background: #fff !important;
        background-color: #fff !important;
        background-image: none !important;
      }
      .no-print { display: none !important; }

      * {
        font-family: 'Phetsarath OT', 'Phetsarath', sans-serif !important;
        color: #000 !important;
        box-shadow: none !important;
        text-shadow: none !important;
        border-radius: 0 !important;
        background-image: none !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* ── force white bg on all divs ── */
      .print-area div,
      .print-area section,
      .print-area article {
        border-radius: 0 !important;
        overflow: visible !important;
        box-shadow: none !important;
        background: #fff !important;
        background-color: #fff !important;
        background-image: none !important;
      }

      table {
        font-size: 10px !important;
        width: 100% !important;
        border-collapse: collapse !important;
        border: 1px solid #000 !important;
        box-shadow: none !important;
        background: #fff !important;
        background-color: #fff !important;
      }
      th, td {
        padding: 4px 6px !important;
        font-size: 10px !important;
        white-space: nowrap !important;
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
        text-align: center !important;
        border: 1px solid #000 !important;
      }
      tbody tr.grandtotal-row td {
        background: #d0d0d0 !important;
        background-color: #d0d0d0 !important;
        font-weight: bold !important;
        border: 1px solid #000 !important;
      }
      tbody tr.tax-row td {
        background: #fff !important;
        background-color: #fff !important;
        border: 1px solid #000 !important;
      }
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; }
      .overflow-x-auto { overflow: visible !important; }

      /* ── signature ── */
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

      /* ── print top info ── */
      .print-top-info {
        display: flex !important;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 4px;
        font-size: 10px;
        background: #fff !important;
        background-color: #fff !important;
      }
      .print-top-info .printer-info {
        text-align: left;
        font-size: 9px;
        color: #333 !important;
      }

      /* ── FIX 2: payout block — ບໍ່ມີ border, ຊິດຊ້າຍ ── */
      .payout-user-block {
        display: block !important;
        margin-top: 8mm !important;
        margin-left: 0 !important;
        page-break-inside: avoid !important;
        border: none !important;
        background: #fff !important;
        background-color: #fff !important;
        background-image: none !important;
      }
      .payout-user-block table {
        width: auto !important;
        min-width: 200px !important;
        border-collapse: collapse !important;
        border: none !important;
        font-size: 10px !important;
        margin-left: 0 !important;
      }
      .payout-user-block th,
      .payout-user-block td {
        border: none !important;
        box-shadow: none !important;
        padding: 3px 12px 3px 0 !important;
        background: #fff !important;
        background-color: #fff !important;
        text-align: left !important;
      }
      .payout-user-block thead th {
        background: #fff !important;
        background-color: #fff !important;
        font-weight: bold !important;
        border: none !important;
      }
      .payout-user-block-title {
        font-weight: bold !important;
        font-size: 11px !important;
        margin-bottom: 4px !important;
      }
    }
  `;

  const TH = "px-3 py-2 text-center font-bold text-slate-700 cursor-pointer hover:text-blue-600 select-none whitespace-nowrap bg-blue-50 border border-black text-[11px]";

  const printTitle1 = "ລາຍທະລະນັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ";
  const printTitle2 = "ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນາຖາວອນ";
  const printTitle3 = "ໃບສະຫຼຸບລາຍງານຈ່າຍພຸດທໍາຍ ປະຈຳງວດທີ";

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="print-area flex flex-col gap-4">

        {/* ── Screen header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Banknote size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">ລາຍງານ ການຈ່າຍເງິນ - ສັງລວມຕາມງວດ (LOTLINK_PAYOUT)</h1>
              <p className="text-xs text-slate-400">APP_V_SCN_PAYOUT_DRAWID</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchRoundIds}
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

        {/* ── Filter box ── */}
        <div className="no-print bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-blue-700 font-semibold text-sm w-full mb-1">
            <Filter size={14} /> ຕົວກອງຂໍ້ມູນ
          </div>

          {/* Date range */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຈ່າຍ ຈາກ</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 font-medium">ວັນທີ ຈ່າຍ ຫາ</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>

          {/* Exclude user — multi-select checkbox dropdown ── */}
          <div className="flex flex-col gap-1">
            <label className={`text-xs font-medium flex items-center gap-1 ${dateFrom || dateTo ? "text-slate-500" : "text-slate-300"}`}>
              <UserX size={12} className={dateFrom || dateTo ? "text-red-400" : "text-slate-300"} /> ຍົກເວັ້ນ User
              {!(dateFrom || dateTo) && (
                <span className="text-[10px] text-slate-400 italic">(ເລືອກວັນທີກ່ອນ)</span>
              )}
            </label>
            <div className="relative w-56 user-drop-container">
              {/* trigger button */}
              <button
                type="button"
                disabled={!(dateFrom || dateTo) || loadingUsers}
                onClick={() => setShowUserDrop(v => !v)}
                className={`w-full flex items-center gap-2 pl-3 pr-8 py-2 text-sm rounded-lg border text-left transition
                  ${dateFrom || dateTo
                    ? "border-red-300 bg-white text-slate-700 hover:border-red-400"
                    : "border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed"
                  } disabled:opacity-60`}
              >
                <UserX size={13} className={dateFrom || dateTo ? "text-red-400 shrink-0" : "text-slate-300 shrink-0"} />
                <span className="truncate flex-1">
                  {!(dateFrom || dateTo)
                    ? "— ເລືອກວັນທີກ່ອນ —"
                    : loadingUsers
                      ? "ກຳລັງໂຫຼດ..."
                      : excludeUsers.length === 0
                        ? "— ບໍ່ຍົກເວັ້ນ —"
                        : excludeUsers.length === 1
                          ? excludeUsers[0]
                          : `${excludeUsers.length} users`
                  }
                </span>
                <ChevronDown size={13} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${dateFrom || dateTo ? "text-slate-400" : "text-slate-300"}`} />
              </button>

              {/* dropdown panel */}
              {showUserDrop && (dateFrom || dateTo) && !loadingUsers && (
                <div className="absolute z-50 top-full mt-1 left-0 w-full bg-white border border-red-200 rounded-lg shadow-lg overflow-hidden">
                  {/* header: select-all / clear */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-red-50 border-b border-red-100">
                    <button
                      type="button"
                      onClick={() => setExcludeUsers(payoutUsers)}
                      className="text-[11px] text-red-600 hover:underline font-medium"
                    >ເລືອກທັງໝົດ</button>
                    <button
                      type="button"
                      onClick={() => setExcludeUsers([])}
                      className="text-[11px] text-slate-500 hover:underline"
                    >ລ້າງ</button>
                  </div>
                  {/* checkbox list */}
                  <div className="max-h-48 overflow-y-auto">
                    {payoutUsers.length === 0
                      ? <p className="px-3 py-2 text-xs text-slate-400 italic">ບໍ່ມີ user</p>
                      : payoutUsers.map(u => (
                          <label key={u} className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={excludeUsers.includes(u)}
                              onChange={e => setExcludeUsers(prev =>
                                e.target.checked ? [...prev, u] : prev.filter(x => x !== u)
                              )}
                              className="accent-red-500 w-3.5 h-3.5 shrink-0"
                            />
                            <span className="truncate">{u}</span>
                          </label>
                        ))
                    }
                  </div>
                </div>
              )}
            </div>
            {/* selected tags */}
            {excludeUsers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1 max-w-56">
                {excludeUsers.map(u => (
                  <span key={u} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-[11px] rounded-full">
                    {u}
                    <button type="button" onClick={() => setExcludeUsers(prev => prev.filter(x => x !== u))}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Search DRAW_ID */}
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-xs text-slate-500 font-medium">ຄົ້ນຫາ DRAW_ID</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleApplyFilter()}
                placeholder="ຄົ້ນຫາ..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button onClick={handleApplyFilter} disabled={loadingIds || loadingRows}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition">
              {loadingRows
                ? <><RefreshCw size={13} className="animate-spin" /> ກຳລັງໂຫຼດ...</>
                : <><Search size={13} /> ສະແດງຂໍ້ມູນ</>}
            </button>
            {(hasFilter || hasSearched) && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                <X size={12} /> ລ້າງ
              </button>
            )}
            <span className="text-xs text-slate-500 bg-white border border-black rounded-lg px-2.5 py-2">
              {loadingIds ? "ກໍາລັງໂຫຼດງວດ..." : loadingRows ? "ກໍາລັງດຶງ..." : hasSearched ? `${filtered.length.toLocaleString()} ງວດ` : `${allDrawIds.length.toLocaleString()} ງວດ`}
            </span>
          </div>
        </div>

        {/* ── Print: top info ── */}
        <div className="hidden print:block print-top-info">
          <div className="printer-info">
            {user?.displayName && <div>ຜູ້ພິມ: <strong>{user.displayName}</strong></div>}
            <div>ວັນ-ເວລາພິມ: {printTime}</div>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: "13px", fontWeight: "bold" }}>{printTitle1}</div>
            <div style={{ fontSize: "12px" }}>{printTitle2}</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>{printTitle3}</div>
            {(appliedDateFrom || appliedDateTo) && (
              <div style={{ fontSize: "10px", color: "#555", marginTop: "2px" }}>
                ວັນທີ: {appliedDateFrom || ""} ຫາ {appliedDateTo || ""}
              </div>
            )}
          </div>
          <div style={{ width: "120px" }} />
        </div>

        {/* Errors */}
        {(idsError || rowsError) && (
          <div className="no-print flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">ເຊື່ອມຕໍ່ Oracle ລົ້ມເຫຼວ</p>
              <p className="text-xs opacity-80 mt-0.5">{idsError ?? rowsError}</p>
            </div>
          </div>
        )}

        {/* ── Table ── */}
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
              <BarChart3 size={36} className="opacity-30" />
              <p className="text-sm">ເລືອກວັນທີ ແລ້ວກົດ <span className="font-semibold text-blue-600">ສະແດງຂໍ້ມູນ</span></p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort("DRAW_ID")} className={TH}>
                      <span className="flex items-center justify-center gap-1">ລໍາດັບ</span>
                    </th>
                    <th onClick={() => toggleSort("DRAW_ID")} className={TH}>
                      <span className="flex items-center justify-center gap-1">
                        ງວດທີ <SortIcon col="DRAW_ID" sort={sort} />
                      </span>
                    </th>
                    <th onClick={() => toggleSort("TOTAL_COUNT")} className={TH}>
                      <span className="flex items-center justify-center gap-1">
                        ຈໍານວນຍອດ<SortIcon col="TOTAL_COUNT" sort={sort} />
                      </span>
                    </th>
                    <th onClick={() => toggleSort("TOTAL_AMOUNT")} className={TH}>
                      <span className="flex items-center justify-center gap-1">
                        ລວມຍອດເງິນ<SortIcon col="TOTAL_AMOUNT" sort={sort} />
                      </span>
                    </th>
                    <th className={TH}>ອາກອນ5%ໃຫ້ໃນລະບຽບ</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-16 text-slate-400">
                      <Banknote size={32} className="mx-auto mb-2 opacity-30" />
                      <p>ບໍ່ມີຂໍ້ມູນໃນຊ່ວງທີ່ເລືອກ</p>
                    </td></tr>
                  ) : (
                    <>
                      {filtered.map((r, i) => (
                        <tr key={i} className="hover:bg-blue-50">
                          <td className="px-3 py-1.5 text-center font-mono text-slate-600 border border-black w-14">
                            {i + 1}
                          </td>
                          <td className="px-3 py-1.5 text-center font-mono text-blue-700 font-semibold border border-black">
                            {r.DRAW_ID}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono border border-black">
                            {fmtN(r.TOTAL_COUNT).toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono border border-black">
                            {fmt(r.TOTAL_AMOUNT)}
                          </td>
                          <td className="px-3 py-1.5 border border-black" />
                        </tr>
                      ))}

                      {/* ລາຍຈ່າຍຕໍ່ຈຶ່ງ */}
                      <tr className="grandtotal-row bg-gray-200 font-bold">
                        <td className="px-3 py-2 text-center border border-black" colSpan={2}>ລາຍຈ່າຍຕໍ່ຈຶ່ງ</td>
                        <td className="px-3 py-2 text-right font-mono border border-black">
                          {grandTotal.TOTAL_COUNT.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono border border-black">
                          {fmt(grandTotal.TOTAL_AMOUNT)}
                        </td>
                        <td className="px-3 py-2 border border-black" />
                      </tr>

                      {/* ອາກອນ 5% */}
                      <tr className="tax-row">
                        <td className="px-3 py-2 text-center border border-black" colSpan={3}>ອາກອນ5%</td>
                        <td className="px-3 py-2 text-right font-mono border border-black">-</td>
                        <td className="px-3 py-2 border border-black" />
                      </tr>

                      {/* ລວມລາຍຈ່າຍໃຫ້ໃນລະບຽບ */}
                      <tr className="grandtotal-row bg-gray-200 font-bold">
                        <td className="px-3 py-2 text-center border border-black" colSpan={3}>ລວມລາຍຈ່າຍໃຫ້ໃນລະບຽບ</td>
                        <td className="px-3 py-2 text-right font-mono border border-black">
                          {fmt(grandTotal.TOTAL_AMOUNT)}
                        </td>
                        <td className="px-3 py-2 border border-black" />
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Print filter summary */}
        {filterSummary && (
          <div className="hidden print:block" style={{ fontSize: "9px", color: "#666", marginTop: "2px" }}>
            ຕົວກອງ: {filterSummary}
          </div>
        )}

        {/* Signature (print only) */}
        {hasSearched && filtered.length > 0 && (
          <div className="print-signature hidden">
            <div className="sig-box"><div className="sig-line">ເຊັນຜູ້ສະຫຼຸບ</div></div>
            <div className="sig-box"><div className="sig-line">ເຊັນຜູ້ຮັບທີ 2</div></div>
            <div className="sig-box"><div className="sig-line">ເຊັນຜູ້ຮັບທີ 3</div></div>
          </div>
        )}

        {/* ── FIX 2: PAYOUT_USER block — ບໍ່ມີ border, ຊິດຊ້າຍ ── */}
        {hasSearched && filtered.length > 0 && (
          <div className="payout-user-block" style={{
            marginTop: "8mm",
            pageBreakInside: "avoid",
            marginLeft: 0,
          }}>
            <div className="payout-user-block-title" style={{
              fontWeight: "bold",
              fontSize: "12px",
              marginBottom: "6px",
              fontFamily: "'Phetsarath OT', 'Phetsarath', sans-serif",
            }}>
              ລະບົບໃຫ້ໃໝ່
            </div>
            {/* FIX 2: ໃຊ້ plain text layout — ບໍ່ມີ table border */}
            <table style={{
              borderCollapse: "collapse",
              fontSize: "10px",
              border: "none",
              fontFamily: "'Phetsarath OT', 'Phetsarath', sans-serif",
              marginLeft: 0,
            }}>
              <thead>
                <tr>
                  <th style={{
                    border: "none",
                    padding: "3px 24px 3px 0",
                    textAlign: "left",
                    fontWeight: "bold",
                    background: "transparent",
                    minWidth: "160px",
                  }}>
                    USER:
                  </th>
                  <th style={{
                    border: "none",
                    padding: "3px 0",
                    textAlign: "left",
                    fontWeight: "bold",
                    background: "transparent",
                    minWidth: "120px",
                  }}>
                    ອັນທີຄືລາຍຈ່າຍ
                  </th>
                </tr>
              </thead>
              <tbody>
                {payerList.length > 0 ? (
                  payerList.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ border: "none", padding: "2px 24px 2px 0", background: "transparent" }}>
                        {p.user}
                      </td>
                      <td style={{ border: "none", padding: "2px 0", background: "transparent" }}>
                        {p.date}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={{ border: "none", padding: "2px 24px 2px 0", color: "#999", fontStyle: "italic" }}>
                      (ລໍຖ້າ PAYOUT_USER ຈາກ Oracle)
                    </td>
                    <td style={{ border: "none", padding: "2px 0", color: "#999", fontStyle: "italic" }}>
                      (ລໍຖ້າ PAYOUT_DATE)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}