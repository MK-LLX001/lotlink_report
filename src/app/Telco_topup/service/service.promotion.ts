// src/app/CASES-LOTTO/services/Service_Cases.ts
import axiosInstance from "@/lib/axios_instance";

const BASE = "/oracle/promotion"; // ✅ path ต้องมี /api/ นำหน้า

class Promotion_ServiceClass {
  async fetchPromotion(fromDate: Date, toDate: Date) {
    const format = (d: Date) => d.toISOString().split("T")[0]; // "YYYY-MM-DD"

    const res = await axiosInstance.get(BASE, {
      params: {
        action: "Promotion",
        fromDate: format(fromDate),
        toDate: format(toDate),
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data;
  }
}

export const Promotion_Service = new Promotion_ServiceClass();
