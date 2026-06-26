"use client";

import React, { useState, useRef } from "react";
import {
  Briefcase,
  FileText,
  Phone,
  CalendarDays,
  BarChart3,
  Layers,
  FileCheck2,
  ImagePlus,
  StickyNote,
  ChevronDown,
  Upload,
  X,
  Save,
  CheckCircle2,
  Loader2,
  Contact,
} from "lucide-react";
import { DailyServicePayload } from "../../types/types.daily.service";
import { toast } from "react-hot-toast";
import { useCreateDailyService } from "../../hook/hook.daily";
// ─── Types ────────────────────────────────────────────────────────────────────

const INITIAL: DailyServicePayload = {
  types_work: "",
  description: "",
  contact: "",
  startDate: "",
  endDate: "",
  status: "",
  page: "",
  agreement: "",
  img_url: "",
  remark: "",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  {
    value: "ກຳລັງດຳເນີນງານ",
    label: "ກຳລັງດຳເນີນງານ",
    color: "text-blue-600",
    dot: "bg-blue-500",
  },
  {
    value: "50%",
    label: "50% ສຳເລັດ",
    color: "text-amber-600",
    dot: "bg-amber-400",
  },
  {
    value: "100%",
    label: "100% ສຳເລັດ",
    color: "text-emerald-600",
    dot: "bg-emerald-500",
  },
] as const;

// ─── Reusable components ──────────────────────────────────────────────────────

function FieldLabel({
  icon: Icon,
  label,
  required,
}: {
  icon: React.ElementType;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
      <Icon size={13} className="text-slate-400" />
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

const inputCls = (err?: boolean) =>
  [
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800",
    "placeholder:text-slate-300 outline-none transition-all duration-150",
    "focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500",
    err
      ? "border-red-300 focus:border-red-400 focus:ring-red-400/20"
      : "border-slate-200 hover:border-slate-300",
  ].join(" ");

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateDailyServicePage() {
  const [form, setForm] = useState<DailyServicePayload>(INITIAL);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── derived ──────────────────────────────────────────────────────────────
  const errors = {
    types_work: touched.types_work && !form.types_work.trim(),
    status: touched.status && !form.status,
  };

  const isValid = !!form.types_work.trim() && !!form.status;

  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === form.status);

  // ── handlers ─────────────────────────────────────────────────────────────
  const set = (field: keyof DailyServicePayload, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const blur = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  // ✅ แก้ — เพิ่มไฟล์เข้า imageFiles ด้วย
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    setImageFiles([file]); // ✅ เซฟ File object จริงๆ
    set("img_url", ""); // ✅ เคลียร์ออก เพราะ server จะ generate path เอง
  };

  const removeImage = () => {
    setPreview(null);
    setImageFiles([]); // ✅ เคลียร์ imageFiles ด้วย
    set("img_url", "");
    if (fileRef.current) fileRef.current.value = "";
  };

  // ✅ เปลี่ยนจาก createDailyService() เป็น useCreateDailyService()
  const { mutate, isPending } = useCreateDailyService();

  const handleSubmit = () => {
    console.log("Submitting form:", form, "with images:", imageFiles);
    if (!isValid) {
      toast.error("ກະລຸນາກວດເບິ່ງຟອມໃນເທື່ອນີ້");
      return;
    }
    mutate(
      { data: form, images: imageFiles },
      {
        onSuccess: (res) => {
          if (res?.success) toast.success("ບັນທຶກສຳເລັດ");
        },
        onError: () => toast.error("ບັນທຶກບໍ່ສຳເລັດ"),
      },
    );
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* ── Page Header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm shadow-blue-200">
              <Briefcase size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                ບັນທຶກງານປະຈຳວັນ
              </h1>
              <p className="text-xs text-slate-400">
                Daily Service — ສ້າງລາຍການໃໝ່
              </p>
            </div>
          </div>
        </div>

        {/* ── Success Toast ── */}
        {success && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm font-semibold text-emerald-700 shadow-sm">
            <CheckCircle2 size={18} className="shrink-0" />
            ບັນທຶກຂໍ້ມູນສຳເລັດແລ້ວ!
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* ═══════════════════════════════════
              LEFT — main form (2 cols)
          ═══════════════════════════════════ */}
          <div className="space-y-5 lg:col-span-2">
            {/* Section 1: Basic Info */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-400">
                ຂໍ້ມູນຫຼັກ
              </p>

              {/* types_work */}
              <div className="mb-4">
                <FieldLabel icon={Briefcase} label="ປະເພດວຽກ" required />
                <input
                  value={form.types_work}
                  onChange={(e) => set("types_work", e.target.value)}
                  onBlur={() => blur("types_work")}
                  placeholder="ລະບຸປະເພດວຽກ..."
                  className={inputCls(errors.types_work)}
                />
                {errors.types_work && (
                  <p className="mt-1 text-xs text-red-400">
                    ກະລຸນາລະບຸປະເພດວຽກ
                  </p>
                )}
              </div>

              {/* status — custom select */}
              <div className="mb-4">
                <FieldLabel icon={BarChart3} label="ສະຖານະ" required />
                <div className="relative">
                  <select
                    value={form.status}
                    onChange={(e) => {
                      set("status", e.target.value);
                      blur("status");
                    }}
                    onBlur={() => blur("status")}
                    className={`${inputCls(errors.status)} appearance-none pr-10 cursor-pointer`}
                  >
                    <option value="" disabled>
                      ເລືອກສະຖານະ...
                    </option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={15}
                    className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
                {/* status badge preview */}
                {selectedStatus && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    <span
                      className={`h-2 w-2 rounded-full ${selectedStatus.dot}`}
                    />
                    <span
                      className={`text-xs font-semibold ${selectedStatus.color}`}
                    >
                      {selectedStatus.label}
                    </span>
                  </div>
                )}
                {errors.status && (
                  <p className="mt-1 text-xs text-red-400">ກະລຸນາເລືອກສະຖານະ</p>
                )}
              </div>

              {/* contact */}
              <div>
                <FieldLabel icon={Contact} label="ປະສານງານກ" />
                <input
                  value={form.contact}
                  onChange={(e) => set("contact", e.target.value)}
                  placeholder="ປະສານງານ..."
                  className={inputCls()}
                />
              </div>
            </div>

            {/* Section 2: Dates */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-400">
                ໄລຍະເວລາ
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel icon={CalendarDays} label="ວັນທີເລີ່ມ" />
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                    className={inputCls()}
                  />
                </div>
                <div>
                  <FieldLabel icon={CalendarDays} label="ວັນທີສິ້ນສຸດ" />
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate || undefined}
                    onChange={(e) => set("endDate", e.target.value)}
                    className={inputCls()}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Detail */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-400">
                ລາຍລະອຽດ
              </p>

              {/* page + agreement */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                <div>
                  <FieldLabel icon={Layers} label="ເພຈ" />
                  <input
                    value={form.page}
                    onChange={(e) => set("page", e.target.value)}
                    placeholder="Dashboard, Cases..."
                    className={inputCls()}
                  />
                </div>
                <div>
                  <FieldLabel icon={FileCheck2} label="ຜູ້ຮັບຜິດຊອບ" />
                  <input
                    value={form.agreement}
                    onChange={(e) => set("agreement", e.target.value)}
                    placeholder="SLA-2026-001..."
                    className={inputCls()}
                  />
                </div>
              </div>

              {/* description */}
              <div className="mb-4">
                <FieldLabel icon={FileText} label="ລາຍລະອຽດ" />
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="ອະທິບາຍລາຍລະອຽດຂອງວຽກ..."
                  className={`${inputCls()} resize-none`}
                />
              </div>

              {/* remark */}
              <div>
                <FieldLabel icon={StickyNote} label="ໝາຍເຫດ" />
                <textarea
                  rows={3}
                  value={form.remark}
                  onChange={(e) => set("remark", e.target.value)}
                  placeholder="ໝາຍເຫດເພີ່ມເຕີມ..."
                  className={`${inputCls()} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════
              RIGHT — image + summary (1 col)
          ═══════════════════════════════════ */}
          <div className="space-y-5">
            {/* Image upload */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                ຮູບພາບ
              </p>

              {preview ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200">
                  <img
                    src={preview}
                    alt="preview"
                    className="h-48 w-full object-cover"
                  />
                  <button
                    onClick={removeImage}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-red-50 hover:text-red-500"
                  >
                    <X size={13} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-2 py-1 text-[10px] text-white">
                    {form.img_url}
                  </div>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <ImagePlus size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">
                      ອັບໂຫລດຮູບ
                    </p>
                    <p className="text-xs text-slate-400">PNG, JPG, JPEG</p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
              )}

              {/* manual URL input */}
              {!preview && (
                <div className="mt-3">
                  <FieldLabel icon={Upload} label="ຫຼື ໃສ່ URL" />
                  <input
                    value={form.img_url || ""}
                    onChange={(e) => set("img_url", e.target.value)}
                    placeholder="https://..."
                    className={inputCls()}
                  />
                </div>
              )}
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                ສະຫຼຸບ
              </p>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: "ປະເພດວຽກ", value: form.types_work || "—" },
                  { label: "ປະສານງານ", value: form.contact || "—" },
                  { label: "ເພຈ", value: form.page || "—" },
                  { label: "ຜູ້ຮັບຜິດຊອບ", value: form.agreement || "—" },
                  { label: "ວັນທີເລີ່ມ", value: form.startDate || "—" },
                  { label: "ວັນທີສິ້ນສຸດ", value: form.endDate || "—" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="shrink-0 text-slate-400">{row.label}</span>
                    <span className="text-right font-medium text-slate-700 break-all">
                      {row.value}
                    </span>
                  </div>
                ))}

                {/* status badge */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                  <span className="text-slate-400">ສະຖານະ</span>
                  {selectedStatus ? (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border border-slate-200 bg-slate-50 ${selectedStatus.color}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${selectedStatus.dot}`}
                      />
                      {selectedStatus.label}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!isValid || isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> ກຳລັງບັນທຶກ...
                </>
              ) : (
                <>
                  <Save size={16} /> ບັນທຶກຂໍ້ມູນ
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
