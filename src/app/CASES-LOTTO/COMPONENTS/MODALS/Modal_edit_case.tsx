import React, { useEffect, useMemo, useState } from "react";
import { useUpdateCaseMutation } from "../../hooks/Hooks_Cases";
import type { DataTypeCases, Case_Payload } from "../../types/Type_Cases";
import { toast } from "react-toastify";

interface Props {
  data: DataTypeCases;
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

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "ບັນທົ່ວໄປ" },
  { value: "MEDIUM", label: "ລະດັບກາງ" },
  { value: "HIGH", label: "ສູງ" },
  { value: "MAX-HIGH", label: "ສູງສຸດ" },
] as const;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

const Modal_edit_case: React.FC<Props> = ({ data, onClose }) => {
  const { mutate, isPending, isError, error } = useUpdateCaseMutation();

  const [form, setForm] = useState<Partial<Case_Payload>>({
    case_number: "",
    problem_type: "",
    error_type: "",
    description: "",
    status: "",
    priority: "",
    assigned_to: "",
    customer: "",
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      case_number: data.case_number || "",
      problem_type: data.problem_type || "",
      error_type: data.error_type || "",
      description: data.description || "",
      status: data.status || "",
      priority: data.priority || "",
      assigned_to: data.assigned_to || "",
      customer: data.customer || "",
    });
  }, [data]);

  const isValid = useMemo(() => {
    return (
      (form.case_number || "").trim() !== "" &&
      (form.problem_type || "").trim() !== "" &&
      (form.error_type || "").trim() !== "" &&
      (form.description || "").trim().length >= 3 &&
      (form.status || "").trim() !== "" &&
      (form.priority || "").trim() !== "" &&
      (form.assigned_to || "").trim() !== ""
    );
  }, [form]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!isValid) {
      toast.warning("ກະລຸນາກວດສອບຂໍ້ມູນໃຫ້ຄົບຖ້ວນ");
      return;
    }
    if (isPending) return;

    // Convert the numeric ID to a string to match the hook's requirements
    mutate(
      {
        id: String(data.id),
        data: form,
      },
      {
        onSuccess: () => {
          toast.success("ແກ້ໄຂສຳເລັດ");
          onClose();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Update failed");
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Edit Support Case
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              ແກ້ໄຂຂໍ້ມູນເຄສ — {data.case_number}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[85vh] overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-bold text-slate-800">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className={labelClass}>ລະຫັດເຄສ</label>
                  <input
                    name="case_number"
                    value={form.case_number || ""}
                    onChange={handleChange}
                    placeholder="CS-2026-0001"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    ຂໍ້ມູນຕິດຕໍ່ ຫຼື ຊື່ລູກຄ້າ
                  </label>
                  <input
                    name="customer"
                    value={form.customer || ""}
                    onChange={handleChange}
                    placeholder="ຂໍ້ມູນຕິດຕໍ່ ຫຼື ຊື່ລູກຄ້າ"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>ພະນັກງານປ້ອນຂໍ້ມູນ</label>
                  <input
                    name="assigned_to"
                    value={form.assigned_to || ""}
                    onChange={handleChange}
                    readOnly
                    className={`${inputClass} bg-slate-100 text-slate-500 cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>

            {/* Case Details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-bold text-slate-800">
                Case Details
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>ປະເພດຜະລິດຕະພັນ</label>
                  <select
                    name="problem_type"
                    value={form.problem_type || ""}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      -- ເລືອກປະເພດ --
                    </option>
                    {PROBLEM_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>ປະເພດບັນຫາ</label>
                  <select
                    name="error_type"
                    value={form.error_type || ""}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      -- ເລືອກບັນຫາ --
                    </option>
                    {ERROR_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>ຄວາມສຳຄັນ</label>
                  <select
                    name="priority"
                    value={form.priority || ""}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      -- ເລືອກລະດັບ --
                    </option>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>ສະຖານະ</label>
                  <select
                    name="status"
                    value={form.status || ""}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      -- ເລືອກສະຖານະ --
                    </option>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>ລາຍລະອຽດບັນຫາ</label>
                  <textarea
                    name="description"
                    value={form.description || ""}
                    onChange={handleChange}
                    placeholder="ກະລຸນາລະບຸລາຍລະອຽດບັນຫາ..."
                    rows={5}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {isError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {(error as Error)?.message || "Update failed"}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex flex-col-reverse justify-end gap-3 border-t border-slate-200 pt-5 sm:flex-row">
            <button
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              ຍົກເລີກ
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || isPending}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກຂໍ້ມູນ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal_edit_case;
