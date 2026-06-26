"use client";

import React, { useMemo, useState } from "react";
import { Trash2, RefreshCw, ChevronDown, X, Download } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import {
  useCasesQuery,
  useDeleteCaseMutation,
} from "../CASES-LOTTO/hooks/Hooks_Cases";
import type { CaseItem } from "../CASES-LOTTO/types/Type_Cases";
import { ImageCell } from "@/app/utils/Preview_img";
import { downloadCasesXlsx } from "../dasboard_lotto/downloadCasesXlsx";
import Modal_edit_case from "../CASES-LOTTO/COMPONENTS/MODALS/Modal_edit_case";
import type { DataTypeCases } from "../../app/CASES-LOTTO/types/Type_Cases";
import { resolveImageSrc } from "@/app/utils/img_path";
import { toast } from "react-toastify";
import Modal_case_detail from "../CASES-LOTTO/COMPONENTS/MODALS/Modal_cases_detail";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100;

const CASE_FILTER = {
  ALL: "ALL",
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;

type CaseFilter = (typeof CASE_FILTER)[keyof typeof CASE_FILTER];

// ─────────────────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────────────────

const getCaseStatusClass = (status: string): string => {
  switch (status) {
    case "OPEN":
    case "ຫາກະແຈ້ງມາ":
      return "bg-amber-100 text-amber-700";
    case "ກຳລັງດຳເນີນ":
      return "bg-blue-100 text-blue-700";
    case "ແກ້ໄຂແລ້ວ":
      return "bg-green-100 text-green-700";
    case "ປິດເຄສສຳເລັດແລ້ວ":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getPriorityClass = (priority: string): string => {
  switch (priority) {
    case "LOW":
      return "bg-slate-100 text-slate-700";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-700";
    case "HIGH":
      return "bg-orange-100 text-orange-700";
    case "MAX-HIGH":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getErrorTypeLabel = (errorType: string): string => {
  switch (errorType) {
    case "NOT_REWARD":
      return "ບໍ່ໄດ້ຮັບເງິນລາງວັນ";
    case "NOT_BILL":
      return "ບໍ່ໄດ້ຮັບບິນ ຫຼື ບີນບໍ່ສະແດງ";
    case "NOT_TOP_UP":
      return "ບໍ່ໄດ້ຮັບມູນຄ່າໂທ";
    case "NOT_POINT":
      return "ບໍ່ໄດ້ຮັບຄະແນນ";
    case "NOT_REWARD_SPIN":
      return "ບໍ່ໄດ້ຮັບເງິນລາງວັນຈາກການ Spin";
    case "P_NOTBILL":
      return "ໃຊ້ຄະແນນຊື້ເລກບໍ່ໄດ້ບີນ";
    case "NOT_SELECT_ACC":
      return "ບໍ່ສາມາດເລືອກບັນຊີຮັບລາງວັນ";
    default:
      return errorType;
  }
};

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-xl border px-4 py-2 pr-8 text-sm font-medium outline-none transition focus:ring-2 focus:ring-blue-300 cursor-pointer ${
          value
            ? "border-blue-400 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CasesPage() {
  const auth = useAuth();
  const user = auth?.user?.displayName;

  // ── States ─────────────────────────────────────────────────────────────────

  const [page, setPage] = useState<number>(DEFAULT_PAGE);
  const [search, setSearch] = useState<string>("");
  const [caseFilter, setCaseFilter] = useState<CaseFilter>(CASE_FILTER.ALL);
  const [selectedCase, setSelectedCase] = useState<DataTypeCases | null>(null);

  // ✅ New filter states
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>("");
  const [filterProblemType, setFilterProblemType] = useState<string>("");

  const [confirmDelete, setConfirmDelete] = useState<DataTypeCases | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [editCase, setEditCase] = useState<DataTypeCases | null>(null);

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data, isLoading, isError, isFetching, refetch } = useCasesQuery({
    page,
    limit: DEFAULT_LIMIT,
    search,
    status: caseFilter,
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const allCases: CaseItem[] = Array.isArray(data?.data) ? data.data : [];
  const total = data?.total ?? 0;
  const totalPages = data
    ? Math.max(1, Math.ceil((data.total ?? 0) / DEFAULT_LIMIT))
    : 1;

  // ✅ Dynamic options built from actual data (unique values only)
  const assignedToOptions = useMemo(() => {
    const unique = [
      ...new Set(allCases.map((c) => c.assigned_to).filter(Boolean)),
    ];
    return unique.map((v) => ({ value: v, label: v }));
  }, [allCases]);

  const problemTypeOptions = useMemo(() => {
    const unique = [
      ...new Set(allCases.map((c) => c.problem_type).filter(Boolean)),
    ];
    return unique.map((v) => ({ value: v, label: v }));
  }, [allCases]);

  // ✅ Apply client-side filters on top of server results
  const cases = useMemo(() => {
    return allCases.filter((item) => {
      const matchAssigned = filterAssignedTo
        ? item.assigned_to === filterAssignedTo
        : true;
      const matchProblem = filterProblemType
        ? item.problem_type === filterProblemType
        : true;
      return matchAssigned && matchProblem;
    });
  }, [allCases, filterAssignedTo, filterProblemType]);

  // ── Summary ────────────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const openCases = cases.filter(
      (item) => item.status === "OPEN" || item.status === "ຫາກະແຈ້ງມາ",
    ).length;
    const resolvedCases = cases.filter(
      (item) =>
        item.status === "ແກ້ໄຂແລ້ວ" || item.status === "ປິດເຄສສຳເລັດແລ້ວ",
    ).length;
    return { total: cases.length, open: openCases, resolved: resolvedCases };
  }, [cases]);

  // ── Filter title ───────────────────────────────────────────────────────────

  const filterTitle = useMemo(() => {
    switch (caseFilter) {
      case CASE_FILTER.ACTIVE:
        return "ກຳລັງດຳເນີນ / ຍັງບໍ່ປິດ";
      case CASE_FILTER.CLOSED:
        return "ປິດເຄສສຳເລັດແລ້ວ";
      default:
        return "ລາຍການເຄສທັງໝົດ";
    }
  }, [caseFilter]);

  // ── Active filter count (badge) ────────────────────────────────────────────
  const activeFilterCount = [filterAssignedTo, filterProblemType].filter(
    Boolean,
  ).length;

  const clearAllFilters = () => {
    setFilterAssignedTo("");
    setFilterProblemType("");
  };

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1);
    setSearch(e.target.value);
  };

  const handleFilterChange = (filter: CaseFilter) => {
    setPage(1);
    setCaseFilter(filter);
  };

  const { mutateAsync: removeCase } = useDeleteCaseMutation();

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setDeletingId(confirmDelete.id);
      await removeCase({
        id: String(confirmDelete.id),
        username: user ?? "Unknown",
      });
      toast.success("Case deleted successfully");
      setConfirmDelete(null);
      refetch();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete case");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cases Support</h1>
          <p className="mt-1 text-sm text-slate-500">
            ຈັດການ ແລະ ຕິດຕາມບັນຫາຂອງລູກຄ້າໃນລະບົບ
          </p>
        </div>
        <div className="text-sm text-slate-500">Welcome, {user || "Guest"}</div>
      </div>

      {/* Search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by case number, customer, assigned to..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 md:max-w-sm"
        />
        <div className="text-sm text-slate-500">Total: {total}</div>
      </div>

      {/* Status Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {Object.values(CASE_FILTER).map((filter) => (
          <button
            key={filter}
            onClick={() => handleFilterChange(filter)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              caseFilter === filter
                ? filter === CASE_FILTER.ALL
                  ? "bg-slate-800 text-white"
                  : filter === CASE_FILTER.ACTIVE
                    ? "bg-blue-600 text-white"
                    : "bg-green-600 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {filter === CASE_FILTER.ALL
              ? "All Cases"
              : filter === CASE_FILTER.ACTIVE
                ? "ກຳລັງດຳເນີນ / ຍັງບໍ່ປິດ"
                : "ປິດເຄສສຳເລັດແລ້ວ"}
          </button>
        ))}
      </div>

      {/* ✅ Advanced Filters Row */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          ກັ່ນຕອງ:
        </span>

        <FilterSelect
          label="ຄົນຮັບຜິດຊອບ (assigned to)"
          value={filterAssignedTo}
          onChange={(v) => {
            setPage(1);
            setFilterAssignedTo(v);
          }}
          options={assignedToOptions}
        />

        <FilterSelect
          label="ປະເພດສີນຄ້າ (problem type)"
          value={filterProblemType}
          onChange={(v) => {
            setPage(1);
            setFilterProblemType(v);
          }}
          options={problemTypeOptions}
        />

        {/* Active filter badge + clear button */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-100"
          >
            <X size={12} />
            ລ້າງ filter ({activeFilterCount})
          </button>
        )}

        {/* Filtered result hint */}
        {activeFilterCount > 0 && (
          <span className="ml-auto text-xs text-slate-400">
            ສະແດງ{" "}
            <span className="font-semibold text-blue-600">{cases.length}</span>{" "}
            / {allCases.length} ລາຍການ
          </span>
        )}
      </div>

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            label: "Total Cases",
            value: summary.total,
            color: "text-slate-800",
          },
          { label: "Open Cases", value: summary.open, color: "text-amber-600" },
          {
            label: "Resolved Cases",
            value: summary.resolved,
            color: "text-green-600",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <h2 className={`mt-2 text-2xl font-bold ${item.color}`}>
              {item.value}
            </h2>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Case List</h2>
            <p className="text-sm text-slate-500">{filterTitle}</p>
          </div>

          <div className="button flex items-center gap-2">
            <a
              href="/CASES-LOTTO/COMPONENTS/MODALS/REPORT"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              ເບິ່ງເຄສທັງໝົດ
            </a>

            <button
              onClick={() => downloadCasesXlsx(cases)}
              disabled={cases.length === 0}
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
            >
              <Download size={15} />
              Export .xlsx ({cases.length})
            </button>

            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            Loading cases...
          </div>
        ) : isError ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-red-500">ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ</p>
            <button
              onClick={() => refetch()}
              className="mt-3 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        ) : cases.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            {activeFilterCount > 0
              ? "ບໍ່ພົບຂໍ້ມູນທີ່ກົງກັບ filter ທີ່ເລືອກ"
              : "ຍັງບໍ່ມີຂໍ້ມູນເຄສ"}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    {[
                      "ຮູບພາບ",
                      "ລະຫັດເຄສ",
                      "ປະເພດສີນຄ້າ",
                      "ປະເພດຂໍ້ຜິດພາດ",
                      "ສະຖານະ",
                      "ຄວາມສຳຄັນ",
                      "ສ້າງເມື່ອ",
                      "ຄົນຮັບຜິດຊອບ",
                      "ລາຍລະອຽດ",
                      "ໝາຍເຫດ",
                      "ຄົນປິດເຄສ",
                      "ວັນທີປິດເຄສ",
                      "Action",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left font-semibold"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {cases.map((item) => {
                    const isClosed = item.status?.trim() === "ປິດເຄສສຳເລັດແລ້ວ";
                    const rowImageSrc = resolveImageSrc(item.image_url);

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50"
                      >
                        {/* Image */}
                        <td className="px-2 py-3">
                          {item.image_url ? (
                            <ImageCell
                              src={rowImageSrc}
                              alt={item.case_number}
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                              N/A
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-800">
                          {item.case_number}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {/* ✅ Highlight when problem_type filter is active */}
                          {filterProblemType &&
                          filterProblemType === item.problem_type ? (
                            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              {item.problem_type}
                            </span>
                          ) : (
                            item.problem_type
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {getErrorTypeLabel(item.error_type)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCaseStatusClass(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClass(item.priority)}`}
                          >
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {/* ✅ Highlight when assigned_to filter is active */}
                          {filterAssignedTo &&
                          filterAssignedTo === item.assigned_to ? (
                            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              {item.assigned_to}
                            </span>
                          ) : (
                            item.assigned_to
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClass(item.priority)}`}
                          >
                            {item.description}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClass(item.priority)}`}
                          >
                            {item.notes}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityClass(item.priority)}`}
                          >
                            {item.close_user}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(item.resolved_at)}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-900 px-3 py-1.5 text-xs font-semibold text-primary-50 shadow-sm transition hover:bg-primary/85 active:scale-95"
                              onClick={() =>
                                setSelectedCase(
                                  item as unknown as DataTypeCases,
                                )
                              }
                              title="Review"
                            >
                              ລີວິວ
                            </button>

                            {!isClosed && (
                              <>
                                <button
                                  title="Edit"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 active:scale-95"
                                  onClick={() =>
                                    setEditCase(
                                      item as unknown as DataTypeCases,
                                    )
                                  }
                                >
                                  ແກ້ໄຂ
                                </button>

                                <button
                                  className="inline-flex items-center justify-center rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-400 transition hover:bg-red-100 hover:text-red-600 active:scale-95"
                                  onClick={() =>
                                    setConfirmDelete(
                                      item as unknown as DataTypeCases,
                                    )
                                  }
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <p className="text-sm text-slate-500">
                Page {page} / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm transition disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm transition disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fetching indicator */}
      {isFetching && !isLoading && (
        <div className="mt-4 text-center text-sm text-slate-400">
          Updating data...
        </div>
      )}

      {/* Modal VIEW */}
      {selectedCase && (
        <Modal_case_detail
          data={selectedCase}
          onClose={() => setSelectedCase(null)}
        />
      )}

      {/* Modal EDIT */}
      {editCase && (
        <Modal_edit_case
          data={editCase}
          onClose={() => {
            setEditCase(null);
            refetch();
          }}
        />
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">
              ຢືນຢັນການລົບ
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລົບເຄສ{" "}
              <span className="font-semibold text-red-500">
                {confirmDelete.case_number}
              </span>{" "}
              ?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                ຍົກເລີກ
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId !== null}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deletingId !== null ? "ກຳລັງລົບ..." : "ລົບ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
