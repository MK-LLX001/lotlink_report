"use client";

import { useState, useEffect, useRef } from "react";
import { LDB_Reconciliation } from "@/app/LDB_reconciliation/hooks";
import { ReconTable } from "@/components/ReconTable";
import axios from "axios";
import ExportButtons from "@/lib/export_data";
import toast from "react-hot-toast";
import { getColDefs } from "@/lib/ldb_table_config";

const ACCOUNTS = [
  { value: "0302000010005221", label: "ບັນຊີຈ່າຍ",      sub: "0302000010005221" },
  { value: "0302000010005944", label: "ບັນຊີຮັບ",       sub: "0302000010005944" },
  { value: "LAK1354902360020", label: "Sokxay One Plus", sub: "LAK1354902360020" },
  { value: "LAK1354903360020", label: "SCN Easy",        sub: "LAK1354903360020" },
];

export default function Page() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [account,  setAccount]  = useState("");
  const [open,     setOpen]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [queryParams, setQueryParams] = useState<{
    dateFrom: string;
    dateTo:   string;
    account:  string;
  } | null>(null);

  const { data, isError, isSuccess, error, isFetching } = LDB_Reconciliation({
    dateFrom: queryParams?.dateFrom ?? "",
    dateTo:   queryParams?.dateTo   ?? "",
    account:  queryParams?.account  ?? "",
  });

  const errorMessage = axios.isAxiosError(error)
    ? error.code === "ECONNABORTED"
      ? "ໝົດເວລາການເຊື່ອມຕໍ່ (Timeout)"
      : error.response?.data?.error ?? error.message
    : error ? String(error) : "";

  const selectedAccount = ACCOUNTS.find((a) => a.value === account);
  const rows = ((data as any)?.data ?? []) as Record<string, unknown>[];
  const canSearch = !!dateFrom && !!dateTo;

  const searchResult = Array.isArray(data?.data)
    ? data.data
    : (data?.data?.data ?? []);

  // ── ปิด dropdown เมื่อคลิกนอก ──
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!queryParams) return;
    if (isSuccess) {
      searchResult.length > 0
        ? toast.success(`✅ ພົບ ${searchResult.length} ລາຍການ`)
        : toast("ℹ️ ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີເລືອກ", { icon: "ℹ️" });
    }
    if (isError) toast.error("❌ ເກີດຂໍ້ຜິດຜາດ: " + errorMessage);
  }, [isSuccess, isError, queryParams]);

  function handleSearch() {
    if (account === "") {
      toast.error("ກະລຸນາເລືອກ account ຫນຶ່ງ");
      return;
    }
    if (!canSearch) return;
    setQueryParams({ dateFrom, dateTo, account });
  }

  function handleReset() {
    setDateFrom("");
    setDateTo("");
    setAccount("");
    setQueryParams(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3  pl-8">
          <div className="w-1 h-8 bg-blue-600 rounded-full" />
          <div>
            <h1 className="text-xl font-semibold text-gray-800 leading-tight">
              LDB Reconciliation
            </h1>
            <p className="text-sm text-gray-400">ການກະທົບຍອດບັນຊີທະນາຄານ LDB</p>
          </div>
        </div>

        {/* ── Filter Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">

          {/* Account buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              ເລືອກບັນຊີ
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ACCOUNTS.map((acc) => (
                <button
                  key={acc.value}
                  onClick={() => setAccount(acc.value)}
                  className={`
                    flex flex-col items-start px-3 py-2.5 rounded-xl border text-left
                    transition-all duration-150 text-xl
                    ${account === acc.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }
                  `}
                >
                  <span className="font-medium leading-tight">{acc.label}</span>
                  <span className="text-[17px] mt-0.5 opacity-60 font-mono truncate w-full">
                    {acc.sub}
                  </span>
                </button>
              ))}
            </div>

            {selectedAccount && (
              <div className="flex justify-center items-center gap-2 pt-2">
                <span className="text-xl text-gray-400">ບັນຊີທີ່ເລືອກ:</span>
                <span className="text-xl  bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                  {selectedAccount.value} — {selectedAccount.label}
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Date range + buttons */}
          <div className="max-w-4xl mx-auto flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <p className="text-xl text-gray-400 mb-1 ml-1">ວັນເລີ່ມຕົ້ນ</p>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200
                  bg-gray-50 text-gray-700 focus:outline-none focus:ring-2
                  focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            <div className="text-gray-300 text-base pb-2">→</div>

            <div className="flex-1 min-w-[140px]">
              <p className="text-xl text-gray-400 mb-1 ml-1">ວັນສິ້ນສຸດ</p>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200
                  bg-gray-50 text-gray-700 focus:outline-none focus:ring-2
                  focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pb-0.5 items-center">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-xl rounded-xl border border-gray-200
                  text-gray-500 hover:bg-red-50 hover:border-red-200
                  hover:text-red-500 transition"
              >
                ລ້າງ
              </button>

              <button
                onClick={handleSearch}
                disabled={!canSearch || isFetching}
                className={`
                  flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-xl
                  transition-all duration-150
                  ${canSearch && !isFetching
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }
                `}
              >
                {isFetching ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    ກຳລັງຄົ້ນຫາ...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                    </svg>
                    ຄົ້ນຫາ
                  </>
                )}
              </button>

              {/* ── Export dropdown ── */}
              {searchResult.length > 0 && (
  <div className="flex gap-2 items-center">

    {/* ── Print button — standalone ── */}
    <ExportButtons
      data={searchResult}
      cols={getColDefs(queryParams?.account ?? "")}
      printTitle={`LDB Reconciliation — ${selectedAccount?.label} | ${selectedAccount?.value} (${dateFrom} ຫາ ${dateTo})`}
      variant="print"
    />

    {/* ── Download dropdown ── */}
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium
          rounded-xl border border-gray-200 bg-white text-gray-600
          hover:bg-gray-50 hover:border-gray-300 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        Download
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100
          rounded-xl shadow-lg z-10 p-2">
          <ExportButtons
            data={searchResult}
            filename={`LDB_${queryParams?.account}_${dateFrom}_${dateTo}`}
            cols={getColDefs(queryParams?.account ?? "")}
            variant="download"
          />
        </div>
      )}
    </div>

  </div>
)}
            </div>
          </div>
        </div>

        {/* ── Hint ── */}
        {!queryParams && (
          <div className="flex items-center gap-2 text-sm text-gray-400 px-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            ເລືອກຊ່ວງວັນທີ ແລ້ວກົດ "ຄົ້ນຫາ"
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div className="bg-red-50 border border-red-100 text-red-600
            text-sm px-4 py-3 rounded-xl flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ── Table ── */}
        <ReconTable rows={rows} account={queryParams?.account ?? ""} />

        {/* ── Empty state ── */}
        {queryParams && !isFetching && !isError && rows.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100
            py-12 flex flex-col items-center gap-2 text-gray-400">
            <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0
                012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0
                01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p className="text-sm">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີທີ່ເລືອກ</p>
          </div>
        )}

      </div>
    </div>
  );
}