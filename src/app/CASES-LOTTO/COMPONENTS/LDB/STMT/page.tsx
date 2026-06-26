"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useGet_Reward_LDB_STMT } from "@/app/CASES-LOTTO/hooks/Hook_Ldb";
import { formatDate } from "../../../../utils/FormatDate";
import { formatMoney } from "../../../../utils/FormartMoney";
import { Row } from "../../../../../components/Row";
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
  Edit3,
} from "lucide-react";
import Modal_Update_case from "../../MODALS/Modal_Update_case";
import type { STMT_LDB_ENTITY } from "@/app/CASES-LOTTO/types/Type_Ldb";

// ── Helpers & Styling Logic ──────────────────────────────────────────────────

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

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 space-y-4">
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
        </div>
      ))}
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
      {/* Card 1: Header Meta */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm shadow-slate-100/50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pb-5 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <FileSpreadsheet size={22} />
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Statement #{index + 1}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    / {total}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100">
            <span className="text-xs font-medium text-slate-400 block mb-1">
              ເລກໃບບິນ (Bill Number)
            </span>
            <p className="text-sm font-bold text-slate-800 break-all tracking-wide">
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
              ລະຫັດອ້າງອີງ LDB (LDB Ref)
            </span>
            <p className="text-sm font-mono font-semibold text-blue-600 break-all">
              {item.LDB_REF || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Card 2: Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
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

        <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50/10 p-6 shadow-sm transition-all hover:shadow-md">
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

        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/10 p-6 shadow-sm transition-all hover:shadow-md">
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

      {/* Card 3: Detail Grid */}
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

        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 shadow-xl shadow-slate-900/5 text-white flex flex-col justify-between">
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
                {item.BANK_DETAIL || "ບໍ່ມີລາຍລະອຽດເພີ່ມເຕີມຈາກລະບົບ"}
              </p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-1.5">
            <Clock size={12} />
            <span>ກວດສອບຫຼ້າສຸດ: {formatDate(item.DATE_TIME)}</span>
          </div>
        </div>
      </div>

      {/* Divider between cards */}
      {index < total - 1 && (
        <div className="flex items-center gap-3 py-2">
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

// ── Main Page Content ─────────────────────────────────────────────────────────

function PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const billNumber = searchParams.get("billNumber")?.trim() ?? "";
  const caseNumber = searchParams.get("caseNumber")?.trim() ?? "";
  const typeStatus = searchParams.get("type_status") ?? "";
  const status = typeStatus || null;

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const isClosed = status === "ປິດເຄສສຳເລັດແລ້ວ";

  const { data, isLoading, isError, refetch, isFetching } =
    useGet_Reward_LDB_STMT(billNumber);

    console.log("[PageContent] billNumber:",data);
  const statementData: STMT_LDB_ENTITY[] = data
    ? Array.isArray(data)
      ? data
      : [data]
    : [];
  const hasData = statementData.length > 0;

  // ── Loading State ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-7xl space-y-6">
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-sm font-medium text-blue-700 backdrop-blur-sm">
            <Loader2 size={18} className="animate-spin text-blue-600" />
            ກຳລັງໂຫຼດຂໍ້ມູນ Statement LDB... (ອາດໃຊ້ເວລາປະມານ 1-4 ນາທີ)
          </div>
          <Skeleton />
        </div>
      </div>
    );
  }

  // ── Error / Empty State ──────────────────────────────────────────────────
  if (isError || !hasData) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-2xl text-center space-y-6">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-10 shadow-xl shadow-slate-100 ring-1 ring-red-50">
            <div className="p-4 bg-red-50 rounded-full text-red-500 mb-4 animate-bounce">
              <AlertCircle size={44} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              ບໍ່ສາມາດດຶງຂໍ້ມູນ Statement ໄດ້
            </h2>
            <p className="mt-2 text-sm text-slate-500 max-w-md">
              ກະລຸນາກວດສອບຄວາມຖືກຕ້ອງຂອງ{" "}
              <span className="font-semibold text-slate-700">Bill Number</span>{" "}
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
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={isFetching ? "animate-spin" : ""}
                />
                ລອງໃໝ່ອີກຄັ້ງ
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
      <div className="mx-auto max-w-[90rem] space-y-6 animate-fade-in">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-all hover:text-slate-900 hover:border-slate-300 active:scale-95 self-start"
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            ກັບຄືນ
          </button>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Result count badge */}
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 shadow-sm">
              ພົບ{" "}
              <span className="font-bold text-blue-600">{statementData.length}</span>{" "}
              ລາຍການ
            </span>

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 shadow-sm"
            >
              <RefreshCw
                size={14}
                className={isFetching ? "animate-spin" : ""}
              />
              ໂຫຼດໃໝ່
            </button>

            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              disabled={isClosed}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95 ${
                isClosed
                  ? "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
                  : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/10"
              }`}
            >
              <Edit3 size={14} />
              ອັບເດດສະຖານະເຄສ
            </button>
          </div>
        </div>

        {/* Statement Cards — one per item in array */}
        {statementData.map((item: STMT_LDB_ENTITY, index: number) => (
          <StatementCard
            key={item.LDB_REF || `stmt-${index}`}
            item={item}
            index={index}
            total={statementData.length}
            status={status}
            billNumber={billNumber}
          />
        ))}

        {/* Modal */}
        <Modal_Update_case
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          caseNumber={caseNumber}
        />
      </div>
    </div>
  );
}

// ── Export Entry Point ────────────────────────────────────────────────────────

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