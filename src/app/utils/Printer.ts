// utils/exporter.ts
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { ColDef } from "@/lib/ldb_table_config";

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

function fmtNumber(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDate(v: unknown): string {
  if (!v) return "—";
  return String(v).slice(0, 10);
}

function fmtDiff(v: unknown): { text: string; color: string } {
  const n = Number(v);
  if (isNaN(n) || v == null) return { text: "—",  color: "#000000" };
  if (n === 0)               return { text: "0",   color: "#000000" };
  if (n > 0)                 return { text: `+${fmtNumber(n)}`, color: "#dc2626" };
  return                            { text: fmtNumber(n),        color: "#16a34a" };
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

export const printTable = <T extends Record<string, unknown>>(
  data: T[],
  cols: ColDef[],
  title?: string
) => {
  if (!data || data.length === 0) return;

  const colCount = cols.length;
  const isWide   = colCount >= 10;

  const FONT_LAO = "'Noto Sans Lao', sans-serif";
  const FONT_NUM = "'Arial Narrow', Arial, sans-serif";

  // ── thead ──────────────────────────────────────────────────────────────────
  const theadHTML = cols
    .map((col) =>
      `<th style="text-align:center">${col.label}</th>`
    )
    .join("");

  // ── tbody ──────────────────────────────────────────────────────────────────
  const tbodyHTML = data
    .map((row, i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#f5f5f5";
      const tds = cols
        .map((col) => {
          const align = col.align === "right" ? "text-align:right" : "text-align:left";
          let style   = `${align};background:${bg}`;
          let display = "";

          if (col.format === "date") {
            display = fmtDate(row[col.key]);
            style  += `;font-family:${FONT_NUM}`;
          } else if (col.format === "number") {
            display = fmtNumber(row[col.key]);
            style  += `;font-family:${FONT_NUM}`;
          } else if (col.format === "diff") {
            const { text, color } = fmtDiff(row[col.key]);
            display = text;
            style  += `;font-family:${FONT_NUM};font-weight:600;color:${color}`;
          } else {
            display = String(row[col.key] ?? "—");
            style  += `;font-family:${FONT_LAO}`;
          }

          return `<td style="${style}">${display}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  // ── tfoot ──────────────────────────────────────────────────────────────────
  const sumRow = cols.map((col) => {
    if (col.format === "number" || col.format === "diff") {
      const total = data.reduce((acc, r) => acc + (Number(r[col.key]) || 0), 0);
      return { value: total, col };
    }
    return { value: null, col };
  });

  const tfootHTML = `
    <tr>
      ${sumRow
        .map(({ value, col }, i) => {
          const align    = col.align === "right" ? "text-align:right" : "text-align:left";
          const isNum    = col.format === "number" || col.format === "diff";
          const fontFace = isNum ? FONT_NUM : FONT_LAO;

          let display    = "";
          let extraStyle = "";

          if (i === 0) {
            display = "ລວມ";
          } else if (value !== null && col.format === "diff") {
            const { text, color } = fmtDiff(value);
            display    = text;
            extraStyle = `color:${color}`;
          } else if (value !== null) {
            display = fmtNumber(value);
          }

          return `<td style="${align};font-family:${fontFace};${extraStyle}">${display}</td>`;
        })
        .join("")}
    </tr>`;

  // ── html ───────────────────────────────────────────────────────────────────
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>${title ?? "Export"}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;600&display=swap" rel="stylesheet"/>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }

        body {
          font-family: ${FONT_LAO};
          font-size: 11px;
          color: #000000;
          background: #ffffff;
          padding: 20px 28px;
        }

        /* ── print header ── */
        .print-header {
          width: 100%;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 14px;
          padding-bottom: 8px;
          border-bottom: 1.5px solid #000000;
        }

        .print-title {
          font-family: ${FONT_LAO};
          font-size: 13px;
          font-weight: 600;
          color: #000000;
        }

        .print-meta {
          font-family: ${FONT_NUM};
          font-size: 10px;
          color: #555555;
        }

        /* ── table ── */
        .table-wrap { width: 100%; }

        table {
          border-collapse: collapse;
          width: 100%;
          table-layout: ${isWide ? "fixed" : "auto"};
          font-size: 10px;
          color: #000000;
          background: #ffffff;
        }

        /* ── thead ── */
        thead th {
          font-family: ${FONT_LAO};
          font-size: 10px;
          font-weight: 600;
          color: #000000;
          background: #ffffff;
          padding: 6px 10px;
          border: 0.75px solid #000000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
        }

        /* ── tbody ── */
        tbody td {
          color: #000000;
          background: #ffffff;
          padding: 4px 10px;
          border: 0.5px solid #cccccc;
          vertical-align: middle;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        tbody tr:nth-child(even) td {
          background: #f5f5f5;
        }

        /* ── tfoot ── */
        tfoot td {
          font-weight: 600;
          font-size: 10px;
          color: #000000;
          background: #ffffff;
          padding: 5px 10px;
          border: 0.75px solid #000000;
          white-space: nowrap;
        }

        /* ── print ── */
        @media print {
          body { padding: 0; }
          @page { margin: 10mm 8mm; size: A4 landscape; }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          thead th {
            color: #000000 !important;
            background: #ffffff !important;
            border: 0.75px solid #000000 !important;
          }

          tbody td {
            color: #000000 !important;
            background: #ffffff !important;
            border: 0.5px solid #cccccc !important;
          }

          tbody tr:nth-child(even) td {
            background: #f5f5f5 !important;
          }

          tfoot td {
            color: #000000 !important;
            background: #ffffff !important;
            border: 0.75px solid #000000 !important;
          }
        }
      </style>
    </head>
    <body>

      <div class="print-header">
        <span class="print-title">${title ?? "LDB Reconciliation"}</span>
        <span class="print-meta">
          ພິມວັນທີ: ${new Date().toLocaleDateString("lo-LA", {
            year: "numeric", month: "long", day: "numeric",
          })} &nbsp;|&nbsp; ຈຳນວນ: ${data.length} ລາຍການ
        </span>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr>${theadHTML}</tr></thead>
          <tbody>${tbodyHTML}</tbody>
          <tfoot>${tfootHTML}</tfoot>
        </table>
      </div>

    </body>
    </html>
  `;

  const win = window.open("", "_blank", "width=1200,height=800");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
};