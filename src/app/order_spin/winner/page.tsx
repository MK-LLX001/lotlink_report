// page.tsx
"use client";

import { useState } from "react";
import { FilterBar } from "@/components/FilterBar";
import type { FilterValues } from "@/components/FilterBar";
import { useGetWinnerSpin } from "@/app/CASES-LOTTO/hooks/hook_spin";
import * as XLSX from "xlsx";

interface WinnerEntity {
  SPINID: number;
  TXTIME: string;
  USERID: string;
  TYPE: string;
  AMOUNT: number;
  BALANCE: number;
  DRAWID: number;
  TICKET: string | null;
  SPINRESULT: string;
  WINAMOUNT: number;
  WINXREF: string;
  WINJOURNAL: string;
  WINCHANNEL: string;
  WINACCOUNT: string;
  CORERESULT: string;
}

// ── Skeleton row ────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  );
}

// ── Export to xlsx ──────────────────────────────────────────────────
function exportToExcel(data: WinnerEntity[]) {
  const rows = data.map((r) => ({
    SPINID: r.SPINID,
    TXTIME: new Date(r.TXTIME).toLocaleString("en-GB"),
    USERID: r.USERID,
    TYPE: r.TYPE,
    AMOUNT: r.AMOUNT,
    BALANCE: r.BALANCE,
    DRAWID: r.DRAWID,
    SPINRESULT: r.SPINRESULT,
    WINAMOUNT: r.WINAMOUNT,
    WINXREF: r.WINXREF,
    WINJOURNAL: r.WINJOURNAL,
    WINCHANNEL: r.WINCHANNEL,
    WINACCOUNT: r.WINACCOUNT,
    CORERESULT: r.CORERESULT,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "WinnerSpin");
  XLSX.writeFile(wb, `winner_spin_${Date.now()}.xlsx`);
}

export default function WinnerSpinPage() {
  const [amountRaw, setAmountRaw] = useState("");
  const [searchParams, setSearchParams] = useState<{
    fromDate: string;
    toDate: string;
    amount?: string;
  } | null>(null);

  const { data, isLoading, isError } = useGetWinnerSpin(searchParams);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, "");
    setAmountRaw(digits ? Number(digits).toLocaleString("en-US") : "");
  };

  const handleSearch = ({ fromDate, toDate }: FilterValues) => {
    if (!fromDate || !toDate) return;
    const rawDigits = amountRaw.replace(/,/g, "");
    setSearchParams({
      fromDate,
      toDate,
      ...(rawDigits ? { amount: rawDigits } : {}),
    });
  };

  const handleClear = () => {
    setAmountRaw("");
    setSearchParams(null);
  };

  const rows = data as WinnerEntity[] | undefined;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">
        ລາຍການຜູ້ໂຊກດີ (Winner Spin)
      </h1>

      {/* ── Filter ── */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl mb-6">
        <FilterBar
          showDateRange
          onSearch={handleSearch}
          onClear={handleClear}
          isSearching={isLoading}
          showClearButton={false}
        >
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              ຈຳນວນເງິນ (≥)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={amountRaw}
              onChange={handleAmountChange}
              placeholder="0"
              className="w-44 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-mono text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </FilterBar>
      </div>

      {/* ── Error ── */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-4">
          ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່
        </div>
      )}

      {/* ── Empty state ── */}
      {!searchParams && !isLoading && (
        <p className="text-sm text-slate-400 mt-6">
          ກະລຸນາເລືອກວັນທີ ແລະ ກົດຄົ້ນຫາ
        </p>
      )}

      {/* ── Table ── */}
      {(isLoading || rows) && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* summary + export */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm text-slate-500">
              {isLoading ? (
                <span className="inline-block h-3 w-32 rounded bg-slate-200 animate-pulse" />
              ) : (
                <>
                  ພົບ <strong className="text-slate-800">{rows?.length}</strong>{" "}
                  ລາຍການ
                </>
              )}
            </p>
            {rows && rows.length > 0 && (
              <button
                onClick={() => exportToExcel(rows)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                ⬇ Export Excel
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">SPINID</th>
                  <th className="px-4 py-3">TXTIME</th>
                  <th className="px-4 py-3">USERID</th>
                  <th className="px-4 py-3">SPINRESULT</th>
                  <th className="px-4 py-3 text-right">WINAMOUNT</th>
                  <th className="px-4 py-3">WINCHANNEL</th>
                  <th className="px-4 py-3">WINACCOUNT</th>
                  <th className="px-4 py-3">WINJOURNAL</th>
                  <th className="px-4 py-3">CORERESULT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Skeleton */}
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}

                {/* Data rows */}
                {rows?.map((row, i) => (
                  <tr key={row.SPINID} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {row.SPINID}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(row.TXTIME).toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {row.USERID}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        {row.SPINRESULT}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">
                      {row.WINAMOUNT.toLocaleString("en-US")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.WINCHANNEL}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {row.WINACCOUNT}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {row.WINJOURNAL}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          row.CORERESULT === "00"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {row.CORERESULT}
                      </span>
                    </td>
                  </tr>
                ))}

                {/* No data */}
                {!isLoading && rows?.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-8 text-center text-sm text-slate-400"
                    >
                      ບໍ່ພົບຂໍ້ມູນ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
