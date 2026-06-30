"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify";
import * as XLSX from "xlsx";
import {
  useGetCaseByUserReportMutation,
  useCasesQuery,
} from "../../../hooks/Hooks_Cases";
import { useAuth } from "@/lib/authContext";
import { formatDate } from "../../../../utils/FormatDate";
import { DataTypeCases } from "@/app/CASES-LOTTO/types/Type_Cases";
// ── Types ─────────────────────────────────────────────────────────────────────

const PROBLEM_TYPE_OPTIONS = [
  "LOTTO_LDB",
  "LOTTO_BCEL",
  "LOTTO_JDB",
  "SPIN",
  "POINT",
  "TOP-UP",
  "AIRLINE",
  "WATER",
  "EDL",
  "OTHER",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ປິດເຄສສຳເລັດແລ້ວ: "bg-green-100 text-green-700 border-green-200",
    ກຳລັງດຳເນີນ: "bg-blue-100 text-blue-700 border-blue-200",
    ຫາກະແຈ້ງມາ: "bg-amber-100 text-amber-700 border-amber-200",
    ລໍຂໍ້ມູນຈາກລູກຄ້າ: "bg-purple-100 text-purple-700 border-purple-200",
    ແກ້ໄຂແລ້ວ: "bg-teal-100 text-teal-700 border-teal-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${map[status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
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
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${map[priority?.toUpperCase()] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
    >
      {priority || "-"}
    </span>
  );
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
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
  );
}

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
    "Cust Connect": r.cust_connect ?? r.cust_connect ?? "-",
    Notes: r.notes ?? "-",
    "Created At": formatDate(r.created_at),
    "Updated At": formatDate(r.updated_at),
    "Resolved At": r.resolved_at ? formatDate(r.resolved_at) : "-",
    "Close User": r.close_user ?? "-",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cases");
  ws["!cols"] = Object.keys(rows[0] ?? {}).map((k) => ({
    wch:
      Math.max(
        k.length,
        ...rows.map(
          (r) => String((r as Record<string, unknown>)[k] ?? "").length,
        ),
      ) + 2,
  }));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── Component ─────────────────────────────────────────────────────────────────

const UserCasesPage = () => {
  const { user } = useAuth();
  const fullname = useMemo(() => user?.displayName ?? "", [user]);

  const [tableData, setTableData] = useState<DataTypeCases[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedProbType, setSelectedProbType] = useState("");
  const [selectedAssigned, setSelectedAssigned] = useState(""); // ✅ new
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const {
    mutate,
    isPending: isFetching,
    isError,
    error,
  } = useGetCaseByUserReportMutation();

  // ✅ ดึง assigned_to options จาก useCasesQuery (ALL, limit สูงพอ)
  const { data: allCasesData } = useCasesQuery({
    page: 1,
    limit: 1000,
    search: "",
    status: "ALL",
  });

  // ✅ สร้าง unique assigned_to list จาก query
  const assignedToOptions = useMemo(() => {
    const raw = Array.isArray(allCasesData?.data) ? allCasesData.data : [];
    const unique = [...new Set(raw.map((c) => c.assigned_to).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [allCasesData]);

  // ✅ client-side filter รวม assigned_to ด้วย
  const filteredResult = useMemo(() => {
    return tableData.filter((r) => {
      const matchStatus =
        !selectedStatus ||
        selectedStatus === "ALL" ||
        r.status === selectedStatus;
      const matchAssigned =
        !selectedAssigned || r.assigned_to === selectedAssigned;
      return matchStatus && matchAssigned;
    });
  }, [tableData, selectedStatus, selectedAssigned]);

  useEffect(() => {
    if (isError) toast.error("❌ ເກີດຂໍ້ຜິດຜາດ: " + error);
  }, [isError, error]);

  const doSearch = useCallback(
    (
      params: {
        probType?: string;
        from?: string;
        to?: string;
      } = {},
    ) => {
      if (!fullname) {
        toast.error("❌ ບໍ່ພົບຊື່ຜູ້ໃຊ້");
        return;
      }
      setHasSearched(true);
      mutate(
        {
          userName: fullname,
          fromDate: (params.from ?? fromDate) || undefined,
          toDate: (params.to ?? toDate) || undefined,
          problemType: (params.probType ?? selectedProbType) || undefined,
        },
        {
          onSuccess: (res) => {
            const rows: DataTypeCases[] = Array.isArray(res?.data)
              ? res.data
              : (res?.data?.data ?? []);
            setTableData(rows);
            rows.length > 0
              ? toast.success(`✅ ພົບ ${rows.length} ລາຍການ`)
              : toast.info("ℹ️ ບໍ່ມີຂໍ້ມູນ");
          },
        },
      );
    },
    [fullname, fromDate, toDate, selectedProbType, mutate],
  );

  // ✅ ถ้าไม่ใช่ Admin ให้ lock filter เป็น fullname ตัวเอง
  useEffect(() => {
    if (fullname && fullname !== "Admin") {
      setSelectedAssigned(fullname);
    }
  }, [fullname]);

  const handleSearch = useCallback(() => doSearch(), [doSearch]);

  const handleRefresh = useCallback(() => {
    setSelectedStatus("");
    setSelectedProbType("");
    setSelectedAssigned(""); // ✅ reset
    setFromDate("");
    setToDate("");
    if (fullname) {
      setHasSearched(true);
      mutate(
        { userName: fullname },
        {
          onSuccess: (res) => {
            const rows: DataTypeCases[] = Array.isArray(res?.data)
              ? res.data
              : (res?.data?.data ?? []);
            setTableData(rows);
            rows.length > 0
              ? toast.success(`✅ ພົບ ${rows.length} ລາຍການ`)
              : toast.info("ℹ️ ບໍ່ມີຂໍ້ມູນ");
          },
        },
      );
    }
  }, [fullname, mutate]);

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

  const hasActiveFilter =
    (selectedStatus && selectedStatus !== "ALL") ||
    selectedProbType ||
    selectedAssigned ||
    fromDate ||
    toDate;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-auto mx-auto p-4 md:p-6 text-slate-800">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            🗂️ ລາງານເຄສທີ່ສ້າງດ້ວຍ{" "}
            <span className="text-blue-600 font-extrabold">
              {fullname || "-"}
            </span>
          </h1>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {/* Toolbar */}
          <div className="flex gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex flex-col sm:flex-row items-end gap-3 flex-wrap">
              {/* ຄົ້ນຫາໂດຍ */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">
                  ຄົ້ນຫາໂດຍ
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 min-w-[180px] h-[40px]">
                  <span>👤</span>
                  {fullname || "ບໍ່ພົບຊື່"}
                </div>
              </div>

              {/* ສະຖານະ */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">
                  ສະຖານະ
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition h-[40px] min-w-[160px]"
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

              {/* ປະເພດບັນຫາ */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">
                  ປະເພດບັນຫາ
                </label>
                <select
                  value={selectedProbType}
                  onChange={(e) => setSelectedProbType(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition h-[40px] min-w-[160px]"
                >
                  <option value="">ທັງໝົດ</option>
                  {PROBLEM_TYPE_OPTIONS.map((pt) => (
                    <option key={pt} value={pt}>
                      {pt}
                    </option>
                  ))}
                </select>
              </div>

              {/* ✅ ຄົນຮັບຜິດຊອບ (assigned_to) */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">
                  ຄົນຮັບຜິດຊອບ
                </label>

                {fullname === "ສິງຫາ ຫຼວງສີວິໄລ" ? (
                  // ── Admin: เห็นทุกคน ──────────────────────────
                  <select
                    value={selectedAssigned}
                    onChange={(e) => setSelectedAssigned(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition h-[40px] min-w-[180px]"
                  >
                    <option value="">ທັງໝົດ</option>
                    {assignedToOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  // ── User ทั่วไป: เห็นแค่ตัวเอง ────────────────
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 h-[40px] min-w-[180px]">
                    <span>👤</span>
                    {fullname || "-"}
                  </div>
                )}
              </div>

              {/* ວັນທີເລີ່ມ */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">
                  ວັນທີເລີ່ມ{" "}
                  <span className="font-normal text-slate-400">(From)</span>
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition h-[40px] min-w-[150px] text-slate-700"
                />
              </div>

              {/* ວັນທີສິ້ນສຸດ */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">
                  ວັນທີສິ້ນສຸດ{" "}
                  <span className="font-normal text-slate-400">(To)</span>
                </label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition h-[40px] min-w-[150px] text-slate-700"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2 flex-wrap pt-4 pl-4">
              <button
                onClick={handleSearch}
                disabled={isFetching || !fullname}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-5 text-sm font-semibold text-white transition disabled:opacity-50 h-[40px] shadow-sm"
              >
                {isFetching ? (
                  <>
                    <Spinner /> ກຳລັງຄົ້ນຫາ...
                  </>
                ) : (
                  <>🔍 ຄົ້ນຫາ</>
                )}
              </button>

              {hasSearched && (
                <button
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-4 text-sm font-medium text-slate-600 transition disabled:opacity-50 h-[40px] shadow-sm"
                >
                  🔄 ລ້າງ / ໂຫຼດໃໝ່
                </button>
              )}

              {filteredResult.length > 0 && (
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800 px-5 text-sm font-semibold text-white transition h-[40px] shadow-sm"
                >
                  ⬇️ ດາວໂຫຼດ .xlsx
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            {!hasSearched ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white">
                <span className="text-5xl mb-3">🔍</span>
                <p className="text-base font-medium">
                  ກົດ "ຄົ້ນຫາ" ເພື່ອດຶງຂໍ້ມູນ
                </p>
              </div>
            ) : isFetching ? (
              <div className="flex items-center justify-center gap-3 py-24 text-blue-600 text-base font-medium bg-white">
                <Spinner className="h-6 w-6" /> ກຳລັງໂຫຼດຂໍ້ມູນ...
              </div>
            ) : filteredResult.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white">
                <span className="text-5xl mb-3">📭</span>
                <p className="text-base font-medium">ບໍ່ມີຂໍ້ມູນ</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left border-collapse bg-white">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs border-b border-slate-200">
                  <tr>
                    {[
                      "#",
                      "Case Number",
                      "Customer",
                      "Problem Type",
                      "Error Type",
                      "Cust Connect",
                      "Description",
                      "Notes",
                      "Status",
                      "Priority",
                      "Assigned To",
                      "Created At",
                      "Updated At",
                      "Resolved At",
                      "Close User",
                      "StarDate",
                      "EndDate",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3.5 font-bold tracking-wider text-slate-600 whitespace-nowrap bg-slate-50"
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
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-400 font-medium">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600 whitespace-nowrap">
                        {row.case_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {row.customer ?? "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {row.problem_type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {row.error_type ?? "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {row.cust_connect ?? row.cust_connect ?? "-"}
                      </td>
                      <td
                        className="px-4 py-3 max-w-[70px] truncate text-slate-600"
                        title={row.description}
                      >
                        {row.description}
                      </td>
                      <td className="px-4 py-3 max-w-[70px] truncate text-slate-600">
                        {row.notes ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={row.priority} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                        {/* ✅ highlight ถ้า filter ทำงาน */}
                        {selectedAssigned &&
                        selectedAssigned === row.assigned_to ? (
                          <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {row.assigned_to}
                          </span>
                        ) : (
                          row.assigned_to
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {formatDate(row.updated_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {row.resolved_at ? formatDate(row.resolved_at) : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {row.close_user ?? "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {row.StartDate ?? "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {row.EndDate ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Summary */}
          {filteredResult.length > 0 && (
            <div className="text-sm text-slate-500 text-right font-medium pr-2">
              ທັງໝົດ{" "}
              <span className="font-bold text-slate-800 text-base">
                {filteredResult.length}
              </span>{" "}
              ລາຍການ
              {hasActiveFilter && (
                <span className="ml-2 text-blue-600">(ກຳລັງກັ່ນຕອງ)</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCasesPage;
