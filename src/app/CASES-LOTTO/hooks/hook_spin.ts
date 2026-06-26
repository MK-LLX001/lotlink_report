// src/app/CASES-LOTTO/hooks/Hooks_Cases.ts

import { useQuery } from "@tanstack/react-query";
import { Spin_Services } from "../services/service_spin";
import { SPIN_KEYS } from "../constants/key_cases";
import {
  ORDER_SPIN_ENTITY,
  REFUND_POINTS_ENTITY,
  STMT_SPIN_ENTITY,
  SpinParams,
} from "../types/Type_spin";

const HEAVY_QUERY_OPTIONS = {
  staleTime: 1000 * 60 * 20,
  gcTime: 1000 * 60 * 45,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
  retry: 0,
};

export const useGet_Order_SPIN = (caseNumber: string) =>
  useQuery<ORDER_SPIN_ENTITY | null>({
    queryKey: SPIN_KEYS.order(caseNumber), // ✅ ['spin', 'order', id]
    queryFn: () => Spin_Services.fetchSpinById(caseNumber),
    enabled: !!caseNumber,
    ...HEAVY_QUERY_OPTIONS,
  });

export const useGet_Stmt_SPIN = (caseNumber: string) =>
  useQuery<STMT_SPIN_ENTITY | null>({
    queryKey: SPIN_KEYS.stmt(caseNumber), // ✅ ['spin', 'stmt', id]
    queryFn: () => Spin_Services.fetchSpinStmtById(caseNumber),
    enabled: !!caseNumber,
    ...HEAVY_QUERY_OPTIONS,
  });
export const useGet_refund_points = (caseNumber: string) =>
  useQuery<REFUND_POINTS_ENTITY | null>({
    queryKey: SPIN_KEYS.refundPoints(caseNumber), // ✅ ['spin', 'refund-points', id]
    queryFn: () => Spin_Services.fetchRefundPointsById(caseNumber),
    enabled: !!caseNumber,
    ...HEAVY_QUERY_OPTIONS,
  });

export const useGetWinnerSpin = (params: SpinParams | null) =>
  useQuery({
    queryKey: ["spin", "winner", params],
    queryFn: () =>
      Spin_Services.fetchWinner(
        params!.fromDate,
        params!.toDate,
        params!.amount,
      ),
    enabled: !!params?.fromDate && !!params?.toDate, // fetch เมื่อมี params เท่านั้น
  });
