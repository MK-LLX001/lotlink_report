"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import {
    ArrowLeft,
    RefreshCw,
    AlertCircle,
    Loader2,
    TrendingUp,
    TrendingDown,
    ArrowDownLeft,
    ArrowUpRight,
    Landmark,
    Hash,
    Search,
} from "lucide-react";
import { useGet_Stmt_SPIN } from "@/app/CASES-LOTTO/hooks/hook_spin";
import { formatDate } from "../utils/FormatDate";
import { formatMoney } from "../utils/FormartMoney";
import { Badge } from "../../components/Badge";
import { Row } from "../../components/Row";
import { Card } from "../../components/Card";
import { STMT_SPIN_ENTITY } from "../CASES-LOTTO/types/Type_spin";

/* ─── TxnBadge ───────────────────────────────────────────────────────────── */
function TxnBadge({ type }: { type?: string | null }) {
    return <Badge value={type ?? null} />;
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function Skeleton() {
    return (
        <div className="animate-pulse space-y-6">
            <div className="h-10 w-32 rounded-xl bg-slate-200" />
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="h-8 w-64 rounded-lg bg-slate-200" />
                <div className="mt-4 grid grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 rounded-xl bg-slate-100" />
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-slate-200" />
                ))}
            </div>
        </div>
    );
}

/* ─── SummaryCard ────────────────────────────────────────────────────────── */
function SummaryCard({
    icon,
    label,
    value,
    accent,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent: string;
}) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div
                className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${accent}`}
            />
            <div className="flex items-start justify-between gap-3 pl-3">
                <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                        {label}
                    </p>
                    <p className="mt-1.5 text-xl font-bold text-slate-800">{value}</p>
                </div>
                <div className={`rounded-xl p-2.5 ${accent} bg-opacity-10`}>{icon}</div>
            </div>
        </div>
    );
}

/* ─── RowCard ─────────────────────────────────────────────────────────────── */
function RowCard({ item, index }: { item: STMT_SPIN_ENTITY; index: number }) {
    const isDeposit = item.DEPOSIT > 0;
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            {/* Top bar */}
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                    {index + 1}
                </span>
                <TxnBadge type={item.TXN_TYPE} />
                <span className="ml-auto text-xs text-slate-400">
                    {formatDate(item.BANK_DATE)}
                </span>
            </div>

            {/* Body */}
            <div className="p-5">
                <p className="mb-4 text-sm text-slate-700">{item.BANK_DETAIL || "—"}</p>

                <div className="divide-y divide-slate-50">
                    <Row label="ທະນາຄານ" value={item.BANK_NAME || "—"} />
                    <Row label="ລະຫັດທຸລະກຳ" value={item.BANK_TXN_ID || "—"} />
                    <Row label="ລະຫັດງວດ" value={item.DRAWID || "—"} />
                    <Row label="ເລກທີໃບບິນ" value={item.BILLNUMBER || "—"} />
                    <Row label="ເລກອ້າງອີງ" value={item.XREF || "—"} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[11px] uppercase tracking-widest text-slate-400">
                            ຍອດຖອນ
                        </p>
                        <p className="mt-1 text-sm font-bold text-rose-600">
                            {item.WITHDRAW ? formatMoney(item.WITHDRAW) : "—"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[11px] uppercase tracking-widest text-slate-400">
                            ຍອດຝາກ
                        </p>
                        <p className="mt-1 text-sm font-bold text-emerald-600">
                            {item.DEPOSIT ? formatMoney(item.DEPOSIT) : "—"}
                        </p>
                    </div>
                    <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <span
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold ${isDeposit
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-rose-50 text-rose-600"
                                }`}
                        >
                            {isDeposit ? (
                                <ArrowDownLeft size={12} />
                            ) : (
                                <ArrowUpRight size={12} />
                            )}
                            {isDeposit ? "ເຂົ້າ" : "ອອກ"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── SearchBar ──────────────────────────────────────────────────────────── */
function SearchBar({
    searchInput,
    setSearchInput,
    onSearch,
    isFetching,
}: {
    searchInput: string;
    setSearchInput: (v: string) => void;
    onSearch: () => void;
    isFetching: boolean;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                    <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) =>
                            setSearchInput(e.target.value.replace(/\s+/g, ""))
                        }
                        onKeyDown={(e) => {
                            if (e.key === "Enter") onSearch();
                        }}
                        placeholder="ປ້ອນເລກ Case Number ເພື່ອຄົ້ນຫາ..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                </div>
                <button
                    onClick={onSearch}
                    disabled={!searchInput.trim() || isFetching}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {isFetching ? (
                        <Loader2 size={15} className="animate-spin" />
                    ) : (
                        <Search size={15} />
                    )}
                    ຄົ້ນຫາ
                </button>
            </div>
        </div>
    );
}

/* ─── PageContent ────────────────────────────────────────────────────────── */
function PageContent() {
    const searchParams = useSearchParams();

    const initialCase = (searchParams.get("case_number") ?? "")
        .replace(/\s+/g, "")
        .trim();
    const errorType = searchParams.get("error_type") ?? "";
    const typeStatus = searchParams.get("type_status") ?? "";

    // caseNumber = the value actually used for fetching (only updates on search)
    // searchInput = the live value of the input box
    const [caseNumber, setCaseNumber] = useState(initialCase);
    const [searchInput, setSearchInput] = useState(initialCase);

    const { data, isLoading, isError, refetch, isFetching } =
        useGet_Stmt_SPIN(caseNumber);

    const handleSearch = () => {
        const trimmed = searchInput.replace(/\s+/g, "").trim();
        if (!trimmed) return;
        setCaseNumber(trimmed);
    };

    /* ── Idle: no case number yet, waiting for user to search ── */
    if (!caseNumber) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <SearchBar
                        searchInput={searchInput}
                        setSearchInput={setSearchInput}
                        onSearch={handleSearch}
                        isFetching={isFetching}
                    />

                    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
                        <Search size={40} className="text-slate-300" />
                        <p className="mt-4 text-base font-semibold text-slate-700">
                            ກະລຸນາປ້ອນເລກ Case Number
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            ປ້ອນເລກ Case Number ແລ້ວກົດປຸ່ມຄົ້ນຫາ ຫຼື ກົດ Enter
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Loading ── */
    if (isLoading)
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-7xl space-y-6">
                    <SearchBar
                        searchInput={searchInput}
                        setSearchInput={setSearchInput}
                        onSearch={handleSearch}
                        isFetching={isFetching}
                    />
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 size={14} className="animate-spin" />
                        ກຳລັງໂຫຼດຂໍ້ມູນ... (ອາດໃຊ້ເວລາຫຼາຍກວ່າ 4 ນາທີ)
                    </div>
                    <Skeleton />
                </div>
            </div>
        );

    /* ── Error ── */
    const is404 = isError; // 404 = ຂໍ້ມູນບໍ່ມີໃນລະບົບ
    const isEmpty = !data || (Array.isArray(data) && data.length === 0);

    if (is404 || isEmpty)
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="mx-auto max-w-7xl space-y-6">
                    <SearchBar
                        searchInput={searchInput}
                        setSearchInput={setSearchInput}
                        onSearch={handleSearch}
                        isFetching={isFetching}
                    />

                    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-12 shadow-sm">
                        <AlertCircle
                            size={40}
                            className={is404 ? "text-orange-400" : "text-red-400"}
                        />
                        <p className="mt-4 text-base font-semibold text-slate-700">
                            {is404 ? "ຂໍອະໄພຂໍ້ມູນບໍ່ມີໃນລະບົບ" : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            {is404
                                ? "ກະລຸນາກວດສອບ Case Number ຫຼື ຕິດຕໍ່ທີມງານ"
                                : "ກະລຸນາລອງໃໝ່ ຫຼື ກວດສອບ Case Number"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">{caseNumber}</p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => refetch()}
                                disabled={isFetching}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
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
            </div>
        );

    /* ── Derived data ── */
    const rows = Array.isArray(data) ? data : [data];
    const first = rows[0];
    const totalWithdraw = rows.reduce((s, r) => s + (r.WITHDRAW || 0), 0);
    const totalDeposit = rows.reduce((s, r) => s + (r.DEPOSIT || 0), 0);
    const netAmount = totalDeposit - totalWithdraw;

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-fit space-y-6">
                {/* ── Search + Refresh ── */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                        <SearchBar
                            searchInput={searchInput}
                            setSearchInput={setSearchInput}
                            onSearch={handleSearch}
                            isFetching={isFetching}
                        />
                    </div>

                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:opacity-40"
                    >
                        <RefreshCw
                            size={13}
                            className={isFetching ? "animate-spin" : ""}
                        />
                        ໂຫຼດໃໝ່
                    </button>
                </div>

                {/* ── Header Card ── */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-400 to-sky-300" />
                    <div className="flex flex-col gap-6 p-6 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Landmark size={20} className="text-blue-600" />
                                <h1 className="text-xl font-bold text-slate-800">
                                    ລາຍການຊຳລະລາງວັນ Spin
                                </h1>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                ຂໍ້ມູນການກວດສອບຜົນ Spin ແລະ ການຈ່າຍລາງວັນ
                            </p>
                            <p className="mt-2 text-xs font-medium text-blue-600">
                                ໝາຍເລກເຄສ: {caseNumber || "—"}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Card title="ຊື່ທະນາຄານ" value={first.BANK_NAME || "—"} />
                            <Card title="ລະຫັດງວດ" value={first.DRAWID || "—"} />
                            <Card title="ເລກທີໃບບິນ" value={first.XREF || "—"} />
                            <Card title="ວັນທີທະນາຄານ" value={formatDate(first.BANK_DATE)} />
                        </div>
                    </div>
                </div>

                {/* ── Summary Cards ── */}
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <SummaryCard
                        icon={<Hash size={18} className="text-slate-600" />}
                        label="ຈຳນວນລາຍການທັງໝົດ"
                        value={String(rows.length)}
                        accent="bg-slate-400"
                    />
                    <SummaryCard
                        icon={<TrendingDown size={18} className="text-rose-500" />}
                        label="ຍອດຖອນທັງໝົດ"
                        value={formatMoney(totalWithdraw)}
                        accent="bg-rose-500"
                    />
                    <SummaryCard
                        icon={<TrendingUp size={18} className="text-emerald-500" />}
                        label="ຍອດຝາກທັງໝົດ"
                        value={formatMoney(totalDeposit)}
                        accent="bg-emerald-500"
                    />
                    <SummaryCard
                        icon={
                            netAmount >= 0 ? (
                                <TrendingUp size={18} className="text-blue-600" />
                            ) : (
                                <TrendingDown size={18} className="text-amber-500" />
                            )
                        }
                        label="ຍອດສຸດທິ"
                        value={formatMoney(Math.abs(netAmount))}
                        accent={netAmount >= 0 ? "bg-blue-600" : "bg-amber-500"}
                    />
                </div>

                {/* ── Context Info ── */}
                {(errorType || typeStatus) && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {errorType && <Card title="ປະເພດຂໍ້ຜິດພາດ" value={errorType} />}
                        {typeStatus && <Card title="ສະຖານະ" value={typeStatus} />}
                    </div>
                )}

                {/* ── Transaction Detail Cards ── */}
                <div>
                    <h2 className="mb-3 text-base font-bold text-slate-700">
                        ລາຍລະອຽດທຸລະກຳ
                    </h2>
                    <div className="space-y-4">
                        {rows.map((item, i) => (
                            <RowCard key={`${item.BANK_TXN_ID}-${i}`} item={item} index={i} />
                        ))}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
                        <h2 className="text-sm font-bold text-slate-700">ຕາຕະລາງລາຍການ</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    {[
                                        "ລ/ດ",
                                        "ປະເພດທຸລະກຳ",
                                        "ທະນາຄານ",
                                        "ເລກອ້າງອີງ",
                                        "ຍອດຖອນ",
                                        "ຍອດຝາກ",
                                        "ວັນທີ",
                                        "ເລກໃບບິນ",
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
                                        key={`row-${i}`}
                                        className="transition-colors hover:bg-blue-50/40"
                                    >
                                        <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                                        <td className="px-4 py-3">
                                            <TxnBadge type={item.TXN_TYPE} />
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {item.BANK_NAME || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {item.XREF || "—"}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-rose-600">
                                            {item.WITHDRAW ? formatMoney(item.WITHDRAW) : "—"}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-emerald-600">
                                            {item.DEPOSIT ? formatMoney(item.DEPOSIT) : "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                            {formatDate(item.BANK_DATE)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {item.BILLNUMBER || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pb-6" />
            </div>
        </div>
    );
}

/* ─── Export ─────────────────────────────────────────────────────────────── */
export default function stmt_SPIN() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 size={16} className="animate-spin" />
                        ກຳລັງໂຫຼດ...
                    </div>
                </div>
            }
        >
            <PageContent />
        </Suspense>
    );
}