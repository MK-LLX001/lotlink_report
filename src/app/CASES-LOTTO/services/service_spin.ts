// src/app/CASES-LOTTO/services/Service_Cases.ts
import axiosInstance from "@/lib/axios_instance";

const BASE = "/oracle/SPIN"; // ✅ path ต้องมี /api/ นำหน้า

class Spin_Service {
  async fetchSpinById(caseNumber: string) {
    const res = await axiosInstance.get(BASE, {
      params: {
        action: "OrderSpin",
        caseNumber: caseNumber, // ✅ route รับ p.get("id") ไม่ใช่ case_number
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data; // ✅ unwrap { success, data } → return แค่ data
  }

  async fetchSpinStmtById(caseNumber: string) {
    const res = await axiosInstance.get(BASE, {
      params: {
        action: "StmtSpin",
        caseNumber: caseNumber, // ✅ route รับ p.get("id") ไม่ใช่ case_number
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data; // ✅ unwrap { success, data } → return แค่ data
  }

  async fetchRefundPointsById(caseNumber: string) {
    const res = await axiosInstance.get(BASE, {
      params: {
        action: "RefundPoints",
        caseNumber: caseNumber, // ✅ route รับ p.get("id") ไม่ใช่ case_number
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data; // ✅ unwrap { success, data } → return แค่ data
  }

  async fetchWinner(fromDate: string, toDate: string, amount?: string) {
    const res = await axiosInstance.get(BASE, {
      params: {
        action: "winner",
        fromDate,
        toDate,
        ...(amount ? { amount } : {}),
      },
      timeout: 5 * 60 * 1000,
    });
    return res.data.data;
  }
}

export const Spin_Services = new Spin_Service();
