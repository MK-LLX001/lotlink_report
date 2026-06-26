// src/lib/exportSimToExcel.ts
import * as XLSX from "xlsx";
import { SIM_ENTITY } from "@/app/Telco_topup/types/types.SIM";

const PROVIDERS = ["LTC", "TPLUS", "ETL", "UNITEL"] as const;

export function exportSimBalanceToExcel(rows: SIM_ENTITY[], fileName = "sim-balance") {
    const sheetData = rows.map((row) => {
        const record: Record<string, string | number> = {
            "ວັນທີ": row.TXN_DATE ?? "-",
        };

        PROVIDERS.forEach((key) => {
            const idxKey = `${key}_IDX` as keyof SIM_ENTITY;
            const timeKey = `${key}_TIME` as keyof SIM_ENTITY;
            const balKey = `${key}_BALANCE` as keyof SIM_ENTITY;

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
    XLSX.writeFile(workbook, `${fileName}-${today}.xlsx`);
}