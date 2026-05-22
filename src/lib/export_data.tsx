// components/ExportButtons.tsx
import { useState } from "react";
import { exportToCSV, exportToXLSX } from "../app/utils/export_XLSX.CSV";
import { printTable } from "../app/utils/Printer";
import { ColDef } from "@/lib/ldb_table_config";

interface ExportButtonsProps<T extends Record<string, unknown>> {
  data: T[];
  filename?: string;
  cols?: ColDef[];
  printTitle?: string;
  variant?: "download" | "print";  // ← แยก variant
}

const ExportButtons = <T extends Record<string, unknown>>({
  data,
  filename = "export",
  cols,
  printTitle,
  variant = "download",
}: ExportButtonsProps<T>) => {
  const [isExporting, setIsExporting] = useState<"xlsx" | "csv" | "print" | null>(null);

  const handleExport = async (type: "csv" | "xlsx" | "print") => {
    if (!data || data.length === 0 || isExporting) return;
    setIsExporting(type);
    try {
      if (type === "csv")       exportToCSV(data, filename, cols);
      else if (type === "xlsx") await exportToXLSX(data, filename, cols);
      else if (type === "print" && cols) printTable(data, cols as Parameters<typeof printTable>[1], printTitle ?? filename);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(null);
    }
  };

  const btn = "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-start";

  if (variant === "print") {
    return (
      <button
        onClick={() => handleExport("print")}
        disabled={!!isExporting || !cols}
        className={btn}
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
        </svg>
        {isExporting === "print" ? "ກຳລັງພິມ..." : "Print / PDF"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button onClick={() => handleExport("xlsx")} disabled={!!isExporting} className={btn}>
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        {isExporting === "xlsx" ? "ກຳລັງ Export..." : "Download XLSX"}
      </button>

      <button onClick={() => handleExport("csv")} disabled={!!isExporting} className={btn}>
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
        </svg>
        {isExporting === "csv" ? "ກຳລັງ Export..." : "Download CSV"}
      </button>
    </div>
  );
};

export default ExportButtons;