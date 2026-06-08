"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import { useGetCaseByUserMutation } from "../../hooks/Hooks_Cases";
import { useAuth } from "@/lib/authContext";
import { formatDate } from "../../../utils/FormatDate";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DataTypeCases = {
  id: number;
  case_number: string;
  customer: string;
  description: string;
  problem_type: string;
  error_type: string;
  priority: string;
  status: string;
  assigned_to: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  close_user: string | null;
  remove_at: string | null;
  remove_user: string | null;
};

interface Props {
  onClose: () => void;
}

// ── Badge Components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ປິດເຄສສຳເລັດແລ້ວ: "bg-green-100 text-green-700 border-green-200",
    ກຳລັງດຳເນີນ: "bg-blue-100 text-blue-700 border-blue-200",
    ຫາກະແຈ້ງມາ: "bg-amber-100 text-amber-700 border-amber-200",
    ລໍຂໍ້ມູນຈາກລູກຄ້າ: "bg-purple-100 text-purple-700 border-purple-200",
    ແກ້ໄຂແລ້ວ: "bg-teal-100 text-teal-700 border-teal-200",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}
    >
      {status || "-"}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    HIGH: "bg-red-100 text-red-700 border-red-200",
    MEDIUM: "bg-orange-100 text-orange-700 border-orange-200",
    LOW: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const cls =
    map[priority?.toUpperCase()] ??
    "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {priority || "-"}
    </span>
  );
}

// ── Export XLSX ───────────────────────────────────────────────────────────────

function exportToXlsx(data: DataTypeCases[], filename: string) {
  const rows = data.map((r, i) => ({
    "#": i + 1,
    "Case Number": r.case_number,
    Customer: r.customer ?? "-",
    "Problem Type": r.problem_type,
    "Error Type": r.error_type ?? "-",
    Description: r.description,
    Status: r.status,
    Priority: r.priority,
    "Assigned To": r.assigned_to,
    "Created At": formatDate(r.created_at),
    "Updated At": formatDate(r.updated_at),
    "Resolved At": r.resolved_at ? formatDate(r.resolved_at) : "-",
    "Close User": r.close_user ?? "-",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cases");

  // ປັບຄວາມກວ້າງ column ອັດຕະໂນມັດ
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch:
      Math.max(
        key.length,
        ...rows.map(
          (r) => String((r as Record<string, unknown>)[key] ?? "").length,
        ),
      ) + 2,
  }));
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── Main Modal ────────────────────────────────────────────────────────────────

const Modal_GetCasesByuser = ({ onClose }: Props) => {
  const { user } = useAuth();
  const fullname = useMemo(() => user?.displayName ?? "", [user]);

  // State
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");

  // Mutation
  const {
    mutate,
    data: rawData,
    isPending: isFetching,
    isSuccess,
    isError,
    error,
  } = useGetCaseByUserMutation();

  // Parse result
  const searchResult: DataTypeCases[] = useMemo(() => {
    if (!rawData) return [];
    return Array.isArray(rawData?.data)
      ? rawData.data
      : (rawData?.data?.data ?? []);
  }, [rawData]);

  // Filter by status
  const filteredResult = useMemo(() => {
    if (!selectedStatus || selectedStatus === "ALL") return searchResult;
    return searchResult.filter((r) => r.status === selectedStatus);
  }, [searchResult, selectedStatus]);

  // Toast
  useEffect(() => {
    if (!isSuccess) return;
    filteredResult.length > 0
      ? toast.success(`✅ ພົບ ${filteredResult.length} ລາຍການ`)
      : toast.info("ℹ️ ບໍ່ມີຂໍ້ມູນ");
  }, [isSuccess]);

  useEffect(() => {
    if (isError) toast.error("❌ ເກີດຂໍ້ຜິດຜາດ: " + error);
  }, [isError, error]);

  // ── Search — ໃຊ້ fullname ຈາກ useAuth ──────────────────────────────────────
  const handleSearch = useCallback(() => {
    if (!fullname) {
      toast.error("❌ ບໍ່ພົບຊື່ຜູ້ໃຊ້ (fullname)");
      return;
    }
    setHasSearched(true);
    mutate({ userName: fullname });
  }, [fullname, mutate]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    setHasSearched(false);
    setSelectedStatus("");
  }, []);

  // ── Close on Escape ────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  // ── Download XLSX ──────────────────────────────────────────────────────────
  const handleExport = () => {
    if (filteredResult.length === 0) {
      toast.warn("⚠️ ບໍ່ມີຂໍ້ມູນສຳລັບດາວໂຫຼດ");
      return;
    }
    exportToXlsx(
      filteredResult,
      `Cases_${fullname}_${new Date().toISOString().slice(0, 10)}`,
    );
    toast.success("✅ ດາວໂຫຼດສຳເລັດ");
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto mx-4">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            🗂️ Cases ຂອງ
            <span className="text-blue-600 font-bold">{fullname || "-"}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 text-2xl font-bold leading-none"
          >
            &times;
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {/* ── Toolbar ── */}
          <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
            {/* ຜູ້ໃຊ້ປັດຈຸບັນ */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                ຄົ້ນຫາໂດຍ
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 min-w-[180px]">
                <span className="text-base">👤</span>
                {fullname || "ບໍ່ພົບຊື່"}
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                ສະຖານະ
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">ທັງໝົດ</option>
                <option value="ALL">ທັງໝົດ</option>
                <option value="ປິດເຄສສຳເລັດແລ້ວ">ປິດແລ້ວ</option>
                <option value="ກຳລັງດຳເນີນ">ກຳລັງດຳເນີນ</option>
                <option value="ຫາກະແຈ້ງມາ">ຫາກະແຈ້ງມາ</option>
                <option value="ລໍຂໍ້ມູນຈາກລູກຄ້າ">ລໍຂໍ້ມູນ</option>
                <option value="ແກ້ໄຂແລ້ວ">ແກ້ໄຂແລ້ວ</option>
              </select>
            </div>

            {/* ── ປຸ່ມຄົ້ນຫາ (ສຳຄັນ) ── */}
            <button
              onClick={handleSearch}
              disabled={isFetching || !fullname}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isFetching ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  ກຳລັງຄົ້ນຫາ...
                </>
              ) : (
                <>🔍 ຄົ້ນຫາ</>
              )}
            </button>

            {/* ── ປຸ່ມ Reset ── */}
            {hasSearched && (
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                🔄 ລ້າງຂໍ້ມູນ
              </button>
            )}

            {/* ── ປຸ່ມດາວໂຫຼດ .xlsx ── */}
            {filteredResult.length > 0 && (
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                ⬇️ ດາວໂຫຼດ .xlsx
              </button>
            )}
          </div>

          {/* ── Table ── */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            {!hasSearched ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <span className="text-4xl mb-3">🔍</span>
                <p className="text-sm">ກົດ "ຄົ້ນຫາ" ເພື່ອດຶງຂໍ້ມູນ</p>
              </div>
            ) : isFetching ? (
              <div className="flex items-center justify-center gap-3 py-20 text-blue-600 text-sm">
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                ກຳລັງໂຫຼດຂໍ້ມູນ...
              </div>
            ) : filteredResult.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <span className="text-4xl mb-3">📭</span>
                <p className="text-sm">ບໍ່ມີຂໍ້ມູນ</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0">
                  <tr>
                    {[
                      "#",
                      "Case Number",
                      "Customer",
                      "Problem Type",
                      "Error Type",
                      "Description",
                      "Status",
                      "Priority",
                      "Assigned To",
                      "Created At",
                      "Updated At",
                      "Resolved At",
                      "Close User",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-3 border-b border-slate-200 whitespace-nowrap font-semibold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResult.map((row, i) => (
                    <tr
                      key={row.case_number}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs text-blue-600 whitespace-nowrap">
                        {row.case_number}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.customer ?? "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.problem_type}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.error_type ?? "-"}
                      </td>
                      <td
                        className="px-3 py-2 max-w-[200px] truncate text-slate-600"
                        title={row.description}
                      >
                        {row.description}
                      </td>
                      <td className="px-3 py-2">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-3 py-2">
                        <PriorityBadge priority={row.priority} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.assigned_to}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                        {formatDate(row.updated_at)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-500">
                        {row.resolved_at ? formatDate(row.resolved_at) : "-"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.close_user ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Summary ── */}
          {filteredResult.length > 0 && (
            <div className="text-sm text-slate-500 text-right">
              ທັງໝົດ{" "}
              <span className="font-semibold text-slate-700">
                {filteredResult.length}
              </span>{" "}
              ລາຍການ
              {selectedStatus && selectedStatus !== "ALL" && (
                <span className="ml-2 text-blue-600">
                  (ກັ່ນຕອງ: {selectedStatus})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal_GetCasesByuser;
