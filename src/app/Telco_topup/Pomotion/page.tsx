// src/app/Telco_topup/promotion/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { FilterBar, FilterValues } from "@/components/FilterBar";
import { useGetPromotion } from "../hooks/hook.pomotions";
import { PromotionEntity } from "../types/types.pomotion";


// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/**
 * กันพังถ้า backend ยังส่งข้อมูลมาเป็น object เดี่ยว (ไม่ใช่ array)
 * - null/undefined          -> []
 * - array                   -> array เดิม
 * - object เดี่ยว            -> ห่อเป็น [object]
 */
function normalizeToArray<T>(data: T | T[] | null | undefined): T[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === "object") return [data as T];
    return [];
}

function formatNumber(n: number | undefined | null): string {
    if (n === undefined || n === null || Number.isNaN(n)) return "0";
    return n.toLocaleString("en-US");
}

function safeSum(rows: PromotionEntity[], key: keyof PromotionEntity): number {
    return rows.reduce((sum, row) => {
        const v = row?.[key];
        return sum + (typeof v === "number" ? v : 0);
    }, 0);
}

// ─────────────────────────────────────────────────────────
// Summary Card
// ─────────────────────────────────────────────────────────
function SummaryCard({ rows }: { rows: PromotionEntity[] }) {
    const totals = useMemo(
        () => ({
            txnTotal: safeSum(rows, "PROMO_TXN_TOTAL"),
            amtTotal: safeSum(rows, "AMT_TOTAL"),
            txnLtc: safeSum(rows, "TXN_LTC"),
            amtLtc: safeSum(rows, "AMT_LTC"),
            txnTplus: safeSum(rows, "TXN_TPLUS"),
            amtTplus: safeSum(rows, "AMT_TPLUS"),
            txnEtl: safeSum(rows, "TXN_ETL"),
            amtEtl: safeSum(rows, "AMT_ETL"),
            txnUnitel: safeSum(rows, "TXN_UNITEL"),
            amtUnitel: safeSum(rows, "AMT_UNITEL"),
        }),
        [rows]
    );

    const cards = [
        { label: "ລວມທັງໝົດ", txn: totals.txnTotal, amt: totals.amtTotal, color: "bg-slate-700" },
        { label: "LTC", txn: totals.txnLtc, amt: totals.amtLtc, color: "bg-blue-600" },
        { label: "TPLUS", txn: totals.txnTplus, amt: totals.amtTplus, color: "bg-emerald-600" },
        { label: "ETL", txn: totals.txnEtl, amt: totals.amtEtl, color: "bg-amber-600" },
        { label: "UNITEL", txn: totals.txnUnitel, amt: totals.amtUnitel, color: "bg-rose-600" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            {cards.map((c) => (
                <div
                    key={c.label}
                    className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
                >
                    <div className={`h-1 ${c.color}`} />
                    <div className="p-4">
                        <p className="text-xs font-medium text-slate-500 mb-2">{c.label}</p>
                        <p className="text-lg font-bold text-slate-800">{formatNumber(c.amt)}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatNumber(c.txn)} ລາຍການ</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Table
// ─────────────────────────────────────────────────────────
const columns: { key: keyof PromotionEntity; label: string; align?: "right" | "left" }[] = [
    { key: "PROMO_DATE", label: "ວັນທີ", align: "left" },
    { key: "PROMO_TXN_TOTAL", label: "ຈຳນວນລາຍການ", align: "right" },
    { key: "AMT_TOTAL", label: "ຍອດລວມ", align: "right" },
    { key: "TXN_LTC", label: "LTC (ລາຍການ)", align: "right" },
    { key: "AMT_LTC", label: "LTC (ຍອດ)", align: "right" },
    { key: "TXN_TPLUS", label: "TPLUS (ລາຍການ)", align: "right" },
    { key: "AMT_TPLUS", label: "TPLUS (ຍອດ)", align: "right" },
    { key: "TXN_ETL", label: "ETL (ລາຍການ)", align: "right" },
    { key: "AMT_ETL", label: "ETL (ຍອດ)", align: "right" },
    { key: "TXN_UNITEL", label: "UNITEL (ລາຍການ)", align: "right" },
    { key: "AMT_UNITEL", label: "UNITEL (ຍອດ)", align: "right" },
];

function PromotionTable({ rows }: { rows: PromotionEntity[] }) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`px-3 py-2 font-semibold text-slate-600 whitespace-nowrap ${
                                    col.align === "right" ? "text-right" : "text-left"
                                }`}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr
                            key={`${row?.PROMO_DATE ?? "row"}-${idx}`}
                            className="border-t border-slate-100 hover:bg-slate-50"
                        >
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className={`px-3 py-2 whitespace-nowrap ${
                                        col.align === "right" ? "text-right" : "text-left"
                                    }`}
                                >
                                    {col.key === "PROMO_DATE"
                                        ? row?.PROMO_DATE ?? "-"
                                        : formatNumber(row?.[col.key] as number)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─────────────────────────────────────────────────────────
// Export Excel
// ─────────────────────────────────────────────────────────
function exportToExcel(rows: PromotionEntity[], fromDate?: string, toDate?: string) {
    if (rows.length === 0) return;

    const exportData = rows.map((row) => ({
        "ວັນທີ": row.PROMO_DATE,
        "ຈຳນວນລາຍການ": row.PROMO_TXN_TOTAL,
        "ຍອດລວມ": row.AMT_TOTAL,
        "LTC (ລາຍການ)": row.TXN_LTC,
        "LTC (ຍອດ)": row.AMT_LTC,
        "TPLUS (ລາຍການ)": row.TXN_TPLUS,
        "TPLUS (ຍອດ)": row.AMT_TPLUS,
        "ETL (ລາຍການ)": row.TXN_ETL,
        "ETL (ຍອດ)": row.AMT_ETL,
        "UNITEL (ລາຍການ)": row.TXN_UNITEL,
        "UNITEL (ຍອດ)": row.AMT_UNITEL,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Promotion");

    const fileName = `promotion_${fromDate ?? "all"}_${toDate ?? "all"}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

// ─────────────────────────────────────────────────────────
// หน้าหลัก
// ─────────────────────────────────────────────────────────
function Page() {
    const [filters, setFilters] = useState<FilterValues | null>(null);

    const { data, isLoading, error } = useGetPromotion(
        filters ? new Date(filters.fromDate) : null,
        filters ? new Date(filters.toDate) : null
    );

    const handleSearch = ({ fromDate, toDate }: FilterValues) => {
        setFilters({ fromDate, toDate, keyword: "" });
    };

    // กันพังถ้า API ยังส่งมาเป็น object เดี่ยว ไม่ใช่ array (ยังไม่ได้แก้ backend)
    const rows: PromotionEntity[] = normalizeToArray<PromotionEntity>(data as any);

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="bg-white p-4 border shadow-sm rounded-lg border-slate-200 flex flex-wrap items-center justify-between gap-2 mb-4">
                <FilterBar
                    showDateRange
                    keywordLabel="ເລກ Case Number"
                    keywordPlaceholder="ປ້ອນເລກ Case Number"
                    onSearch={handleSearch}
                />

                {filters && rows.length > 0 && (
                    <button
                        onClick={() => exportToExcel(rows, filters.fromDate, filters.toDate)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap"
                    >
                        <Download size={16} />
                        Export Excel
                    </button>
                )}
            </div>

            <h1 className="text-2xl font-bold mb-4">Promotion</h1>

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

            {filters && !isLoading && !error && rows.length === 0 && (
                <p className="mt-4 text-sm text-slate-400">
                    ບໍ່ມີຂໍ້ມູນໃນຊ່ວງວັນທີທີ່ເລືອກ
                </p>
            )}

            {filters && !isLoading && !error && rows.length > 0 && (
                <>
                    <SummaryCard rows={rows} />
                    <PromotionTable rows={rows} />
                </>
            )}
        </div>
    );
}

export default Page;