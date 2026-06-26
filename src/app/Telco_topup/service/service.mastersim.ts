// src/app/CASES-LOTTO/services/Service_Cases.ts
import axiosInstance from "@/lib/axios_instance";

const BASE = "/oracle/SIM"; // ✅ path ต้องมี /api/ นำหน้า

class SIM_ServiceClass {
  async fetchById(fromDate: Date, toDate: Date) {
    const format = (d: Date) => d.toISOString().split("T")[0]; // "YYYY-MM-DD"

    const res = await axiosInstance.get(BASE, {
      params: {
        action: "OrderSIM",
        fromDate: format(fromDate),
        toDate: format(toDate),
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data;
  }
}

export const SIM_Service = new SIM_ServiceClass();
