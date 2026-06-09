"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  Loader2,
  Search,
  User,
  Calendar,
  Hash,
  BadgeCheck,
} from "lucide-react";
import { useGet_loto_user } from "@/app/CASES-LOTTO/hooks/loto_user";
import { formatDate } from "../utils/FormatDate";
import { Row } from "../../components/Row";
import { Card } from "../../components/Card";

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-slate-200" />
        ))}
      </div>
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
          placeholder="ໃສ່ລະຫັດຜູ້ໃຊ້ (User ID)..."
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

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    ACTIVE: "text-green-700 bg-green-50 border-green-200",
    INACTIVE: "text-red-600 bg-red-50 border-red-200",
    SUSPEND: "text-amber-600 bg-amber-50 border-amber-200",
  };
  const cls =
    map[status ?? ""] ?? "text-slate-600 bg-slate-50 border-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}
    >
      {status || "-"}
    </span>
  );
}

// ── PageContent ───────────────────────────────────────────────────────────────

function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const userId = searchParams.get("user_id") ?? "";

  const [inputValue, setInputValue] = useState(userId);
  const [inputError, setInputError] = useState("");

  const { data, isLoading, isError, refetch, isFetching } =
    useGet_loto_user(userId);

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputError("ກະລຸນາໃສ່ລະຫັດຜູ້ໃຊ້ກ່ອນຄົ້ນຫາ");
      return;
    }
    setInputError("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("user_id", trimmed);
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

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <SearchBar {...searchBarProps} />
          <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm font-medium text-blue-700">
            <Loader2 size={18} className="animate-spin text-blue-600" />
            ກຳລັງໂຫຼດຂໍ້ມູນຜູ້ໃຊ້...
          </div>
          <Skeleton />
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (isError || (!data && userId)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <SearchBar {...searchBarProps} />
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-12 shadow-sm">
            <div className="p-4 bg-red-50 rounded-full text-red-400 mb-4">
              <AlertCircle size={40} />
            </div>
            <p className="text-base font-semibold text-slate-700">
              ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ
            </p>
            <p className="mt-2 text-sm text-slate-500 text-center max-w-sm">
              ກະລຸນາກວດສອບ{" "}
              <span className="font-semibold text-slate-700">User ID</span> ຫຼື
              ລອງໃໝ່ອີກຄັ້ງ
            </p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={isFetching ? "animate-spin" : ""}
              />
              ລອງໃໝ່
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!data && !userId) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <p className=" text-sm pl-5 text-slate-400">
            ກະຮຸນາປ້ອມຂໍ້ມູນ ເລກເບີໂທສະລັບ ຫຼື UID ໃສ 9-8 ຕົວອັກສອນກະໄດ້
          </p>
          <SearchBar {...searchBarProps} />
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm">
            <Search size={40} className="text-slate-300" />
            <p className="mt-4 text-sm text-slate-400">
              ໃສ່ລະຫັດຜູ້ໃຊ້ແລ້ວກົດຄົ້ນຫາ
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Search */}
        <SearchBar {...searchBarProps} />

        {/* Header Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <User size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {data!.NAME || "-"}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {data!.LOTTOUSER || "-"}
                </p>
              </div>
            </div>
            <StatusBadge status={data!.STATUS} />
          </div>

          {/* Key info grid */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Hash size={12} className="text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">
                  LOTTOUSER
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800 break-all">
                {data!.LOTTOUSER || "-"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Hash size={12} className="text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">
                  PROFILE ID
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800 break-all">
                {data!.PROFILEID || "-"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Calendar size={12} className="text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">
                  ວັນທີລົງທະບຽນ
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800">
                {formatDate(data!.REGISTERDATE)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BadgeCheck size={12} className="text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">
                  ສະຖານະ
                </span>
              </div>
              <StatusBadge status={data!.STATUS} />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card title="ຊື່ຜູ້ໃຊ້" value={data!.NAME || "-"} />
          <Card
            title="ລະຫັດແນະນຳ (Refer Code)"
            value={data!.REFERCODE || "-"}
          />
          <Card title="ຈຳນວນການແນະນຳ" value={String(data!.REFERTIME ?? "-")} />
          <Card
            title="ບັນຊີຄ່ານາຍໜ້າ"
            value={String(data!.COMMISSIONACCOUNT ?? "-")}
          />
        </div>

        {/* Detail Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ຂໍ້ມູນຜູ້ໃຊ້ */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <div className="w-1.5 h-4 rounded-full bg-blue-500" />
              <h2 className="text-base font-bold text-slate-800">
                ຂໍ້ມູນຜູ້ໃຊ້ (User Info)
              </h2>
            </div>
            <div className="space-y-1">
              <Row label="LOTTOUSER" value={data!.LOTTOUSER} />
              <Row label="ຊື່" value={data!.NAME} />
              <Row label="PROFILE ID" value={data!.PROFILEID} />
              <Row
                label="ວັນທີລົງທະບຽນ"
                value={formatDate(data!.REGISTERDATE)}
              />
              <Row label="ສະຖານະ" value={data!.STATUS} />
            </div>
          </div>

          {/* ຂໍ້ມູນການແນະນຳ */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <div className="w-1.5 h-4 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-slate-800">
                ຂໍ້ມູນການແນະນຳ (Referral Info)
              </h2>
            </div>
            <div className="space-y-1">
              <Row label="ລະຫັດແນະນຳ (Refer Code)" value={data!.REFERCODE} />
              <Row label="ແນະນຳໂດຍ (Refer By)" value={data!.REFERBY} />
              <Row
                label="ຈຳນວນການແນະນຳ (Refer Time)"
                value={String(data!.REFERTIME ?? "-")}
              />
              <Row
                label="ບັນຊີຄ່ານາຍໜ້າ (Commission Account)"
                value={String(data!.COMMISSIONACCOUNT ?? "-")}
              />
            </div>
          </div>
        </div>

        {/* Refetch */}
        <div className="flex justify-end">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
            ໂຫຼດຂໍ້ມູນໃໝ່
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function LotoUserPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3 text-sm text-slate-400">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span>ກຳລັງໂຫຼດ...</span>
          </div>
        </div>
      }
    >
      <PageContent />
    </Suspense>
  );
}
