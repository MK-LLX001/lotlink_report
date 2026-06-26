"use client";

import React from "react";
import {
  X,
  Briefcase,
  FileText,
  Phone,
  CalendarDays,
  BarChart3,
  Layers,
  FileCheck2,
  StickyNote,
  Clock,
} from "lucide-react";
import { DailyServiceItem } from "../../types/types.daily.service";
import { DailyImageSrc } from "@/app/utils/img_path";
import { ImageCell } from "@/app/utils/Preview_img";
interface Props {
  data: DailyServiceItem | null;
  onClose: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  ກຳລັງດຳເນີນງານ: {
    label: "ກຳລັງດຳເນີນງານ",
    bg: "bg-blue-50",
    text: "text-blue-700",
    dot: "bg-blue-500",
  },
  "50%": {
    label: "50% ສຳເລັດ",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  "100%": {
    label: "100% ສຳເລັດ",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
};

const getStatus = (s: string) =>
  STATUS_CONFIG[s] ?? {
    label: s,
    bg: "bg-slate-50",
    text: "text-slate-600",
    dot: "bg-slate-400",
  };

const fmt = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

// ── Row helper ────────────────────────────────────────────────────────────────
function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon size={13} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-slate-800 break-words">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DetailDailyServices({ data, onClose }: Props) {
  if (!data) return null;

  const cfg = getStatus(data.status);
  const imgSrc = DailyImageSrc(data.img_url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mains relative flex justify-center  items-center w-full max-w-7xl max-h-screen overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className=" w-full max-w-5xl  overflow-y-auto rounded-2xl bg-white ">
          {/* ── Header ── */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
                <Briefcase size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  ລາຍລະອຽດງານ
                </h2>
                <p className="text-xs text-slate-400">ID: {data.daily_id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
            >
              <X size={15} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* ── Image ── */}
            {data.img_url ? (
              <ImageCell
                src={DailyImageSrc(data.img_url)}
                alt={data.types_work ?? "image"}
                className=" w-auto h-60"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                N/A
              </div>
            )}

            {/* ── Status badge ── */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${cfg.bg} ${cfg.text}`}
              >
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            </div>

            {/* ── Info grid ── */}
            <div className="rounded-xl grid grid-cols-3 border border-slate-200 bg-slate-50/50 px-4 py-1">
              <Row icon={Briefcase} label="ປະເພດວຽກ" value={data.types_work} />
              <Row icon={Phone} label="ປະສານງານ" value={data.contact} />
              <Row
                icon={FileCheck2}
                label="ຜູ້ຮັບຜິດຊອບ"
                value={data.agreement}
              />
              <Row icon={Layers} label="ເພຈ" value={data.page} />
              <Row
                icon={CalendarDays}
                label="ວັນທີເລີ່ມ"
                value={fmt(data.startDate)}
              />
              <Row
                icon={CalendarDays}
                label="ວັນທີສິ້ນສຸດ"
                value={fmt(data.endDate)}
              />
            </div>

            {/* ── Description ── */}
            {data.description && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={13} className="text-slate-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    ລາຍລະອຽດ
                  </p>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {data.description}
                </p>
              </div>
            )}

            {/* ── Remark ── */}
            {data.remark && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote size={13} className="text-amber-500" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                    ໝາຍເຫດ
                  </p>
                </div>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">
                  {data.remark}
                </p>
              </div>
            )}

            {/* ── Timestamps ── */}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Clock size={11} />
                ສ້າງ: {fmt(data.created_at)}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={11} />
                ອັບເດດ: {fmt(data.updated_at)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
