// lib/ldb_table_config.ts
// Column definitions per account — เพิ่ม account ใหม่แค่เพิ่ม entry ใน MAP

export interface ColDef {
  key:       string;       // key ใน data object (ALL_CAPS จาก Oracle)
  label:     string;       // header ที่แสดงบน UI (ພາສາລາວ / EN)
  align?:    "left" | "right" | "center";
  format?:   "number" | "date" | "diff";  // diff = สีแดง/เขียวตามค่า
  highlight?: boolean;     // bold + เน้นพิเศษ
}

// ─── shared columns ทุก account มี ────────────────────────────────────────────
const DATE_COL: ColDef = {
  key: "DATE_TIME", label: "ວັນທີ", align: "left", format: "date",
};

// ─── column sets ──────────────────────────────────────────────────────────────

/** 0302000010005221 — ບັນຊີຈ່າຍ (จ่ายรางวัล) */
const COLS_PAY: ColDef[] = [
  DATE_COL,
  { key: "WITHDRAW",          label: "ລວມໜີ້",        align: "right", format: "number", highlight: true },
  { key: "DEPOSIT",           label: "ລວມມີ",        align: "right", format: "number", highlight: true },
  { key: "SOKXAY_REWARD",     label: "ລາງວັນ Sokxay",    align: "right", format: "number" },
  { key: "SOKXAY_BONUS",      label: "ໂຊກຊ້ອນໂຊກ",     align: "right", format: "number" },
  { key: "SCN_REWARD",        label: "ລາງວັນ SCN",       align: "right", format: "number" },
  { key: "SOKXAY_SPIN",       label: "ວົງລໍ້ໂຊກໄຊ",      align: "right", format: "number" },
  { key: "SOKXAY_TAX_REWARD", label: "ອາກອນລາງວັນ ໂຊກໄຊ",      align: "right", format: "number" },
  { key: "FTR_DR",            label: "ການໂອນເງິນ - ໜີ້",         align: "right", format: "number" },
  { key: "FTR_CR",            label: "ການໂອນເງິນ - ມີ",         align: "right", format: "number" },
  { key: "BANK_FEE",          label: "Bank Fee",         align: "right", format: "number" },
  { key: "THE_OTHER",         label: "ອື່ນໆ",             align: "right", format: "number" },
  { key: "DIFF_DR",           label: "ສ່ວນຕ່າງໜີ້",        align: "right", format: "diff",   highlight: true },
  { key: "DIFF_CR",           label: "ສ່ວນຕ່າງມີ",        align: "right", format: "diff",   highlight: true },
];
 
/** 0302000010005944 — ບັນຊີຮັບ (รับเงินเข้า) */
const COLS_RECV: ColDef[] = [
  DATE_COL,
  { key: "WITHDRAW",           label: "ລວມໜີ້",        align: "right", format: "number", highlight: true },
  { key: "DEPOSIT",           label: "ລວມມີ",        align: "right", format: "number", highlight: true },
  { key: "SOKXAY_REFUND", label: "Refund-ໂຊກໄຊ",       align: "right", format: "number" },
  { key: "SCN_REFUND", label: "Refund-SCN",       align: "right", format: "number" },
  { key: "SOKXAY_LOTTO_SETTLE_CR", label: "ຍອດມີ ໂຊກໄຊ",       align: "right", format: "number" },
  { key: "SCN_LOTTO_SETTLE_CR", label: "ຍອດມີ SCN",align: "right", format: "number" },
  { key: "FTR_DR",            label: "ການໂອນເງິນ-ໜີ້",  align: "right", format: "number" },
  { key: "FTR_CR",            label: "ການໂອນເງິນ-ມີ",  align: "right", format: "number" },
  { key: "BANK_FEE",            label: "BANK_FEE",  align: "right", format: "number" },
  { key: "THE_OTHER",            label: "ອື່ນໆ",  align: "right", format: "number" },
  { key: "DIFF_DR",           label: "DIFF (DR)",        align: "right", format: "diff",   highlight: true },
  { key: "DIFF_CR",           label: "DIFF (CR)",        align: "right", format: "diff",   highlight: true },
];


/** LAK1354902360020 — Sokxay One Plus */
const COLS_SOKXAY: ColDef[] = [
  DATE_COL,
  { key: "WITHDRAW",          label: "ຖອນທັງໝົດ",        align: "right", format: "number", highlight: true },
  { key: "DEPOSIT",           label: "ຝາກທັງໝົດ",        align: "right", format: "number", highlight: true },
  { key: "SOKXAY_LOTTO_SELL", label: "ຍອດຂາຍຫວຍໂຊກໄຊ",    align: "right", format: "number" },
  { key: "SOKXAY_LOTTO_SETTLE_DR", label: "SOKXAY_SETTLE_DR",     align: "right", format: "number" },
  { key: "BANK_FEE",          label: "Bank Fee",         align: "right", format: "number" },
  { key: "DIFF_DR",           label: "DIFF (DR)",        align: "right", format: "diff",   highlight: true },

];

/** LAK1354903360020 — SCN Easy */
const COLS_SCN: ColDef[] = [
  DATE_COL,
  { key: "WITHDRAW",          label: "ຖອນທັງໝົດ",        align: "right", format: "number", highlight: true },
  { key: "DEPOSIT",           label: "ຝາກທັງໝົດ",        align: "right", format: "number", highlight: true },
  { key: "SCN_LOTTO_SELL", label: "ຍອດຂາຍຫວຍ SCN",    align: "right", format: "number" },
  { key: "SCN_LOTTO_SETTLE_DR", label: "SCN_SETTLE_DR",     align: "right", format: "number" },
  { key: "BANK_FEE",          label: "Bank Fee",         align: "right", format: "number" },
  { key: "DIFF_DR",           label: "DIFF (DR)",        align: "right", format: "diff",   highlight: true },

];

// ─── fallback (ทุก column) ────────────────────────────────────────────────────
const COLS_ALL: ColDef[] = [
  DATE_COL,
  { key: "WITHDRAW",          label: "ລວມໜີ້",              align: "right", format: "number" },
  { key: "DEPOSIT",           label: "ຝາກ",              align: "right", format: "number" },
  { key: "SOKXAY_REWARD",     label: "SOKXAY Reward",    align: "right", format: "number" },
  { key: "SOKXAY_BONUS",      label: "SOKXAY Bonus",     align: "right", format: "number" },
  { key: "SCN_REWARD",        label: "SCN Reward",       align: "right", format: "number" },
  { key: "SOKXAY_SPIN",       label: "SOKXAY Spin",      align: "right", format: "number" },
  { key: "SOKXAY_TAX_REWARD", label: "Tax Reward",       align: "right", format: "number" },
  { key: "FTR_DR",            label: "FTR (DR)",         align: "right", format: "number" },
  { key: "FTR_CR",            label: "FTR (CR)",         align: "right", format: "number" },
  { key: "BANK_FEE",          label: "Bank Fee",         align: "right", format: "number" },
  { key: "THE_OTHER",         label: "ອື່ນໆ",             align: "right", format: "number" },
  { key: "DIFF_DR",           label: "DIFF (DR)",        align: "right", format: "diff",   highlight: true },
  { key: "DIFF_CR",           label: "DIFF (CR)",        align: "right", format: "diff",   highlight: true },
];

// ─── MAP ──────────────────────────────────────────────────────────────────────
export const ACCOUNT_COLS: Record<string, ColDef[]> = {
  "0302000010005221": COLS_PAY,
  "0302000010005944": COLS_RECV,
  "LAK1354902360020": COLS_SOKXAY,
  "LAK1354903360020": COLS_SCN,
};

export function getColDefs(account: string): ColDef[] {
  return ACCOUNT_COLS[account] ?? COLS_ALL;
}