// hooks/useCompany.ts
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios_instance";

const KEY_QUERY = {
  LDB_RCT: "LDB_RECONCILIATION",
};

interface DateRange {
  dateFrom: string; // "YYYY-MM-DD"
  dateTo: string;   // "YYYY-MM-DD"
  account?: string;
}

export const LDB_Reconciliation = ({ dateFrom, dateTo, account }: DateRange) => {
  return useQuery({
    queryKey: [KEY_QUERY.LDB_RCT, dateFrom, dateTo, account], 
    queryFn: async () => {
      const { data } = await axiosInstance.get("/oracle", {
        params: {
          view: KEY_QUERY.LDB_RCT,
          date_from: dateFrom,
          date_to: dateTo,
          account, 
        },
        timeout: 15000,
      });
      return data;
    },
    enabled: !!dateFrom && !!dateTo && !!account, // ✅ fetch เมื่อมีวันครบทั้งคู่และ account
  });
};