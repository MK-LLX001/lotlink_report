"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Briefcase,
  FileText,
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
  Loader2,
  Contact,
} from "lucide-react";
import {
  DailyServiceItem,
  DailyServicePayload,
} from "../../types/types.daily.service";
import { toast } from "react-hot-toast";
import { DailyImageSrc } from "@/app/utils/img_path";

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data: DailyServiceItem;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EditDailyService({ data, onClose, onSuccess }: Props) {
  const [form, setForm] = useState<DailyServicePayload>({
    types_work: data.types_work ?? "",
    description: data.description ?? "",
    contact: data.contact ?? "",
    startDate: data.startDate ?? "",
    endDate: data.endDate ?? "",
    status: data.status ?? "",
    page: data.page ?? "",
    agreement: data.agreement ?? "",
    img_url: data.img_url ?? "",
    remark: data.remark ?? "",
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<string | null>(
    data.img_url ? DailyImageSrc(data.img_url) : null,
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isPending, setIsPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── derived ────────────────────────────────────────────────────────────────
  const errors = {
    types_work: touched.types_work && !form.types_work.trim(),
    status: touched.status && !form.status,
  };
  const isValid = !!form.types_work.trim() && !!form.status;
  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === form.status);

  // ── handlers ───────────────────────────────────────────────────────────────
  const set = (field: keyof DailyServicePayload, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const blur = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setImageFiles([file]);
    set("img_url", "");
  };

  const removeImage = () => {
    setPreview(null);
    setImageFiles([]);
    set("img_url", "");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    setTouched({ types_work: true, status: true });
    if (!isValid) {
      toast.error("ກະລຸນາກວດເບິ່ງຟອມ");
      return;
    }

    setIsPending(true);
    try {
      const fd = new FormData();
      fd.append("action", "update_daily");
      fd.append("daily_id", String(data.daily_id));
      fd.append("types_work", form.types_work);
      fd.append("description", form.description);
      fd.append("contact", form.contact);
      fd.append("startDate", form.startDate);
      fd.append("endDate", form.endDate);
      fd.append("status", form.status);
      fd.append("page", form.page);
      fd.append("agreement", form.agreement);
      fd.append("remark", form.remark);
      if (form.img_url) fd.append("img_url", form.img_url);
      imageFiles.forEach((f) => fd.append("images", f));

      const res = await fetch("/api/oracle/Daily_services", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();

      if (json.success) {
        toast.success("ອັບເດດສຳເລັດ");
        onSuccess?.();
        onClose();
      } else {
        toast.error(json.message ?? "ອັບເດດບໍ່ສຳເລັດ");
      }
    } catch {
      toast.error("ເກີດຂໍ້ຜິດພາດ");
    } finally {
      setIsPending(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-50 shadow-2xl">
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Briefcase size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                ແກ້ໄຂຂໍ້ມູນ
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

        {/* ── Body ── */}
        <div className="p-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* LEFT — form */}
            <div className="space-y-5 lg:col-span-2">
              {/* Basic Info */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-400">
                  ຂໍ້ມູນຫຼັກ
                </p>

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
                    <p className="mt-1 text-xs text-red-400">
                      ກະລຸນາເລືອກສະຖານະ
                    </p>
                  )}
                </div>

                <div>
                  <FieldLabel icon={Contact} label="ປະສານງານ" />
                  <input
                    value={form.contact}
                    onChange={(e) => set("contact", e.target.value)}
                    placeholder="ປະສານງານ..."
                    className={inputCls()}
                  />
                </div>
              </div>

              {/* Dates */}
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

              {/* Detail */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <p className="mb-5 text-xs font-bold uppercase tracking-widest text-slate-400">
                  ລາຍລະອຽດ
                </p>
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

            {/* RIGHT — image + submit */}
            <div className="space-y-5">
              {/* Image */}
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
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm hover:bg-red-50 hover:text-red-500 transition"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 text-center hover:border-blue-400 hover:bg-blue-50/40 transition">
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

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!isValid || isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />{" "}
                    ກຳລັງບັນທຶກ...
                  </>
                ) : (
                  <>
                    <Save size={16} /> ບັນທຶກການແກ້ໄຂ
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
