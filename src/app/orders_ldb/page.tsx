"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Loader2,
  Receipt,
  User,
  Wallet,
  Coins,
  FileText,
  Search,
} from "lucide-react";
import { useGet_Order_LDB } from "@/app/CASES-LOTTO/hooks/Hook_Ldb";
import { formatDate } from "../utils/FormatDate";
import { formatMoney } from "../utils/FormartMoney";
import { Badge } from "../../components/Badge";
import { Row } from "../../components/Row";
import { Card } from "../../components/Card";

// ── Constants ─────────────────────────────────────────────────────────────────

const ERROR_LABEL: Record<string, string> = {
  NOT_REWARD: "ບໍ່ໄດ້ຮັບເງິນລາງວັນ",
  NOT_BILL: "ບໍ່ໄດ້ຮັບບິນ ຫຼື ບີນບໍ່ສະແດງ",
  NOT_TOP_UP: "ບໍ່ໄດ້ຮັບມູນຄ່າໂທ",
  NOT_POINT: "ບໍ່ໄດ້ຮັບຄະແນນ",
  NOT_REWARD_SPIN: "ບໍ່ໄດ້ຮັບເງິນລາງວັນຈາກການ spin",
  P_NOTBILL: "ໃຊ້ຄະແນນຊື້ເລກບໍ່ໄດ້ບີນ",
  NOT_SELECT_ACC: "ບໍ່ສາມາດເລືອກບັນຊີຮັບລາງວັນ",
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 space-y-4">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-slate-50 border border-slate-100"
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

// ── SearchBar Component ───────────────────────────────────────────────────────

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
          placeholder="ໃສ່ລະຫັດເຄສ..."
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

// ── Main Page Content ─────────────────────────────────────────────────────────

function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const caseNumber = searchParams.get("case_number") ?? "";
  const errorType = searchParams.get("error_type") ?? "";
  const typeStatus = searchParams.get("type_status") ?? "";

  // 1. State ສຳລັບ input ແລະ validation
  const [inputValue, setInputValue] = useState(caseNumber);
  const [inputError, setInputError] = useState("");

  const errorLabel = ERROR_LABEL[errorType] ?? errorType ?? "-";

  const status = typeStatus || null;

  // Fetch ໂດຍໃຊ້ caseNumber ຈາກ URL
  const { data, isLoading, isError, refetch, isFetching } =
    useGet_Order_LDB(caseNumber);

  // 2. ຟັງຊັນຄົ້ນຫາ
  const handleSearch = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setInputError("ກະລຸນາໃສ່ລະຫັດເຄສກ່ອນຄົ້ນຫາ");
      return;
    }
    setInputError("");
    const params = new URLSearchParams(searchParams.toString());
    params.set("case_number", trimmed);
    router.push(`?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const searchBarProps = {
    value: inputValue,
    error: inputError,
    isFetching,
    onChange: (v: string) => {
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
            ກຳລັງໂຫຼດຂໍ້ມູນລະບົບ LDB... (ອາດໃຊ້ເວລາປະມານ 1-4 ນາທີ)
          </div>
          <Skeleton />
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError || (!data && caseNumber)) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <SearchBar {...searchBarProps} />
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-10 shadow-xl shadow-slate-100">
            <div className="p-4 bg-red-50 rounded-full text-red-500 mb-4">
              <AlertCircle size={44} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              ບໍ່ສາມາດດຶງຂໍ້ມູນຈາກລະບົບໄດ້
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md text-center">
              ກະລຸນາກວດສອບຄວາມຖືກຕ້ອງຂອງ{" "}
              <span className="font-semibold text-slate-700">Case Number</span>{" "}
              ຫຼື ລະບົບເຄືອຂ່າຍ ຈາກນັ້ນລອງໃໝ່ອີກຄັ້ງ.
            </p>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={isFetching ? "animate-spin" : ""}
              />
              {isFetching ? "ກຳລັງໂຫຼດຄືນ..." : "ລອງໃໝ່ອີກຄັ້ງ"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!data && !caseNumber) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <p className=" text-sm pl-5 text-slate-400">
            ກະຮຸນາປ້ອມຂໍ້ມູນ ເລກບີນຫວຍ ຫຼື ເລກອ້າງອີງຊຳລະ ຫຼື ເລກ payment ໃສ 9-8
            ຕົວອັກສອນກະໄດ້
          </p>
          <SearchBar {...searchBarProps} />
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
            <Search size={40} className="text-slate-300" />
            <p className="mt-4 text-sm text-slate-400">
              ໃສ່ລະຫັດເຄສແລ້ວກົດຄົ້ນຫາ
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased p-4 md:p-8 selection:bg-blue-100">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Search bar */}
        <SearchBar {...searchBarProps} />

        {/* Card 1: Header & Meta */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between pb-6 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Receipt size={22} />
                </span>
                <h1 className="text-xl flex gap-2 md:text-2xl font-bold tracking-tight text-slate-900">
                  ແດຊບອດລາຍການ
                  <span className="text-blue-700">
                    {data!.PAYBY || "Unknown"}
                  </span>
                  Order
                </h1>
              </div>
              <p className="text-sm text-slate-500 pl-11">
                ສະຖານະເຄສໃນລະບົບ:{" "}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                  {status || "ບໍ່ມີຂໍ້ມູນ"}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 self-start lg:self-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                ສະຖານະບິນ:
              </span>
              <Badge value={data!.STATUS} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50">
              <span className="text-xs font-medium text-slate-400 block mb-1">
                ປະເພດທະນາຄານ:
              </span>
              <p className="flex text-sm font-bold text-slate-800">
                ທະນາຄານ:{" "}
                <span className="text-primary-700 pl-3">{data!.PAYBY}</span>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50">
              <span className="text-xs font-medium text-slate-400 block mb-1">
                ເລກເຄສ (Case Number)
              </span>
              <p className="text-sm font-bold text-slate-800">
                {caseNumber || "-"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50">
              <span className="text-xs font-medium text-slate-400 block mb-1">
                ປະເພດຂໍ້ຜິດພາດ
              </span>
              <p className="text-sm font-bold text-blue-700">{errorLabel}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50">
              <div className="flex items-center gap-1.5 mb-1">
                <User size={13} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-400">
                  ລະຫັດຜູ້ໃຊ້ (User ID)
                </span>
              </div>
              <p className="text-sm font-bold text-slate-800">
                {data!.USERID || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card title="ເລກປີ້ (Ticket)" value={data!.TICKET} />
          <Card title="ເລກບິນ (Bill Number)" value={data!.BILLNUMBER} />
          <Card title="ງວດອອກເລກ (Draw ID)" value={data!.DRAWID?.toString()} />
          <Card title="ເວລາເຮັດທຸລະກຳ" value={formatDate(data!.TXTIME)} />
        </div>

        {/* Card 3: Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-slate-900">
              <Wallet size={64} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              ຈຳນວນເງິນທັງໝົດ
            </span>
            <span className="mt-2 text-2xl font-black tracking-tight text-slate-900 block">
              {formatMoney(data!.AMOUNT)}{" "}
              <span className="text-sm font-normal text-slate-500">LAK</span>
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600">
              <Coins size={64} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 block">
              ຈຳນວນເງິນຫຼັງຫັກສ່ວນຫຼຸດ
            </span>
            <span className="mt-2 text-2xl font-black tracking-tight text-emerald-700 block">
              {formatMoney(data!.AMOUNTAFTERDISCOUNT)}{" "}
              <span className="text-sm font-normal text-emerald-600/70">
                LAK
              </span>
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/20 p-6 shadow-sm hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-600">
              <FileText size={64} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">
              ຄະແນນທີ່ໄດ້ຮັບ (Points)
            </span>
            <span className="mt-2 text-2xl font-black tracking-tight text-blue-700 block">
              {formatMoney(data!.POINTISSUEAMOUNT)}{" "}
              <span className="text-sm font-normal text-blue-600/70">Pts</span>
            </span>
          </div>
        </div>

        {/* Card 4: Detail Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm hover:border-slate-300/80 transition-all">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <div className="w-1.5 h-4 rounded-full bg-slate-400" />
              <h2 className="text-base font-bold text-slate-800">
                ຂໍ້ມູນບັນຊີທະນາຄານ (Account Details)
              </h2>
            </div>
            <div className="space-y-1">
              <Row label="ເລກບັນຊີ (Account)" value={data!.ACCOUNT} />
              <Row label="ເລກອ້າງອີງລາຍວັນ (Journal)" value={data!.JOURNAL} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm hover:border-slate-300/80 transition-all">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
              <div className="w-1.5 h-4 rounded-full bg-blue-500" />
              <h2 className="text-base font-bold text-slate-800">
                ລາຍລະອຽດຄະແນນສະສົມ (Point Metrics)
              </h2>
            </div>
            <div className="space-y-1">
              <Row
                label="ມູນຄ່າຄະແນນທີ່ອອກ"
                value={`${formatMoney(data!.POINTISSUEAMOUNT)} ຄະແນນ`}
              />
              <Row
                label="ເລກອ້າງອີງຄະແນນ (Point Reference)"
                value={data!.POINTISSUEREFERENCE}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ORDER_LDB() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3 text-sm font-medium text-slate-400">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span>ກຳລັງໂຫຼດໂຄງສ້າງໜ້າຈໍ...</span>
          </div>
        </div>
      }
    >
      <PageContent />
    </Suspense>
  );
}
