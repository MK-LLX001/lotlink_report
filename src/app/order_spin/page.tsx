"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  Loader2,
  Search,
  Hash,
  Dice5,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useGet_Order_SPIN } from "@/app/CASES-LOTTO/hooks/hook_spin";
import { formatDate } from "../utils/FormatDate";
import Link from "next/link";
// ── Types ──────────────────────────────────────────────────────────────────────

export interface ORDER_SPIN_ENTITY {
  TXTIME: string;
  USERID: string;
  DRAWID: string;
  SPINRESULT: string;
  WINAMOUNT: number;
  WINXREF: string;
  WINJOURNAL: string;
  WINCHANNEL: string;
  WINACCOUNT: string;
  CORERESULT: string;
}

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
        <Link
          href="/order_spin/winner"
          className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          ເບີງລາຍການທີ່ຖືກລາງວັນທັງໝົດ
        </Link>
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

// ── Section Divider ───────────────────────────────────────────────────────────

function SectionDivider({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="col-span-2 flex items-center gap-2 bg-slate-50 px-4 py-2 border-b border-slate-100">
      <Icon size={13} className="text-slate-400" />
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </span>
    </div>
  );
}

// ── Data Row ──────────────────────────────────────────────────────────────────

function DataRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-white">
        <Icon size={14} className="text-slate-400 shrink-0" />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className="flex items-center px-4 py-3 border-b border-slate-100 bg-white text-sm text-slate-800 break-all">
        {children}
      </div>
    </>
  );
}

// ── CoreResult Badge ──────────────────────────────────────────────────────────

function CoreResultBadge({ value }: { value: string }) {
  const isSuccess =
    value?.toUpperCase() === "SUCCESS" || value?.toUpperCase() === "00";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isSuccess ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
      }`}
    >
      {isSuccess ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {value || "—"}
    </span>
  );
}

// ── Win Amount Display ────────────────────────────────────────────────────────

function WinAmountDisplay({ amount }: { amount: number }) {
  const formatted =
    typeof amount === "number"
      ? amount.toLocaleString("lo-LA")
      : String(amount ?? "—");
  return (
    <span className="text-base font-semibold text-green-700">
      {formatted}{" "}
      <span className="text-xs font-normal text-slate-400">ກີບ</span>
    </span>
  );
}

// ── Spin Result Badge ─────────────────────────────────────────────────────────

function SpinResultBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
      <Dice5 size={11} />
      {value || "—"}
    </span>
  );
}

// ── Main Page Content ─────────────────────────────────────────────────────────

function PageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const caseNumber = searchParams.get("case_number") ?? "";
  const errorType = searchParams.get("error_type") ?? "";
  const typeStatus = searchParams.get("type_status") ?? "";

  const [inputValue, setInputValue] = useState(caseNumber);
  const [inputError, setInputError] = useState("");

  const errorLabel = ERROR_LABEL[errorType] ?? errorType ?? "-";
  const status = typeStatus || null;

  const { data, isLoading, isError, refetch, isFetching } =
    useGet_Order_SPIN(caseNumber);

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

  const searchBarProps: SearchBarProps = {
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
          <p className="text-sm pl-5 text-slate-400">
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

  // ── Main UI ໍໍໍ===== ==> -->  ────────────────────────────────────────────────────────────────
  // ── Main UI ─────────────────────────────────────────────────────────────────
  const rows = Array.isArray(data) ? data : data ? [data] : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased p-4 md:p-8">
      <div className="mx-auto max-w-fit space-y-6">
        <SearchBar {...searchBarProps} />

        {errorLabel && errorLabel !== "-" && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle size={16} className="shrink-0 text-amber-500" />
            <span>
              ປະເພດບັນຫາ: <span className="font-semibold">{errorLabel}</span>
            </span>
          </div>
        )}

        {/* Summary */}
        {rows.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Hash size={14} />
            ພົບທັງໝົດ{" "}
            <span className="font-bold text-slate-800">{rows.length}</span>{" "}
            ລາຍການ
          </div>
        )}

        {/* Table */}
        {rows.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-700">
                ຂໍ້ມູນ Order Spin
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "ລ/ດ",
                      "TXTIME",
                      "USERID",
                      "DRAWID",
                      "SPINRESULT",
                      "WINAMOUNT",
                      "WINXREF",
                      "WINJOURNAL",
                      "WINCHANNEL",
                      "WINACCOUNT",
                      "CORERESULT",
                    ].map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((item, i) => (
                    <tr
                      key={`${item.WINXREF}-${i}`}
                      className="transition-colors hover:bg-blue-50/40"
                    >
                      <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDate(item.TXTIME)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.USERID || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.DRAWID || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <SpinResultBadge value={item.SPINRESULT} />
                      </td>
                      <td className="px-4 py-3">
                        <WinAmountDisplay amount={item.WINAMOUNT} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                          {item.WINXREF || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.WINJOURNAL || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.WINCHANNEL || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {item.WINACCOUNT || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <CoreResultBadge value={item.CORERESULT} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detail cards (optional: แสดงเมื่อ 1 row) */}
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function ORDER_SPIN() {
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
