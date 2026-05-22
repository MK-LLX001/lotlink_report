// components/ReconTable.tsx
import { getColDefs, ColDef } from "@/lib/ldb_table_config";

// ─── formatters ───────────────────────────────────────────────────────────────
function fmtNumber(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(v: unknown): string {
  if (!v) return "—";
  return String(v).slice(0, 10); // Oracle returns "YYYY-MM-DD" string already
}

// ─── diff cell (สีแดง/เขียวตามค่า) ──────────────────────────────────────────
function DiffCell({ value }: { value: unknown }) {
  const n = Number(value);
  if (isNaN(n) || value == null) return <span className="text-gray-400">—</span>;
  if (n === 0)
    return <span className="text-gray-500 font-medium tabular-nums">0</span>;
  if (n > 0)
    return (
      <span className="text-red-500 font-semibold tabular-nums">
        +{fmtNumber(n)}
      </span>
    );
  return (
    <span className="text-green-600 font-semibold tabular-nums">
      {fmtNumber(n)}
    </span>
  );
}

// ─── summary footer ───────────────────────────────────────────────────────────
function sumCol(rows: Record<string, unknown>[], key: string): number {
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

// ─── main component ───────────────────────────────────────────────────────────
interface Props {
  rows:    Record<string, unknown>[];
  account: string;
}

export function ReconTable({ rows, account }: Props) {
  const cols = getColDefs(account);
  const numericCols = cols.filter((c) => c.format === "number" || c.format === "diff");

  if (rows.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

      {/* ── table header bar ── */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">ຜົນລັບ</span>
        <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-mono">
          {rows.length} ລາຍການ
        </span>
      </div>

      {/* ── scrollable table ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">

          {/* thead */}
          <thead>
            <tr className="bg-slate-700 text-white text-xs uppercase tracking-wide ">
              {cols.map((col) => (
                <th
                  key={col.key}
                  className={`
                    px-4 py-3 font-medium whitespace-nowrap  
                    ${col.align === "right"  ? "text-right"  : ""}
                    ${col.align === "center" ? "text-center" : ""}
                    ${col.align === "left" || !col.align ? "text-left" : ""}
                    ${col.highlight ? "text-yellow-300" : ""}
                  `}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* tbody */}
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`
                  border-b border-gray-50 transition-colors
                  ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                  hover:bg-blue-50/40
                `}
              >
                {cols.map((col) => (
                  <td
                    key={col.key}
                    className={`
                      px-4 py-2.5 whitespace-nowrap font-arrow
                      ${col.align === "right"  ? "text-right"  : ""}
                      ${col.align === "center" ? "text-center" : ""}
                      ${col.align === "left" || !col.align ? "text-left" : ""}
                      ${col.highlight ? "font-semibold text-gray-800" : "text-gray-600"}
                    `}
                  >
                    {col.format === "date"   && fmtDate(row[col.key])}
                    {col.format === "diff"   && <DiffCell value={row[col.key]} />}
                    {col.format === "number" && (
                      <span className="tabular-nums font-mono text-xs font-arrow">
                        {fmtNumber(row[col.key])}
                      </span>
                    )}
                    {!col.format && String(row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* tfoot — summary row */}
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-slate-300 text-xs font-semibold">
              {cols.map((col, idx) => (
                <td
                  key={col.key}
                  className={`
                    px-4 py-2.5 whitespace-nowrap
                    ${col.align === "right" ? "text-right" : ""}
                  `}
                >
                  {idx === 0 ? (
                    <span className="text-slate-600 uppercase tracking-wide text-[10px]">
                      ລວມ
                    </span>
                  ) : col.format === "number" ? (
                    <span className="tabular-nums font-mono text-gray-700">
                      {fmtNumber(sumCol(rows, col.key))}
                    </span>
                  ) : col.format === "diff" ? (
                    <DiffCell value={sumCol(rows, col.key)} />
                  ) : null}
                </td>
              ))}
            </tr>
          </tfoot>

        </table>
      </div>
    </div>
  );
}