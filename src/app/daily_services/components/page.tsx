"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Briefcase,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import type { DailyServiceItem } from "../types/types.daily.service";
import { useDailyServiceQuery } from "../hook/hook.daily";
import { ImageCell } from "@/app/utils/Preview_img";
import { DailyImageSrc } from "@/app/utils/img_path";
import CreateDailyServicePage from "./modals/Create.Daily.sevice";
import { formatDate } from "../../utils/FormatDate";
import DetailDailyServices from "../components/modals/detail.daily_services";
import EditDailyService from "./modals/EditDailyService";
import * as XLSX from "xlsx";
import { useAuth } from "@/lib/authContext";
import { Download } from "lucide-react";

import toast from "react-hot-toast";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 70;

const CASE_FILTER = {
  ALL: "ALL",
  DONE: "100%",
  MIDIDE: "50%",
  DOING: "ກຳລັງດຳເນີນງານ",
} as const;
type CaseFilter = (typeof CASE_FILTER)[keyof typeof CASE_FILTER];

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  ກຳລັງດຳເນີນງານ: {
    label: "ກຳລັງດຳເນີນງານ",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  "50%": {
    label: "50% ສຳເລັດ",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  "100%": {
    label: "100% ສຳເລັດ",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
};
const getStatus = (s: string) =>
  STATUS_CONFIG[s] ?? {
    label: s,
    bg: "bg-slate-50",
    text: "text-slate-600",
    dot: "bg-slate-400",
  };

const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// ── Skeleton ────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-slate-200" />
        </td>
      ))}
    </tr>
  );
}

// ── Summary strip ───────────────────────────────────────────────────
function SummaryStrip({
  items,
  total,
}: {
  items: DailyServiceItem[];
  total: number;
}) {
  const counts = useMemo(
    () => ({
      doing: items.filter((i) => i.status === "ກຳລັງດຳເນີນງານ").length,
      half: items.filter((i) => i.status === "50%").length,
      done: items.filter((i) => i.status === "100%").length,
    }),
    [items],
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        {
          label: "ທັງໝົດ",
          value: total,
          color: "text-slate-800",
          bg: "bg-slate-50",
          border: "border-slate-200",
        },
        {
          label: "ກຳລັງດຳເນີນ",
          value: counts.doing,
          color: "text-blue-700",
          bg: "bg-blue-50",
          border: "border-blue-100",
        },
        {
          label: "50% ສຳເລັດ",
          value: counts.half,
          color: "text-amber-700",
          bg: "bg-amber-50",
          border: "border-amber-100",
        },
        {
          label: "100% ສຳເລັດ",
          value: counts.done,
          color: "text-emerald-700",
          bg: "bg-emerald-50",
          border: "border-emerald-100",
        },
      ].map((s) => (
        <div
          key={s.label}
          className={`rounded-xl border ${s.border} ${s.bg} p-4`}
        >
          <p className="text-xs text-slate-500">{s.label}</p>
          <p className={`mt-1 text-2xl font-black ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────
export default function Daily_Service() {
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseFilter>(CASE_FILTER.ALL);
  const [filterAgreement, setFilterAgreement] = useState("");
  const [filterTypesWork, setFilterTypesWork] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading, isError, isFetching, refetch } =
    useDailyServiceQuery({
      page,
      limit: DEFAULT_LIMIT,
      search,
      status: statusFilter !== CASE_FILTER.ALL ? statusFilter : undefined,
    });

  const rawData = data?.data;
  const items: DailyServiceItem[] = Array.isArray(rawData) ? rawData : [];
  const total = typeof data?.total === "number" ? data.total : 0;
  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_LIMIT));
  const [selectedCase, setSelectedCase] = useState<DailyServiceItem | null>(
    null,
  );
  const [editCase, setEditCase] = useState<DailyServiceItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();
  const fullname = useMemo(() => user?.displayName ?? "", [user]);
  const isAdmin = fullname === "admin";

  const filtered = useMemo(
    () =>
      items.filter((i) => {
        const matchAg =
          !filterAgreement ||
          (i.agreement ?? "")
            .toLowerCase()
            .includes(filterAgreement.toLowerCase());
        const matchTw =
          !filterTypesWork ||
          (i.types_work ?? "")
            .toLowerCase()
            .includes(filterTypesWork.toLowerCase());
        return matchAg && matchTw;
      }),
    [items, filterAgreement, filterTypesWork],
  );

  const hasFilter = !!(filterAgreement || filterTypesWork);
  const displayItems = hasFilter ? filtered : items;
  // เพิ่ม handler
  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const fd = new FormData();
      fd.append("action", "delete_daily");
      fd.append("daily_id", String(deleteId));
      const res = await fetch("/api/oracle/Daily_services", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.success) {
        toast.success("ລົບຂໍ້ມູນສຳເລັດ");
        setDeleteId(null);
        refetch();
      } else {
        toast.error(json.message ?? "ລົບບໍ່ສຳເລັດ");
      }
    } catch {
      toast.error("ເກີດຂໍ້ຜິດພາດ");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── download xlsx ─────────────────────────────────────────────────
  const handleDownload = () => {
    const rows = displayItems.map((item, i) => ({
      "#": i + 1,
      ປະເພດວຽກ: item.types_work ?? "",
      ລາຍລະອຽດ: item.description ?? "",
      ປະສານງານ: item.contact ?? "",
      ຜູ້ຮັບຜິດຊອບ: item.agreement ?? "",
      ເພຈ: item.page ?? "",
      ສະຖານະ: item.status ?? "",
      ໝາຍເຫດ: item.remark ?? "",
      ວັນທີເລີ່ມ: item.startDate ?? "",
      ວັນທີສິ້ນສຸດ: item.endDate ?? "",
      ວັນທີບັນທຶກ: item.created_at ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Service");

    // auto column width
    const cols = Object.keys(rows[0] ?? {}).map((key) => ({
      wch:
        Math.max(
          key.length,
          ...rows.map((r) => String((r as any)[key]).length),
        ) + 2,
    }));
    ws["!cols"] = cols;

    XLSX.writeFile(
      wb,
      `Daily_Service_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-200">
              <Briefcase size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Daily Service
              </h1>
              <p className="text-xs text-slate-400">ລາຍການງານປະຈຳວັນທັງໝົດ</p>
            </div>
          </div>
          <div className="button gap-4 flex">
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:self-center"
            >
              ເພີ້ມຂໍ້ມູນ
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:self-center"
            >
              <RefreshCw
                size={14}
                className={isFetching ? "animate-spin" : ""}
              />
              ໂຫຼດໃໝ່
            </button>
            {/* ✅ ปุ่ม Download */}
            <button
              onClick={handleDownload}
              disabled={displayItems.length === 0}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-40 sm:self-center"
            >
              <Download size={14} />
              ດາວໂຫລດ Excel
            </button>
          </div>
        </div>

        {/* ── Summary ── */}
        <SummaryStrip items={items} total={total} />

        {/* ── Status tabs ── */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(CASE_FILTER) as [string, CaseFilter][]).map(
            ([, val]) => {
              const cfg = val !== CASE_FILTER.ALL ? getStatus(val) : null;
              const isActive = statusFilter === val;
              return (
                <button
                  key={val}
                  onClick={() => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? val === CASE_FILTER.ALL
                        ? "bg-slate-800 text-white"
                        : `${cfg?.bg} ${cfg?.text} ring-1 ring-inset ring-current`
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {cfg && (
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${isActive ? cfg.dot : cfg.dot}`}
                    />
                  )}
                  {val === CASE_FILTER.ALL ? "ທັງໝົດ" : cfg?.label}
                </button>
              );
            },
          )}
        </div>

        {/* ── Filter inputs ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="ຄົ້ນຫາ..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
            <div className="relative min-w-[180px]">
              <FileCheck2
                size={13}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={filterAgreement}
                onChange={(e) => {
                  setFilterAgreement(e.target.value);
                  setPage(1);
                }}
                placeholder="Agreement..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
            <div className="relative min-w-[180px]">
              <Briefcase
                size={13}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={filterTypesWork}
                onChange={(e) => {
                  setFilterTypesWork(e.target.value);
                  setPage(1);
                }}
                placeholder="ປະເພດວຽກ..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
            </div>
            {hasFilter && (
              <button
                onClick={() => {
                  setFilterAgreement("");
                  setFilterTypesWork("");
                  setPage(1);
                }}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-100"
              >
                ລ້າງ filter
              </button>
            )}
            <div className="ml-auto text-sm text-slate-400 self-center whitespace-nowrap">
              {hasFilter ? (
                <span>
                  ສະແດງ{" "}
                  <strong className="text-blue-600">{filtered.length}</strong> /{" "}
                  {items.length} ລາຍການ
                </span>
              ) : (
                <span>
                  ທັງໝົດ <strong className="text-slate-700">{total}</strong>{" "}
                  ລາຍການ
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Error */}
          {isError && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-red-500 mb-3">ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ</p>
              <button
                onClick={() => refetch()}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                ລອງໃໝ່
              </button>
            </div>
          )}
          {!isError && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">ຮູບ</th>

                    <th className="px-4 py-3">ປະເພດວຽກ</th>

                    <th className="px-4 py-3">ລາຍລະອຽດ</th>
                    <th className="px-4 py-3">ປະສານງານ</th>
                    <th className="px-4 py-3">ວັນທີເລີ້ມ</th>
                    <th className="px-4 py-3">ສະຖານະ</th>
                    <th className="px-4 py-3">ວັນທີສີ້ນສຸດ</th>
                    <th className="px-4 py-3">ເພຈ</th>
                    <th className="px-4 py-3">ຜູ້ຮັບຜິດຊອບ</th>
                    <th className="px-4 py-3">ໝາຍເຫດ</th>
                    <th className="px-4 py-3 ">ວັນທີບັນທືກ</th>
                    <th className="px-4 py-3 ">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Skeleton */}
                  {isLoading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <SkeletonRow key={i} />
                    ))}

                  {/* Rows */}
                  {!isLoading &&
                    displayItems.map((item, i) => {
                      const cfg = getStatus(item.status);
                      const rowImageSrc = DailyImageSrc(item.img_url);
                      return (
                        <tr
                          key={item.daily_id}
                          className="hover:bg-slate-50 transition"
                        >
                          <td className="px-4 py-3 text-slate-400">
                            {(page - 1) * DEFAULT_LIMIT + i + 1}
                          </td>
                          {/* Image */}
                          <td className="px-2 py-3">
                            {item.img_url ? (
                              <ImageCell
                                src={DailyImageSrc(item.img_url)}
                                alt={item.types_work ?? "image"}
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                                N/A
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-medium text-slate-700">
                            {item.types_work}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">
                            {item.description}
                          </td>
                          <td className="px-4 py-3 text-blue-600 font-medium max-w-[140px] truncate">
                            {item.contact ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500 max-w-[200px]">
                            <p className="line-clamp-2">
                              {formatDate(item.startDate ?? "—")}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.status ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(item.endDate ?? "—")}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.page ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.agreement ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {item.remark ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(item.created_at ?? "—")}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <button
                              className=" ml-1 inline-flex items-center gap-1.5 rounded-lg bg-primary-900 px-3 py-1.5 text-xs font-semibold text-primary-50 shadow-sm transition hover:bg-primary/85 active:scale-95"
                              onClick={() =>
                                setSelectedCase(
                                  item as unknown as DailyServiceItem,
                                )
                              }
                              title="Review"
                            >
                              ລີວິວ
                            </button>
                            <button
                              className=" ml-1 inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-primary-50 shadow-sm transition hover:bg-primary/85 active:scale-95"
                              onClick={() => setEditCase(item)}
                              title="Review"
                            >
                              ແກ້ໄຂ
                            </button>
                            <button
                              className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-600 active:scale-95"
                              onClick={() => setDeleteId(item.daily_id)}
                              title="ລົບ"
                            >
                              ລົບ
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                  {/* Empty */}
                  {!isLoading && displayItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-12 text-center text-sm text-slate-400"
                      >
                        ບໍ່ພົບຂໍ້ມູນ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {showCreate && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={(e) =>
                e.target === e.currentTarget && setShowCreate(false)
              }
            >
              <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl">
                {/* Close button */}
                <button
                  onClick={() => setShowCreate(false)}
                  className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 shadow-sm"
                >
                  <X size={15} />
                </button>

                <CreateDailyServicePage />
              </div>
            </div>
          )}
          {/* Modal VIEW */}
          {selectedCase && (
            <DetailDailyServices
              data={selectedCase}
              onClose={() => setSelectedCase(null)}
            />
          )}

          {editCase && (
            <EditDailyService
              data={editCase}
              onClose={() => setEditCase(null)}
              onSuccess={() => refetch()}
            />
          )}
          {deleteId && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={(e) => e.target === e.currentTarget && setDeleteId(null)}
            >
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
                  <X size={22} className="text-red-500" />
                </div>
                <h3 className="text-center text-base font-bold text-slate-800 mb-1">
                  ຢືນຢັນການລົບ
                </h3>
                <p className="text-center text-sm text-slate-500 mb-6">
                  ທ່ານຕ້ອງການລົບລາຍການນີ້ແທ້ບໍ່? ບໍ່ສາມາດກູ້ຄືນໄດ້.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteId(null)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    ຍົກເລີກ
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition"
                  >
                    {isDeleting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 size={14} className="animate-spin" />{" "}
                        ກຳລັງລົບ...
                      </span>
                    ) : (
                      "ລົບ"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-sm">
            <p className="text-sm text-slate-400">
              ໜ້າ <span className="font-bold text-slate-700">{page}</span> /{" "}
              {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold transition ${
                      p === page
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Fetching indicator ── */}
        {isFetching && !isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" /> ກຳລັງອັບເດດ...
          </div>
        )}
      </div>
    </div>
  );
}
