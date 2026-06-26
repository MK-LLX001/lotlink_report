// src/app/Telco_topup/mastersim/page.tsx
"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { FilterBar, FilterValues } from "@/components/FilterBar";
import { useGetMasterSim } from "../hooks/hook.mastersim";

// ── ชนิดข้อมูล 1 แถว = ยอดเงิน SIM ของวันนั้น แยกตาม provider ──
interface SimBalanceRow {
    TXN_DATE?: string;
    LTC_IDX?: number | null;
    LTC_TIME?: string | null;
    LTC_BALANCE?: string | number | null;
    TPLUS_IDX?: number | null;
    TPLUS_TIME?: string | null;
    TPLUS_BALANCE?: string | number | null;
    ETL_IDX?: number | null;
    ETL_TIME?: string | null;
    ETL_BALANCE?: string | number | null;
    UNITEL_IDX?: number | null;
    UNITEL_TIME?: string | null;
    UNITEL_BALANCE?: string | number | null;
}

const PROVIDER_STYLE = {
    LTC: { label: "LTC", dot: "bg-sky-500", text: "text-sky-700" },
    TPLUS: { label: "TPLUS", dot: "bg-violet-500", text: "text-violet-700" },
    ETL: { label: "ETL", dot: "bg-amber-500", text: "text-amber-700" },
    UNITEL: { label: "UNITEL", dot: "bg-emerald-500", text: "text-emerald-700" },
} as const;

type ProviderKey = keyof typeof PROVIDER_STYLE;
const PROVIDERS: ProviderKey[] = ["LTC", "TPLUS", "ETL", "UNITEL"];

function formatBalance(val?: string | number | null) {
    if (val === null || val === undefined || val === "") return "-";
    const num = Number(val);
    if (Number.isNaN(num)) return String(val);
    return num.toLocaleString("en-US");
}

function formatTime(val?: string | null) {
    if (!val) return "-";
    const parts = val.split(" ");
    return parts[1] ?? val;
}

function exportSimBalanceToExcel(rows: SimBalanceRow[]) {
    const sheetData = rows.map((row) => {
        const record: Record<string, string | number> = {
            "ວັນທີ": row.TXN_DATE ?? "-",
        };
        PROVIDERS.forEach((key) => {
            const idxKey = `${key}_IDX` as keyof SimBalanceRow;
            const timeKey = `${key}_TIME` as keyof SimBalanceRow;
            const balKey = `${key}_BALANCE` as keyof SimBalanceRow;
            record[`${key} - Idx`] = (row[idxKey] as number) ?? "-";
            record[`${key} - ເວລາ`] = (row[timeKey] as string) ?? "-";
            record[`${key} - ຍອດເງິນ`] = Number(row[balKey]) || 0;
        });
        return record;
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    worksheet["!cols"] = [
        { wch: 13 },
        ...PROVIDERS.flatMap(() => [{ wch: 10 }, { wch: 20 }, { wch: 16 }]),
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "SIM Balance");

    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `sim-balance-${today}.xlsx`);
}

// ── ตาราง + การ์ดสรุป ──
function SimBalanceTable({ data }: { data: SimBalanceRow[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-sm text-slate-400">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີທີ່ເລືອກ</p>
            </div>
        );
    }

    const latest = data[data.length - 1];

    return (
        <div className="space-y-4">
            {/* การ์ดสรุปยอดล่าสุดของแต่ละ provider */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {PROVIDERS.map((key) => {
                    const style = PROVIDER_STYLE[key];
                    const balance = latest[`${key}_BALANCE` as keyof SimBalanceRow];
                    const time = latest[`${key}_TIME` as keyof SimBalanceRow] as string | null;
                    return (
                        <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                                <span className="text-xs font-medium tracking-wide text-slate-500">
                                    {style.label}
                                </span>
                            </div>
                            <p className="mt-2 text-xl font-semibold text-slate-800 tabular-nums">
                                {formatBalance(balance)}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                                ອັບເດດລ່າສຸດ {formatTime(time)}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* ตารางรายวัน */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-700">ຍອດເງິນ SIM ປະຈຳວັນ</h2>
                        <p className="text-xs text-slate-400">{data.length} ວັນ</p>
                    </div>
                    <button
                        onClick={() => exportSimBalanceToExcel(data)}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-700"
                    >
                        <Download className="h-3.5 w-3.5" />
                        ດາວໂຫຼດ Excel
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px] text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70">
                                <th
                                    rowSpan={2}
                                    className="sticky left-0 z-10 bg-slate-50/70 px-4 py-2 text-left text-xs font-medium text-slate-500 align-bottom"
                                >
                                    ວັນທີ
                                </th>
                                {PROVIDERS.map((key) => (
                                    <th
                                        key={key}
                                        colSpan={3}
                                        className="border-l border-slate-100 px-4 py-2 text-center text-xs font-semibold"
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className={`h-1.5 w-1.5 rounded-full ${PROVIDER_STYLE[key].dot}`} />
                                            <span className={PROVIDER_STYLE[key].text}>{PROVIDER_STYLE[key].label}</span>
                                        </span>
                                    </th>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-200 bg-slate-50/70">
                                {PROVIDERS.map((key) => (
                                    <React.Fragment key={key}>
                                        <th className="border-l border-slate-100 px-3 py-1.5 text-right text-[11px] font-normal text-slate-400">Idx</th>
                                        <th className="px-3 py-1.5 text-center text-[11px] font-normal text-slate-400">ເວລາ</th>
                                        <th className="px-3 py-1.5 text-right text-[11px] font-normal text-slate-400">ຍອດເງິນ</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr
                                    key={row.TXN_DATE ?? i}
                                    className={`border-b border-slate-50 last:border-0 ${i % 2 === 1 ? "bg-slate-50/40" : ""} hover:bg-sky-50/40`}
                                >
                                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 text-xs font-medium text-slate-600">
                                        {row.TXN_DATE ?? "-"}
                                    </td>
                                    {PROVIDERS.map((key) => {
                                        const idx = row[`${key}_IDX` as keyof SimBalanceRow] as number | null;
                                        const time = row[`${key}_TIME` as keyof SimBalanceRow] as string | null;
                                        const balance = row[`${key}_BALANCE` as keyof SimBalanceRow];
                                        return (
                                            <React.Fragment key={key}>
                                                <td className="border-l border-slate-50 px-3 py-2.5 text-right text-xs text-slate-400 tabular-nums">
                                                    {idx ?? "-"}
                                                </td>
                                                <td className="px-3 py-2.5 text-center text-xs text-slate-500 tabular-nums">
                                                    {formatTime(time)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-xs font-medium text-slate-700 tabular-nums">
                                                    {formatBalance(balance)}
                                                </td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── หน้าหลัก ──
function Page() {
    const [filters, setFilters] = useState<FilterValues | null>(null);

    const { data, isLoading, error } = useGetMasterSim(
        filters ? new Date(filters.fromDate) : null,
        filters ? new Date(filters.toDate) : null
    );

    const handleSearch = ({ fromDate, toDate }: FilterValues) => {
        setFilters({ fromDate, toDate, keyword: "" });
    };

    // กันพังถ้า API ยังส่งมาเป็น object เดี่ยว ไม่ใช่ array
    const rows: SimBalanceRow[] = Array.isArray(data) ? data : data ? [data] : [];

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="fiteritems bg-white p-4 border shadow-sm rounded-lg border-slate-200 flex items-center justify-center gap-2 mb-4">
                <FilterBar
                    showDateRange
                    keywordLabel="ເລກ Case Number"
                    keywordPlaceholder="ປ້ອນເລກ Case Number"
                    onSearch={handleSearch}
                />
            </div>

            <h1 className="text-2xl font-bold mb-4">MasterSim</h1>

            {!filters && (
                <p className="mt-4 text-sm text-slate-400">
                    ກະລຸນາເລືອກວັນທີ ແລະ ກົດຄົ້ນຫາ
                </p>
            )}

            {filters && isLoading && (
                <p className="mt-4 text-sm text-slate-400">ກຳລັງໂຫຼດ...</p>
            )}

            {filters && error && (
                <p className="mt-4 text-sm text-red-500">ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ</p>
            )}

            {filters && !isLoading && !error && rows.length > 0 && (
                <SimBalanceTable data={rows} />
            )}
        </div>
    );
}

export default Page;