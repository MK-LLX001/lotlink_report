"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Loader2,
  Receipt,
  Clock,
  Hash,
  ArrowLeftRight,
  User,
  FileText,
  Banknote,
  Tag,
  Coins,
} from "lucide-react";
import { useGet_refund_points } from "@/app/CASES-LOTTO/hooks/hook_spin";
import { Card } from "@/components/Card";
import { formatDate } from "@/app/utils/FormatDate";
import { formatMoney } from "@/app/utils/FormartMoney";
import type { REFUND_POINTS_ENTITY } from "@/app/CASES-LOTTO/types/Type_spin";

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex justify-between items-center">
        <div className="h-10 w-32 rounded-xl bg-slate-200" />
      </div>
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 space-y-4">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-slate-50 border border-slate-100"
            />
          ))}
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3"
        >
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="h-10 rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── InfoRow ───────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 shrink-0">
        <span className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
          <Icon size={13} />
        </span>
        <span className="text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <span
        className={`text-sm font-semibold text-right break-all ${
          highlight
            ? "text-blue-600"
            : mono
              ? "font-mono text-slate-700"
              : "text-slate-800"
        }`}
      >
        {value ?? "-"}
      </span>
    </div>
  );
}

// ── Single Row Card ───────────────────────────────────────────────────────────

function RefundPointCard({
  item,
  index,
  total,
}: {
  item: REFUND_POINTS_ENTITY;
  index: number;
  total: number;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        {/* Card header */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Coins size={16} />
            </span>
            <h2 className="text-base font-bold text-slate-800">
              ລາຍການ #{index + 1}{" "}
              <span className="text-sm font-normal text-slate-400">
                / {total}
              </span>
            </h2>
          </div>
          {/* Type badge */}
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {item.TYPE || "-"}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-5 py-2">
            <InfoRow
              icon={Clock}
              label="ເວລາທຸລະກຳ (TXTIME)"
              value={formatDate(item.TXTIME)}
            />
            <InfoRow
              icon={Hash}
              label="ລະຫັດອ້າງອີງ (REFERENCE)"
              value={item.REFERENCE}
              mono
              highlight
            />
            <InfoRow
              icon={ArrowLeftRight}
              label="XREF"
              value={item.XREF}
              mono
            />
            <InfoRow icon={Tag} label="ປະເພດ (TYPE)" value={item.TYPE} />
          </div>

          {/* Right */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-5 py-2">
            <InfoRow
              icon={Banknote}
              label="ຈຳນວນ (AMOUNT)"
              value={`${formatMoney(item.AMOUNT)} LAK`}
              highlight
            />
            <InfoRow
              icon={User}
              label="ຜູ້ດຳເນີນການ (TELLER)"
              value={item.TELLER}
            />
            <InfoRow
              icon={FileText}
              label="ລາຍລະອຽດ (DESCRIPTION)"
              value={item.DESCRIPTION}
            />
          </div>
        </div>

        {/* Description full width */}
        {item.DESCRIPTION && (
          <div className="mt-4 rounded-xl bg-slate-800/90 border border-slate-700 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              ລາຍລະອຽດ
            </p>
            <p className="text-sm text-slate-200 leading-relaxed font-mono break-all">
              {item.DESCRIPTION}
            </p>
          </div>
        )}
      </div>

      {/* Divider between cards */}
      {index < total - 1 && (
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 border-t border-dashed border-slate-200" />
          <span className="text-xs text-slate-400 font-medium px-2">
            ລາຍການຖັດໄປ
          </span>
          <div className="flex-1 border-t border-dashed border-slate-200" />
        </div>
      )}
    </div>
  );
}

// ── Page Content ──────────────────────────────────────────────────────────────

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const caseNumber = searchParams.get("case_number") ?? "";

  const { data, isLoading, isError, refetch, isFetching } =
    useGet_refund_points(caseNumber);

  const refunds = Array.isArray(data) ? data : data ? [data] : [];
  const firstRefund = refunds[0];

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-7xl space-y-6">
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm font-medium text-blue-700 backdrop-blur-sm">
            <Loader2 size={18} className="animate-spin text-blue-600" />
            ກຳລັງໂຫຼດຂໍ້ມູນ... (ອາດໃຊ້ເວລາປະມານ 1-4 ນາທີ)
          </div>
          <Skeleton />
        </div>
      </div>
    );
  }

  // ── Error / Empty ────────────────────────────────────────────────────────
  if (isError || !refunds.length) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-2xl text-center">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-10 shadow-xl ring-1 ring-red-50">
            <div className="p-4 bg-red-50 rounded-full text-red-500 mb-4 animate-bounce">
              <AlertCircle size={44} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              ບໍ່ສາມາດດຶງຂໍ້ມູນຈາກລະບົບໄດ້
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md">
              ກະລຸນາກວດສອບ{" "}
              <span className="font-semibold text-slate-700">Case Number</span>{" "}
              ຫຼື ລອງໃໝ່ອີກຄັ້ງ.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
              >
                <ArrowLeft size={16} />
                ກັບຄືນໜ້າກ່ອນໜ້າ
              </button>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={isFetching ? "animate-spin" : ""}
                />
                {isFetching ? "ກຳລັງໂຫຼດ..." : "ລອງໃໝ່ອີກຄັ້ງ"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased p-4 md:p-8 selection:bg-blue-100">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 active:scale-95"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            ກັບຄືນ
          </button>

          <div className="flex items-center gap-3">
            {/* Row count badge */}
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 shadow-sm">
              ພົບ{" "}
              <span className="font-bold text-blue-600">{refunds.length}</span>{" "}
              ລາຍການ
            </span>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={isFetching ? "animate-spin" : ""}
              />
              ໂຫຼດໃໝ່
            </button>
          </div>
        </div>

        {/* Card 1: Header */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 pb-5 border-b border-slate-100">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Receipt size={22} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                ແດຊບອດລາຍການ{" "}
                <span className="text-blue-700">
                  {firstRefund?.TYPE || "Unknown"}
                </span>{" "}
                Order
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                ເລກເຄສ:{" "}
                <span className="font-semibold text-slate-600">
                  {caseNumber || "-"}
                </span>
              </p>
            </div>
          </div>

          {/* Summary cards from first row */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card title="XREF" value={firstRefund?.XREF} />
            <Card
              title="ລະຫັດອ້າງອີງ (REFERENCE)"
              value={firstRefund?.REFERENCE}
            />
            <Card
              title="ເວລາເຮັດທຸລະກຳ"
              value={formatDate(firstRefund?.TXTIME)}
            />
          </div>
        </div>

        {/* Cards: one per row */}
        {refunds.map((item, index) => (
          <RefundPointCard
            key={item.XREF ? `${item.XREF}-${index}` : `row-${index}`}
            item={item}
            index={index}
            total={refunds.length}
          />
        ))}

        {/* Dark summary — totals */}
        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 shadow-xl text-white">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <span className="p-1 bg-slate-800 text-slate-400 rounded-lg">
              <FileText size={15} />
            </span>
            <h2 className="text-base font-bold text-slate-100">
              ສະຫຼຸບລາຍການທັງໝົດ ({refunds.length} ລາຍການ)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                ຈຳນວນເງິນລວມ
              </p>
              <p className="text-2xl font-black text-emerald-400">
                {formatMoney(
                  refunds.reduce((sum, r) => sum + (r.AMOUNT ?? 0), 0),
                )}{" "}
                <span className="text-sm font-normal text-emerald-500">
                  LAK
                </span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                ຈຳນວນລາຍການ
              </p>
              <p className="text-2xl font-black text-slate-100">
                {refunds.length}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                ຜູ້ດຳເນີນການ
              </p>
              <p className="text-lg font-bold text-slate-100">
                {firstRefund?.TELLER || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ORDER_BCELONE() {
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
