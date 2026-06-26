"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useCreateCaseMutation } from "../../hooks/Hooks_Cases";
import type { Case_Payload } from "../../types/Type_Cases";
import { useAuth } from "@/lib/authContext";
import { Trash2, Upload, X, Save, FileText } from "lucide-react";
import { toast } from "react-toastify";

interface Props {
  onClose: () => void;
}

const PROBLEM_TYPES = [
  { value: "LOTTO_LDB", label: "LOTTO-LDB" },
  { value: "LOTTO_BCEL", label: "LOTTO-BCEL" },
  { value: "LOTTO_JDB", label: "LOTTO-JDB" },
  { value: "SPIN", label: "SPIN" },
  { value: "P_NOT_REWARD", label: "ໃຊ້ຄະແນນຊື້ບໍ່ໄດ້ຮັບເງິນລາງວັນ" },
  { value: "P_NOT_BILL", label: "ໃຊ້ຄະແນນຊື້ບໍ່ໄດ້ບີນ" },
  { value: "TOP-UP", label: "TOP-UP" },
  { value: "AIRLINE", label: "AIRLINE" },
  { value: "WATER", label: "ນ້ຳປະປາ" },
  { value: "EDL", label: "ໄຟຟ້າ" },
  { value: "OTHER", label: "ອື່ນໆ" },
] as const;

const ERROR_TYPES = [
  { value: "NOT_REWARD", label: "ບໍ່ໄດ້ຮັບເງິນລາງວັນ" },
  { value: "NOT_BILL", label: "ບໍ່ໄດ້ຮັບບິນ ຫຼື ບີນບໍ່ສະແດງ" },
  { value: "NOT_TOP_UP", label: "ບໍ່ໄດ້ຮັບມູນຄ່າໂທ" },
  { value: "NOT_POINT", label: "ບໍ່ໄດ້ຮັບຄະແນນ" },
  { value: "NOT_REWARD_SPIN", label: "ບໍ່ໄດ້ຮັບເງິນລາງວັນຈາກການ spin" },
  { value: "P_NOTBILL", label: "ໃຊ້ຄະແນນຊື້ເລກບໍ່ໄດ້ບີນ" },
  { value: "ERROR", label: "ຈ່າຍບໍ່ສຳເລັດ" },
  { value: "WRONG_PROVINCE", label: "ຈ່າຍຜິດແຂວງ" },
  { value: "OVER_PAYMENT", label: "ຈ່າຍເງີນເກີນ" },
  { value: "WRONG_NUMBER_KONGTER", label: "ຈ່າຍຜິດກົງເຕີ" },
  { value: "NOT_SELECT_ACC", label: "ບໍ່ສາມາດເລືອກບັນຊີຮັບລາງວັນ" },
  { value: "OTHER", label: "ອື່ນໆ" },
] as const;

const STATUS_OPTIONS = [
  { value: "ຫາກະແຈ້ງມາ", label: "ຫາກະແຈ້ງມາ" },
  { value: "ກຳລັງດຳເນີນ", label: "ກຳລັງດຳເນີນ" },
  { value: "ລໍຂໍ້ມູນຈາກລູກຄ້າ", label: "ລໍຂໍ້ມູນຈາກລູກຄ້າ" },
  { value: "ແກ້ໄຂແລ້ວ", label: "ແກ້ໄຂແລ້ວ" },
  { value: "ປິດເຄສສຳເລັດແລ້ວ", label: "ປິດເຄສສຳເລັດແລ້ວ" },
] as const;
const CUST_CONNECT = [
  { value: "WHATAPP", label: "WhatApp" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "TELEPHONE", label: "Telephone" },
  { value: "2094495888", label: "2094495888" },
  { value: "2091218844", label: "2091218844" },
  { value: "2092088866", label: "2092088866" },
  { value: "2091242288", label: "2091242288" },
  { value: "2094453888", label: "2094453888" },
  { value: "2057886658", label: "2057886658" },
  { value: "OTHER", label: "ອື່ນໆ" },
] as const;

const PRIORITY_OPTIONS = [
  {
    value: "LOW",
    label: "ບັນທົ່ວໄປ",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "MEDIUM",
    label: "ລະດັບກາງ",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "HIGH",
    label: "ສູງ",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    value: "MAX-HIGH",
    label: "ສູງສຸດ",
    color: "bg-red-50 text-red-700 border-red-200",
  },
] as const;

const DESC_MIN = 10;
const DESC_MAX = 500;
// Maximum number of attachment images allowed per case.
// Bump this number (and update the backend / mutation hook) if you need a different cap.
const MAX_IMAGES = 5;

const getLabel = (
  options: readonly { value: string; label: string }[],
  value: string,
) => options.find((o) => o.value === value)?.label ?? value;

const getPriorityColor = (value: string) =>
  PRIORITY_OPTIONS.find((o) => o.value === value)?.color ??
  "bg-slate-50 text-slate-700 border-slate-200";

// ─── Reusable field wrapper ───────────────────────────────────────────────────
const Field = ({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </label>
    {children}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// ─── Shared input / select / textarea class ───────────────────────────────────
const inputCls = (hasError?: boolean) =>
  [
    "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800",
    "placeholder:text-slate-400 outline-none transition-all",
    "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
    hasError
      ? "border-red-400 focus:border-red-400 focus:ring-red-500/20"
      : "border-slate-200 hover:border-slate-300",
  ].join(" ");

// ─── Section card ─────────────────────────────────────────────────────────────
const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="mb-4 text-sm font-semibold text-slate-700 flex items-center gap-2">
      <span className="h-1 w-1 rounded-full bg-blue-500 inline-block" />
      {title}
    </h3>
    {children}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const Modal_create_cases: React.FC<Props> = ({ onClose }) => {
  const { mutate, isPending, isError, error } = useCreateCaseMutation();
  // Modal_create_cases.tsx — แก้ 2 บรรทัด
  const { user } = useAuth(); // ✅
  const fullname = useMemo(() => user?.displayName ?? "", [user]); // ✅

  const [form, setForm] = useState<Case_Payload>({
    case_number: "",
    problem_type: PROBLEM_TYPES[0].value,
    error_type: ERROR_TYPES[0].value,
    description: "",
    notes: "",
    status: STATUS_OPTIONS[0].value,
    cust_connect: CUST_CONNECT[0].value,
    priority: "MEDIUM",
    assigned_to: "",
    customer: "",
  });

  // Each attachment keeps its File and preview URL together so they can
  // never get out of sync with each other (this was the root cause of the
  // "only one preview shows" bug).
  type ImageItem = { id: string; file: File; preview: string };
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const imageItemsRef = useRef<ImageItem[]>(imageItems);
  imageItemsRef.current = imageItems;

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setForm((prev) => ({ ...prev, assigned_to: prev.assigned_to || fullname }));
  }, [fullname]);

  // Revoke all object URLs on unmount to avoid memory leaks.
  useEffect(() => {
    return () => {
      imageItemsRef.current.forEach((item) =>
        URL.revokeObjectURL(item.preview),
      );
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    const name = (e.target as HTMLElement & { name?: string }).name;
    if (name) setTouched((prev) => ({ ...prev, [name]: true }));
  };

  // Accepts any number of files, filters non-images, and caps the total at MAX_IMAGES.
  const applyImages = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const room = MAX_IMAGES - imageItems.length;
    if (room <= 0) {
      toast.warn(`ສາມາດອັບໂຫລດໄດ້ສູງສຸດ ${MAX_IMAGES} ຮູບ`);
      return;
    }

    const accepted = imageFiles.slice(0, room);
    if (imageFiles.length > accepted.length) {
      toast.warn(`ສາມາດອັບໂຫລດໄດ້ສູງສຸດ ${MAX_IMAGES} ຮູບ, ບາງໄຟລ໌ຖືກຂ້າມໄປ`);
    }

    const newItems: ImageItem[] = accepted.map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}-${Math.random()
        .toString(36)
        .slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setImageItems((prev) => [...prev, ...newItems]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) applyImages(files);
    // allow re-selecting the same file(s) again later
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) applyImages(files);
  };

  const removeImage = (id: string) => {
    setImageItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((item) => item.id !== id);
    });
  };

  const descLen = form.description.trim().length;

  const isValid =
    form.case_number.trim() !== "" &&
    form.problem_type.trim() !== "" &&
    form.error_type.trim() !== "" &&
    descLen >= DESC_MIN &&
    form.status.trim() !== "" &&
    form.priority.trim() !== "" &&
    form.customer.trim() !== "" &&
    form.cust_connect.trim() !== "" &&
    form.assigned_to.trim() !== "";

  const handleSubmit = () => {
    setTouched({ case_number: true, customer: true, description: true });
    if (!isValid || isPending) return;
    mutate(
      // NOTE: this now sends `images` (an array) instead of a single `image`.
      // Make sure useCreateCaseMutation / the API endpoint is updated to accept
      // an array of files (e.g. appended as images[] in the FormData).
      { data: form, images: imageItems.map((item) => item.file) },
      {
        onSuccess: (response) => {
          if (response?.success) {
            toast.success("ບັນທຶກຂໍ້ມູນສຳເລັດ");
            onClose();
          }
        },
        onError: (err) => {
          console.error(err);
          toast.error("ບັນທຶກຂໍ້ມູນບໍ່ສຳເລັດ");
        },
      },
    );
  };

  const handleClose = () => {
    imageItems.forEach((item) => URL.revokeObjectURL(item.preview));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex w-full max-w-5xl flex-col rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-slate-900/10 max-h-[95vh]">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <FileText size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-800">
                Create Support Case
              </h1>
              <p className="text-xs text-slate-500">
                ກະລຸນາກອກຂໍ້ມູນເຄສໃຫ້ຄົບຖ້ວນ ແລະ ຖືກຕ້ອງ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 ">
            <span className="text-sm flex  w-fit  text-slate-500 ">
              ພະນັກງານຮັບເຄສ: {fullname}
            </span>
            <button
              onClick={handleClose}
              disabled={isPending}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* ── Left (2 cols) ── */}
            <div className="space-y-5 lg:col-span-2">
              {/* Basic Info */}
              <SectionCard title="Basic Information">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field
                    label="ລະຫັດເຄສ"
                    error={
                      touched.case_number && !form.case_number.trim()
                        ? "ກະລຸນາລະບຸລະຫັດເຄສ"
                        : undefined
                    }
                  >
                    <input
                      name="case_number"
                      value={form.case_number}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="CS-2026-0001"
                      className={inputCls(
                        touched.case_number && !form.case_number.trim(),
                      )}
                    />
                  </Field>

                  <Field
                    label="ຂໍ້ມູນລູກຄ້າ"
                    error={
                      touched.customer && !form.customer.trim()
                        ? "ກະລຸນາລະບຸຂໍ້ມູນລູກຄ້າ"
                        : undefined
                    }
                  >
                    <input
                      name="customer"
                      value={form.customer}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="ຊື່ ຫຼື ເບີໂທລູກຄ້າ"
                      className={inputCls(
                        touched.customer && !form.customer.trim(),
                      )}
                    />
                  </Field>

                  <Field label="ຊອງທາງລູກຄ້າແຈ້ງຂໍ້ມູນເຄສ">
                    <select
                      name="cust_connect"
                      value={form.cust_connect}
                      onChange={handleChange}
                      className={inputCls()}
                    >
                      {CUST_CONNECT.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </SectionCard>

              {/* Case Details */}
              <SectionCard title="Case Details">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="ປະເພດຜະລິດຕະພັນ">
                    <select
                      name="problem_type"
                      value={form.problem_type}
                      onChange={handleChange}
                      className={inputCls()}
                    >
                      {PROBLEM_TYPES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="ປະເພດບັນຫາ">
                    <select
                      name="error_type"
                      value={form.error_type}
                      onChange={handleChange}
                      className={inputCls()}
                    >
                      {ERROR_TYPES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="ຄວາມສຳຄັນ">
                    <select
                      name="priority"
                      value={form.priority}
                      onChange={handleChange}
                      className={inputCls()}
                    >
                      {PRIORITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="ສະຖານະ">
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className={inputCls()}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        ລາຍລະອຽດບັນຫາ
                      </label>
                      <span
                        className={`text-xs tabular-nums ${
                          descLen < DESC_MIN ? "text-red-400" : "text-slate-400"
                        }`}
                      >
                        {descLen}/{DESC_MAX}
                        {descLen < DESC_MIN && ` · ຕ້ອງການ ${DESC_MIN} ຕົວ`}
                      </span>
                    </div>
                    <textarea
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="ກະລຸນາລະບຸລາຍລະອຽດບັນຫາ..."
                      rows={5}
                      maxLength={DESC_MAX}
                      className={`${inputCls(
                        touched.description && descLen < DESC_MIN,
                      )} resize-none`}
                    />

                    {touched.description && descLen < DESC_MIN && (
                      <p className="mt-1 text-xs text-red-500">
                        ລາຍລະອຽດຕ້ອງມີຢ່າງໜ້ອຍ {DESC_MIN} ຕົວອັກສອນ
                      </p>
                    )}
                  </div>
                  {/* /// ໝາຍເຫດ: ບໍ່ມີການສ້າງຟອມໃນໝາຍເຫດນີ້, ແຕ່ມັນເປັນຄ່າ placeholder ສໍາລັບ code ທີ່ອາດເພີ່ມເນານ.  */}
                  <div className="sm:col-span-2">
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        ໝາຍເຫດ / ຂໍ້ສະເໜີ
                      </label>
                    </div>
                    <textarea
                      name="notes"
                      value={form.notes || ""}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="ຫມາຍເຫດ..."
                      rows={3}
                      className={`${inputCls()} resize-none`}
                    />
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* ── Right (1 col) ── */}
            <div className="space-y-5">
              {/* Upload */}
              <SectionCard title="Attachment">
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all ${
                    imageItems.length >= MAX_IMAGES
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                      : dragOver
                        ? "border-blue-400 bg-blue-50"
                        : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (imageItems.length < MAX_IMAGES) setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Upload size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Click or drag to upload
                    </p>
                    <p className="text-xs text-slate-500">
                      PNG, JPG, JPEG · ເລືອກໄດ້ຫຼາຍຮູບ · {imageItems.length}/
                      {MAX_IMAGES}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    disabled={imageItems.length >= MAX_IMAGES}
                    className="hidden"
                  />
                </label>

                {imageItems.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {imageItems.map((item, i) => (
                      <div
                        key={item.id}
                        className="relative overflow-hidden rounded-xl border border-slate-200"
                      >
                        <img
                          src={item.preview}
                          alt={`preview-${i + 1}`}
                          className="h-24 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(item.id)}
                          disabled={isPending}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                          aria-label="Remove image"
                        >
                          <Trash2 size={12} />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 truncate bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                          {item.file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-center rounded-xl bg-slate-100 py-5 text-xs text-slate-400">
                    ຍັງບໍ່ມີຮູບພາບ
                  </div>
                )}
              </SectionCard>

              {/* Summary */}
              <SectionCard title="Summary">
                <div className="space-y-2.5">
                  {[
                    { label: "Case No", value: form.case_number || "—" },
                    { label: "Customer", value: form.customer || "—" },
                    {
                      label: "Product",
                      value: getLabel(PROBLEM_TYPES, form.problem_type),
                    },
                    {
                      label: "Error",
                      value: getLabel(ERROR_TYPES, form.error_type),
                    },
                    {
                      label: "Status",
                      value: getLabel(STATUS_OPTIONS, form.status),
                    },
                    {
                      label: "cust_connect",
                      value: form.cust_connect || "—",
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <span className="shrink-0 text-slate-500">
                        {row.label}
                      </span>
                      <span className="text-right font-medium text-slate-700 break-all">
                        {row.value}
                      </span>
                    </div>
                  ))}

                  {/* Priority badge */}
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="shrink-0 text-slate-500">Priority</span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPriorityColor(
                        form.priority,
                      )}`}
                    >
                      {getLabel(PRIORITY_OPTIONS, form.priority)}
                    </span>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

          {/* API error */}
          {isError && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ບັນທຶກຂໍ້ມູນບໍ່ສຳເລັດ — ກະລຸນາລອງໃໝ່
              {error instanceof Error ? ` (${error.message})` : null}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4 rounded-b-2xl">
          <button
            onClick={handleClose}
            disabled={isPending}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            ຍົກເລີກ
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={14} />
            {isPending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກຂໍ້ມູນ"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal_create_cases;
