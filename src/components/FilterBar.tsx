"use client";
import { useState } from "react";
import { Search, Calendar, X } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   FilterBar
   ---------------------------------------------------------------------
   ປະກອບສ່ວນປະກອບການກັ່ນຕອງທີ່ໃຊ້ຊ້ຳໄດ້: From Date, To Date, ແລະ Keyword Search
   ສາມາດເລືອກເປີດ/ປິດແຕ່ລະສ່ວນໄດ້ຕາມໜ້າທີ່ໃຊ້ງານ.

   ການນຳໃຊ້:
   import { FilterBar } from "@/app/components/FilterBar";

   <FilterBar
     showDateRange
     showKeyword
     onSearch={({ fromDate, toDate, keyword }) => { ... }}
   />

   ຖ້າຕ້ອງການສະເພາະ date:      showDateRange (ບໍ່ໃສ່ showKeyword)
   ຖ້າຕ້ອງການສະເພາະ keyword:   showKeyword (ບໍ່ໃສ່ showDateRange)
   ຖ້າຕ້ອງການທັງສອງ:           showDateRange + showKeyword
───────────────────────────────────────────────────────────────────────── */

export interface FilterValues {
  fromDate: string; // "YYYY-MM-DD" ຫຼື ""
  toDate: string; // "YYYY-MM-DD" ຫຼື ""
  keyword: string;
}

interface FilterBarProps {
  /** ສະແດງຊ່ອງ From Date / To Date */
  showDateRange?: boolean;
  /** ສະແດງຊ່ອງ Keyword Search */
  showKeyword?: boolean;
  /** placeholder ສຳລັບຊ່ອງ keyword */
  keywordPlaceholder?: string;
  /** label ສຳລັບຊ່ອງ keyword (ຖ້າຢາກປ່ຽນ) */
  keywordLabel?: string;
  /** ຄ່າເລີ່ມຕົ້ນ (ເຊັ່ນ: ມາຈາກ URL searchParams) */
  initialValues?: Partial<FilterValues>;
  /** callback ເມື່ອກົດປຸ່ມຄົ້ນຫາ ຫຼື ກົດ Enter */
  onSearch: (values: FilterValues) => void;
  /** callback ເມື່ອກົດປຸ່ມລ້າງ (optional) */
  onClear?: () => void;
  /** ສະຖານະ loading ຂອງການຄົ້ນຫາ (ປິດປຸ່ມ + ໝູນ icon) */
  isSearching?: boolean;
  /** ສະແດງປຸ່ມລ້າງຄ່າ */
  showClearButton?: boolean;

  children?: React.ReactNode;
}

export function FilterBar({
  showDateRange = false,
  showKeyword = false,
  keywordPlaceholder = "ປ້ອນຄຳຄົ້ນຫາ...",
  keywordLabel = "ຄຳຄົ້ນຫາ",
  initialValues,
  onSearch,
  onClear,
  isSearching = false,
  showClearButton = true,
  children,
}: FilterBarProps) {
  const [fromDate, setFromDate] = useState(initialValues?.fromDate ?? "");
  const [toDate, setToDate] = useState(initialValues?.toDate ?? "");
  const [keyword, setKeyword] = useState(initialValues?.keyword ?? "");

  const hasAnyValue = !!(fromDate || toDate || keyword.trim());

  const handleSearch = () => {
    onSearch({
      fromDate,
      toDate,
      keyword: keyword.replace(/\s+/g, " ").trim(),
    });
  };

  const handleClear = () => {
    setFromDate("");
    setToDate("");
    setKeyword("");
    onClear?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="overflow-hidden rounded-2xl   bg-white ">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
        {/* ── From Date ── */}
        {showDateRange && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              ວັນທີເລີ່ມຕົ້ນ
            </label>
            <div className="relative">
              <Calendar
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                onKeyDown={handleKeyDown}
                max={toDate || undefined}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:w-44"
              />
            </div>
          </div>
        )}

        {/* ── To Date ── */}
        {showDateRange && (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              ວັນທີສິ້ນສຸດ
            </label>
            <div className="relative">
              <Calendar
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                onKeyDown={handleKeyDown}
                min={fromDate || undefined}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:w-44"
              />
            </div>
          </div>
        )}

        {/* ── Keyword ── */}
        {showKeyword && (
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {keywordLabel}
            </label>
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={keywordPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        )}

        {/* ── Buttons ── */}
        {children}
        <div className="flex gap-2">
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Search size={15} className={isSearching ? "animate-pulse" : ""} />
            ຄົ້ນຫາ
          </button>

          {showClearButton && hasAnyValue && (
            <button
              onClick={handleClear}
              disabled={isSearching}
              title="ລ້າງການກັ່ນຕອງ"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-500 shadow-sm transition hover:bg-slate-100 disabled:opacity-40"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
