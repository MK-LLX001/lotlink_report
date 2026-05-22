// utils/exporter.ts
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { ColDef } from "@/lib/ldb_table_config";

// ── แปลง rows ให้ใช้ label แทน key ──────────────────────────────────────────
function mapRowsToLabels<T extends Record<string, unknown>>(
  data: T[],
  cols: ColDef[]
): Record<string, unknown>[] {
  return data.map((row) => {
    const mapped: Record<string, unknown> = {};
    cols.forEach((col) => {
      mapped[col.label] = row[col.key] ?? "";
    });
    return mapped;
  });
}

export const exportToCSV = <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  cols?: ColDef[]
) => {
  const rows = cols ? mapRowsToLabels(data, cols) : data;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${filename}.csv`);
};

export const exportToXLSX = async <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  cols?: ColDef[]
) => {
  const rows = cols ? mapRowsToLabels(data, cols) : data;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const xlsxBlob = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([xlsxBlob], { type: "application/octet-stream" });
  saveAs(blob, `${filename}.xlsx`);
};