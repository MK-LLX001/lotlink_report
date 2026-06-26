import * as XLSX from "xlsx";
import type { CaseItem } from "../CASES-LOTTO/types/Type_Cases";

// ─── helpers (same as page) ───────────────────────────────────────────────────

const getErrorTypeLabel = (errorType: string): string => {
  const map: Record<string, string> = {
    NOT_REWARD: "ບໍ່ໄດ້ຮັບເງິນລາງວັນ",
    NOT_BILL: "ບໍ່ໄດ້ຮັບບິນ ຫຼື ບີນບໍ່ສະແດງ",
    NOT_TOP_UP: "ບໍ່ໄດ້ຮັບມູນຄ່າໂທ",
    NOT_POINT: "ບໍ່ໄດ້ຮັບຄະແນນ",
    NOT_REWARD_SPIN: "ບໍ່ໄດ້ຮັບເງິນລາງວັນຈາກການ Spin",
    P_NOTBILL: "ໃຊ້ຄະແນນຊື້ເລກບໍ່ໄດ້ບີນ",
    NOT_SELECT_ACC: "ບໍ່ສາມາດເລືອກບັນຊີຮັບລາງວັນ",
  };
  return map[errorType] ?? errorType;
};

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── main export function ─────────────────────────────────────────────────────

export function downloadCasesXlsx(
  cases: CaseItem[],
  filename = "cases_export",
) {
  // 1. Map to readable rows
  const rows = cases.map((item, index) => ({
    "#": index + 1,
    ລະຫັດເຄສ: item.case_number ?? "-",
    ຂໍ້ມູນລູກຄ້າ: item.customer ?? "-",
    ປະເພດສີນຄ້າ: item.problem_type ?? "-",
    ປະເພດຂໍ້ຜິດພາດ: getErrorTypeLabel(item.error_type ?? ""),
    ສະຖານະ: item.status ?? "-",
    ຄວາມສຳຄັນ: item.priority ?? "-",
    ຄົນຮັບຜິດຊອບ: item.assigned_to ?? "-",
    ຊ່ອງທາງລູກຄ້າ: item.cust_connect ?? "-",
    ລາຍລະອຽດ: item.description ?? "-",
    ໝາຍເຫດ: item.notes ?? "-",
    ສ້າງເມື່ອ: formatDate(item.created_at),
    ອັບເດດລ່າສຸດ: formatDate(item.updated_at),
  }));

  // 2. Create worksheet + workbook
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cases");

  // 3. Column widths
  ws["!cols"] = [
    { wch: 5 }, // #
    { wch: 18 }, // case_number
    { wch: 20 }, // customer
    { wch: 16 }, // problem_type
    { wch: 30 }, // error_type
    { wch: 22 }, // status
    { wch: 12 }, // priority
    { wch: 20 }, // assigned_to
    { wch: 16 }, // cust_connect
    { wch: 40 }, // description
    { wch: 30 }, // notes
    { wch: 18 }, // created_at
    { wch: 18 }, // updated_at
  ];

  // 4. Download with timestamp in filename
  const ts = new Date()
    .toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");

  XLSX.writeFile(wb, `${filename}_${ts}.xlsx`);
}
