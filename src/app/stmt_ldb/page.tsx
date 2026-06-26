"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useGet_Reward_LDB_STMT } from "@/app/CASES-LOTTO/hooks/Hook_Ldb";
import { formatDate } from "../utils/FormatDate";
import { formatMoney } from "../utils/FormartMoney";
import { Row } from "../../components/Row";
import { STMT_LDB_ENTITY } from "@/app/CASES-LOTTO/types/Type_Ldb";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  ClipboardCheck,
  Banknote,
  Clock,
  Search,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const getStatusClass = (status?: string | null): string => {
  switch (status) {
    case "DONE":
    case "ແກ້ໄຂແລ້ວ":
    case "ປິດເຄສສຳເລັດແລ້ວ":
      return "text-emerald-700 bg-emerald-50 border-emerald-200/60";
    case "ຫາກະແຈ້ງມາ":
      return "text-amber-700 bg-amber-50 border-amber-200/60";
    case "ກຳລັງດຳເນີນ":
      return "text-blue-700 bg-blue-50 border-blue-200/60";
    case "ລໍຂໍ້ມູນຈາກລູກຄ້າ":
      return "text-purple-700 bg-purple-50 border-purple-200/60";
    default:
      return "text-slate-600 bg-slate-50 border-slate-200";
  }
};

function SectionTitle({ title, icon: Icon }: { title: string; icon: any }) {
  return (
    <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
      <span className="p-1 bg-slate-100 text-slate-600 rounded-lg">
        <Icon size={16} />
      </span>
      <h2 className="text-base font-bold text-slate-800">{title}</h2>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/60 bg-white p-6 space-y-4"
        >
          <div className="h-8 w-64 rounded-lg bg-slate-200" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div
                key={j}
                className="h-24 rounded-xl bg-slate-50 border border-slate-100"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SearchBar ─────────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  error: string;
  isFetching: boolean;
  onChange: (v: string) => void;
  onSearch: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function SearchBar({
  value,
  error,
  isFetching,
  onChange,
  onSearch,
  onKeyDown,
}: SearchBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="ໃສ່ເລກໃບບິນ (Bill Number)..."
          className={`flex-1 rounded-xl border px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:ring-2 ${
            error
              ? "border-red-400 focus:ring-red-200"
              : "border-slate-200 focus:ring-blue-200"
          }`}
        />
        <button
          onClick={onSearch}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {isFetching ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          ຄົ້ນຫາ
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Single Statement Card ─────────────────────────────────────────────────────

function StatementCard({
  item,
  index,
  total,
  status,
  billNumber,
}: {
  item: STMT_LDB_ENTITY;
  index: number;
  total: number;
  status: string | null;
  billNumber: string;
}) {
  return (
    <div className="space-y-5">
      {/* Card Header */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-5 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FileSpreadsheet size={22} />
              </span>
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
                  Statement #{index + 1}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    / {total}
                  </span>
                </h1>
                <p className="text-xs text-slate-400 font-mono">
                  {item.TXN_TYPE || "-"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 self-start lg:self-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              ສະຖານະເຄສ:
            </span>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusClass(status)}`}
            >
              {status ?? "ບໍ່ມີສະຖານະ"}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100">
            <span className="text-xs font-medium text-slate-400 block mb-1">
              ເລກໃບບິນ
            </span>
            <p className="text-sm font-bold text-slate-800 break-all">
              {item.BILLNUMBER || billNumber || "-"}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100">
            <span className="text-xs font-medium text-slate-400 block mb-1">
              ລະຫັດງວດ (Draw ID)
            </span>
            <p className="text-sm font-bold text-slate-800">
              {item.DRAWID ?? "-"}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 sm:col-span-2">
            <span className="text-xs font-medium text-slate-400 block mb-1">
              ລະຫັດອ້າງອີງ LDB
            </span>
            <p className="text-sm font-mono font-semibold text-blue-600 break-all">
              {item.LDB_REF || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-400">
            <Clock size={54} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            ປະເພດທຸລະກຳ
          </span>
          <span className="mt-2 text-xl font-bold tracking-tight text-slate-800 block truncate">
            {item.TXN_TYPE || "-"}
          </span>
          <span className="mt-1 text-xs text-slate-400 block">
            {formatDate(item.DATE_TIME)}
          </span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/10 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-rose-600">
            <ArrowUpRight size={54} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 block">
            ຍອດຖອນເງິນ (Withdraw)
          </span>
          <span className="mt-2 text-2xl font-black tracking-tight text-rose-700 block">
            {formatMoney(item.WITHDRAW)}{" "}
            <span className="text-sm font-normal text-rose-600/70">LAK</span>
          </span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/10 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600">
            <ArrowDownLeft size={54} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 block">
            ຍອດຝາກເງິນ (Deposit)
          </span>
          <span className="mt-2 text-2xl font-black tracking-tight text-emerald-700 block">
            {formatMoney(item.DEPOSIT)}{" "}
            <span className="text-sm font-normal text-emerald-600/70">LAK</span>
          </span>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm lg:col-span-2 space-y-1">
          <SectionTitle title="ລາຍລະອຽດ Statement" icon={ClipboardCheck} />
          <Row
            label="ເລກໃບບິນ (Bill Number)"
            value={item.BILLNUMBER || billNumber || "-"}
          />
          <Row label="ລະຫັດງວດ (Draw ID)" value={item.DRAWID ?? "-"} />
          <Row label="ລະຫັດອ້າງອີງ LDB" value={item.LDB_REF || "-"} />
          <Row label="ປະເພດທຸລະກຳ" value={item.TXN_TYPE || "-"} />
          <Row label="ວັນທີ-ເວລາ ບັນທຶກ" value={formatDate(item.DATE_TIME)} />
          <Row label="ຖອນເງິນ" value={`${formatMoney(item.WITHDRAW)} LAK`} />
          <Row label="ຝາກເງິນ" value={`${formatMoney(item.DEPOSIT)} LAK`} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 shadow-xl text-white flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <span className="p-1 bg-slate-800 text-slate-400 rounded-lg">
                <Banknote size={16} />
              </span>
              <h2 className="text-base font-bold text-slate-100">
                ລາຍລະອຽດການໂອນ (Bank Memo)
              </h2>
            </div>
            <div className="space-y-1 bg-slate-800/40 p-4 rounded-xl border border-slate-800/60">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                ຂໍ້ຄວາມອ້າງອີງຈາກທະນາຄານ
              </span>
              <p className="text-sm text-slate-200 leading-relaxed break-all font-mono">
                {item.BANK_DETAIL || "ບໍ່ມີລາຍລະອຽດເພີ່ມເຕີມ"}
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-1.5">
            <Clock size={12} />
            <span>ກວດສອບຫຼ້າສຸດ: {formatDate(item.DATE_TIME)}</span>
          </div>
        </div>
      </div>

      {/* Divider between cards (not after last) */}
      {index < total - 1 && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 border-t border-dashed border-slate-200" />
          <span className="text-xs text-slate-400 font-medium">
            ລາຍການຖັດໄປ
          </span>
          <div className="flex-1 border-t border-dashed border-slate-200" />
        </div>
      )}
    </div>
  );
}

// ── PageContent ───────────────────────────────────────────────────────────────

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const billNumber = searchParams.get("billNumber")?.trim() ?? "";
  const typeStatus = searchParams.get("type_status") ?? "";
  const status = typeStatus || null;

  const [inputValue, setInputValue] = useState(billNumber);
  const [inputError, setInputError] = useState("");

  // data is now STMT_LDB_ENTITY[]
  const { data, isLoading, isError, refetch, isFetching } =
    useGet_Reward_LDB_STMT(billNumber);

  const statementData: STMT_LDB_ENTITY[] = data
    ? Array.isArray(data)
      ? data
      : [data]
    : [];

  const hasNoData = !data || (Array.isArray(data) && data.length === 0);

  console.log("data", data);

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputError("ກະລຸນາໃສ່ເລກໃບບິນກ່ອນຄົ້ນຫາ");
      return;
    }
    setInputError("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("billNumber", trimmed);
    router.push(`?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const searchBarProps: SearchBarProps = {
    value: inputValue,
    error: inputError,
    isFetching,
    onChange: (v) => {
      setInputValue(v);
      setInputError("");
    },
    onSearch: handleSearch,
    onKeyDown: handleKeyDown,
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <SearchBar {...searchBarProps} />
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm font-medium text-blue-700">
            <Loader2 size={18} className="animate-spin text-blue-600" />
            ກຳລັງໂຫຼດຂໍ້ມູນ Statement LDB... (ອາດໃຊ້ເວລາປະມານ 1-4 ນາທີ)
          </div>
          <Skeleton />
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError || (hasNoData && billNumber)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <SearchBar {...searchBarProps} />
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-10 shadow-xl">
            <div className="p-4 bg-red-50 rounded-full text-red-500 mb-4">
              <AlertCircle size={44} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              ບໍ່ສາມາດດຶງຂໍ້ມູນ Statement ໄດ້
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md text-center">
              ກະລຸນາກວດສອບ{" "}
              <span className="font-semibold text-slate-700">Bill Number</span>{" "}
              ຫຼື ລອງໃໝ່ອີກຄັ້ງ.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                ກັບຄືນ
              </button>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={isFetching ? "animate-spin" : ""}
                />
                ລອງໃໝ່
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (hasNoData && !billNumber) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <SearchBar {...searchBarProps} />
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm">
            <Search size={40} className="text-slate-300" />
            <p className="mt-4 text-sm text-slate-400">
              ໃສ່ເລກໃບບິນແລ້ວກົດຄົ້ນຫາ
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased p-4 md:p-8 selection:bg-blue-100">
      <div className="mx-auto max-w-[90rem] space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                ລາຍງານ Statement LDB
              </h1>
              <p className="text-xs text-slate-400">
                ພົບ{" "}
                <span className="font-semibold text-blue-600">
                  {statementData.length}
                </span>{" "}
                ລາຍການ
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 shadow-sm self-end sm:self-center"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
            ໂຫຼດໃໝ່
          </button>
        </div>

        {/* Search bar */}
        <SearchBar {...searchBarProps} />

        {/* Statement Cards — one per item in array */}
        {statementData.map((item, index) => (
          <StatementCard
            key={item.LDB_REF || `stmt-${index}`}  // ✅ unique key จาก LDB_REF
            item={item}
            index={index}
            total={statementData.length}
            status={status}
            billNumber={billNumber}
          />
        ))}
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function REWARD_LDB_STMT() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3 text-sm font-medium text-slate-400">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span>ກຳລັງໂຫຼດໂຄງສ້າງ Statement...</span>
          </div>
        </div>
      }
    >
      <PageContent />
    </Suspense>
  );
}