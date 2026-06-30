"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import Modal_Update_case from "../../COMPONENTS/MODALS/Modal_Update_case";
import type { DataTypeCases } from "../../types/Type_Cases";
import { ImageCell } from "@/app/utils/Preview_img";
import { resolveImageSrc } from "@/app/utils/img_path";
import { Edit3 } from "lucide-react";
interface CaseImage {
  id: number;
  image_url: string;
}

interface Props {
  data: DataTypeCases | null;
  onClose: () => void;
}

const MENU_MAP: Record<
  string,
  { label: string; to: string; passData?: boolean }
> = {
  LOTTO_LDB: {
    label: "ORDER-LDB",
    to: "/CASES-LOTTO/COMPONENTS/LDB/ORDERS",
    passData: true,
  },
  LOTTO_BCEL: {
    label: "ORDER-BCEL",
    to: "/CASES-LOTTO/COMPONENTS/BCEL-ONE/ORDERS",
    passData: true,
  },
  LOTTO_JDB: {
    label: "ORDER-JDB",
    to: "/CASES-LOTTO/COMPONENTS/LDB/ORDERS",
    passData: true,
  },
  SPIN: {
    label: "ORDER-SPIN",
    to: "/CASES-LOTTO/COMPONENTS/SPIN/ORDERS",
    passData: true,
  },
  P_NOT_REWARD: {
    label: "ORDER-POINT",
    to: "/CASES-LOTTO/COMPONENTS/BCEL-ONE/ORDERS",
    passData: true,
  },
  P_NOT_BILL: {
    label: "REFUND-POINT",
    to: "/CASES-LOTTO/COMPONENTS/POINT",
    passData: true,
  },
};

const Modal_case_detail: React.FC<Props> = ({ data, onClose }) => {
  const menu = useMemo(() => {
    return (
      MENU_MAP[data?.problem_type ?? ""] ?? {
        label: "Open Related Menu",
        to: "",
        passData: false,
      }
    );
  }, [data?.problem_type]);

  // ── ดึงรูปทั้งหมดจาก case_images ──────────────────────────────────────────
  const [images, setImages] = useState<CaseImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const isClosed = status === "ປິດເຄສສຳເລັດແລ້ວ";

  useEffect(() => {
    if (!data?.id) return;
    setLoadingImages(true);
    fetch(`/api/oracle/Cases_support?action=getById&id=${data.id}`)
      .then((r) => r.json())
      .then((res) => {
        // res.data.images คือ array จาก case_images ที่ findById ดึงมา
        const imgs: CaseImage[] = res?.data?.images ?? [];
        // ถ้ายังไม่มีใน case_images เลย fallback ไปใช้ image_url เดิม
        if (imgs.length === 0 && data.image_url) {
          setImages([{ id: 0, image_url: data.image_url }]);
        } else {
          setImages(imgs);
        }
      })
      .catch(() => {
        // fetch ล้มเหลว — fallback ใช้ image_url เดิม
        if (data.image_url) {
          setImages([{ id: 0, image_url: data.image_url }]);
        }
      })
      .finally(() => setLoadingImages(false));
  }, [data?.id, data?.image_url]);

  if (!data) return null;

  const getStatusClass = (status: string) => {
    switch (status) {
      case "OPEN":
      case "ຫາກະແຈ້ງມາ":
        return "bg-amber-50 text-amber-600 border-amber-200/60";
      case "ກຳລັງດຳເນີນ":
        return "bg-blue-50 text-blue-600 border-blue-200/60";
      case "ແກ້ໄຂແລ້ວ":
        return "bg-emerald-50 text-emerald-600 border-emerald-200/60";
      case "ປິດເຄສສຳເລັດແລ້ວ":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-50 text-slate-500 border-slate-200/60";
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-slate-50 text-slate-500 border-slate-200/60";
      case "MEDIUM":
        return "bg-yellow-50 text-yellow-600 border-yellow-200/60";
      case "HIGH":
        return "bg-orange-50 text-orange-600 border-orange-200/60";
      case "MAX-HIGH":
        return "bg-rose-50 text-rose-600 border-rose-200/60";
      default:
        return "bg-slate-50 text-slate-500 border-slate-200/60";
    }
  };

  const formatDate = (dateString?: string | null) => {
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

  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="grid grid-cols-2 gap-1 border-b border-slate-100/70 py-3 sm:grid-cols-[180px_1fr] items-start transition-colors hover:bg-slate-50/40 px-2 rounded-lg">
      <div className="text-xs font-semibold tracking-wide text-slate-400 sm:pt-0.5">
        {label}
      </div>
      <div className="break-words text-sm font-medium text-slate-700 leading-relaxed">
        {value || "-"}
      </div>
    </div>
  );

  const buildHref = () => {
    if (!menu.to) return "";
    if (menu.passData) {
      const params = new URLSearchParams({
        case_number: data.case_number ?? "",
        error_type: data.error_type ?? "",
        type_status: data.status ?? "",
      });
      return `${menu.to}?${params.toString()}`;
    }
    return menu.to;
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-notosanlao antialiased">
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
          onClick={onClose}
        />

        <div className="relative z-10 w-full max-w-6xl rounded-2xl border border-slate-100 bg-white shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-white">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                  Case Detail Review
                </h2>
                <span className="text-[11px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded-md border border-slate-200/40">
                  ID: {data.id}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                ລາຍລະອຽດເຄສ ແລະ ຂໍ້ມູນລະບົບທັງໝົດຢ່າງຄົບຖ້ວນ
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left: Images */}
              <div className="lg:col-span-1 space-y-6">
                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm sticky top-0">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Attachment ຫຼັກຖານ</span>
                    {images.length > 0 && (
                      <span className="text-[10px] bg-blue-50 text-blue-500 border border-blue-100 px-2 py-0.5 rounded-full font-semibold">
                        {images.length} ຮູບ
                      </span>
                    )}
                  </h3>

                  {/* Loading state */}
                  {loadingImages && (
                    <div className="flex h-40 items-center justify-center text-xs text-slate-400 gap-2">
                      <svg
                        className="h-4 w-4 animate-spin text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      ກຳລັງໂຫລດຮູບ...
                    </div>
                  )}

                  {/* Images grid */}
                  {!loadingImages && images.length > 0 && (
                    <div
                      className={`gap-2 ${images.length === 1 ? "flex flex-col" : "grid grid-cols-2"}`}
                    >
                      {images.map((img, i) => (
                        <div
                          key={img.id || i}
                          className="rounded-xl border border-slate-150 bg-slate-50/50 p-2 flex flex-col items-center justify-center"
                        >
                          <ImageCell
                            src={resolveImageSrc(img.image_url)}
                            alt={`${data.case_number} รูป ${i + 1}`}
                            className={`w-full rounded-lg shadow-sm bg-white ${images.length === 1 ? "h-auto max-h-fit" : "h-28 object-cover"}`}
                          />
                          {images.length === 1 && (
                            <p className="mt-2 text-center text-[11px] text-slate-400">
                              ກົດທີ່ຮູບເພື່ອຂະຫຍາຍ / ຫຍໍ້
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {!loadingImages && images.length === 0 && (
                    <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-slate-400 gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-slate-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-xs font-medium">
                        No image attached
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Detail */}
              <div className="lg:col-span-2 space-y-6">
                {/* Primary Info */}
                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-50 pb-3.5">
                    <h3 className="text-base font-bold text-slate-800 mr-2">
                      ລະຫັດເຄສ: {data.case_number}
                    </h3>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(data.status)}`}
                    >
                      {data.status}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPriorityClass(data.priority)}`}
                    >
                      {data.priority}
                    </span>
                  </div>
                  <div className="space-y-1 grid grid-cols-2">
                    <InfoRow
                      label="ຂໍ້ມູນລູກຄ້າ (Customer)"
                      value={data.customer}
                    />
                    <InfoRow
                      label="ປະເພດສິນຄ້າ (Product Type)"
                      value={data.problem_type}
                    />
                    <InfoRow
                      label="ປະເພດບັນຫາ (Error Type)"
                      value={data.error_type}
                    />
                    <InfoRow
                      label="ພະນັກງານຮັບຜິດຊອບ"
                      value={data.assigned_to}
                    />
                    <InfoRow
                      label="ຊອງທາງລູກຄ້າຕິດຕໍ່"
                      value={data.cust_connect}
                    />
                  </div>
                </div>

                {/* Timeline */}
                <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Timeline & History
                  </h3>
                  <div className="space-y-1  grid grid-cols-2">
                    <InfoRow
                      label="ວັນທີຮັບແຈ້ງ"
                      value={formatDate(data.StartDate)}
                    />
                    <InfoRow
                      label="ວັນທີສຳເລັດ"
                      value={formatDate(data.EndDate)}
                    />
                    <InfoRow
                      label="ວັນທີສ້າງເຄສ"
                      value={formatDate(data.created_at)}
                    />

                    <InfoRow
                      label="ວັນທີປິດເຄສສຳເລັດ"
                      value={formatDate(data.resolved_at)}
                    />

                    <InfoRow label="ພະນັກງານປິດເຄສ" value={data.close_user} />
                    <InfoRow
                      label="ວັນທີອັບເດດລ່າສຸດ"
                      value={formatDate(data.updated_at)}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    ລາຍລະອຽດບັນຫາ (Description)
                  </h3>
                  <div className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm leading-7 text-slate-600 font-medium">
                    {data.description || "- No description provided -"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    ບັນທຶກ (Notes)
                  </h3>
                  <div className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-sm leading-7 text-slate-600 font-medium">
                    {data.notes || "- No notes provided -"}
                  </div>
                </div>

                {/* Removal Info */}
                {(data.remove_at || data.remove_user) && (
                  <div className="rounded-xl border border-red-100 bg-red-50/20 p-5 shadow-sm">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                      Removal Information (ຂໍ້ມູນການລຶບເຄສ)
                    </h3>
                    <div className="space-y-1 bg-white rounded-lg p-2 border border-red-50">
                      <InfoRow
                        label="ວັນທີລຶບເຄສ"
                        value={
                          <span className="text-red-600 font-semibold">
                            {formatDate(data.remove_at)}
                          </span>
                        }
                      />
                      <InfoRow
                        label="ຜູ້ລຶບເຄສ"
                        value={
                          <span className="text-red-600 font-semibold">
                            {data.remove_user}
                          </span>
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {menu.to ? (
                <Link
                  href={buildHref()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <span>{menu.label}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 3h7m0 0v7m0-7L10 14M5 5v14h14"
                    />
                  </svg>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-400 border border-slate-200/40"
                >
                  Open Related Menu
                </button>
              )}
            </div>

            <div className=" flex justify-center gap-3 ">
              {(data.problem_type === "WATER" ||
                data.problem_type === "EDL") && (
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(true)}
                  disabled={isClosed}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-95 ${
                    isClosed
                      ? "cursor-not-allowed bg-slate-200 text-slate-400 shadow-none"
                      : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/10"
                  }`}
                >
                  <Edit3 size={14} />
                  ອັບເດດສະຖານະເຄສ
                </button>
              )}

              <button
                onClick={onClose}
                className="rounded-xl bg-slate-800 px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <Modal_Update_case
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          caseNumber={data.case_number || ""}
        />
      </div>
    </>,
    document.body,
  );
};

export default Modal_case_detail;
