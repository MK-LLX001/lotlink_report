// src/app/CASES-LOTTO/hooks/Hooks_Cases.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { casesService } from "../services/Service.cases";
import { CASES_SUPPORT_KEYS } from "../constants/key_cases";
import type {
  CasesListParams,
  CasesListResponse,
  Case_Payload,
} from "../types/Type_Cases";

const STALE_TIME = 1000 * 60 * 15;
const GC_TIME = 1000 * 60 * 20;

const queryOptions = {
  staleTime: STALE_TIME,
  gcTime: GC_TIME,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: true,
  retry: 2,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000),
};

// ── Query list ────────────────────────────────────────────────────────────────

export const useCasesQuery = (params: CasesListParams) =>
  useQuery<CasesListResponse, Error>({
    queryKey: [...CASES_SUPPORT_KEYS.list(), params],
    queryFn: () => casesService.fetchList(params),
    ...queryOptions,
  });

// ── Query single ──────────────────────────────────────────────────────────────

export const useCaseQuery = (id: string) =>
  useQuery({
    queryKey: CASES_SUPPORT_KEYS.detail(id),
    queryFn: () => casesService.fetchById(id),
    enabled: !!id, // ไม่ fetch ถ้าไม่มี id
    ...queryOptions,
  });

// ── Create ────────────────────────────────────────────────────────────────────

export const useCreateCaseMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, images }: { data: Case_Payload; images?: File[] }) =>
      casesService.create(data, images),
    onSuccess: (res) => {
      if (res.success)
        qc.invalidateQueries({ queryKey: CASES_SUPPORT_KEYS.list() });
    },
  });
};

// ── Update ────────────────────────────────────────────────────────────────────

export const useUpdateCaseMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string | number;
      data: Partial<Case_Payload>;
      image?: File;
    }) => casesService.update(String(id), data),
    onSuccess: (res, { id }) => {
      if (res?.success) {
        qc.invalidateQueries({ queryKey: CASES_SUPPORT_KEYS.list() });
        qc.invalidateQueries({
          queryKey: CASES_SUPPORT_KEYS.detail(String(id)),
        });
      }
    },
  });
};

// ── Delete ────────────────────────────────────────────────────────────────────

export const useDeleteCaseMutation = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, username }: { id: string; username: string }) =>
      casesService.delete(id, username),

    onSuccess: (res) => {
      if (res.success) {
        qc.invalidateQueries({ queryKey: CASES_SUPPORT_KEYS.list() });
      }
    },
  });
};

// ── Log ───────────────────────────────────────────────────────────────────────

export const useLogCaseMutation = () =>
  useMutation({
    mutationFn: ({
      case_id,
      username,
    }: {
      case_id: string;
      username: string;
    }) => casesService.log(case_id, username),
  });

export const useOffCaseMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      userName,
      status,
    }: {
      id: string | number;
      userName: string;
      status: string;
    }) => casesService.offCases(String(id), userName, status),

    onSuccess: (res, { id }) => {
      if (res?.success) {
        qc.invalidateQueries({ queryKey: CASES_SUPPORT_KEYS.list() });
        qc.invalidateQueries({
          queryKey: CASES_SUPPORT_KEYS.detail(String(id)),
        });
      }
    },
  });
};

// useGetCaseByUserReportMutation
export const useGetCaseByUserReportMutation = () => {
  return useMutation({
    mutationFn: ({
      userName,
      fromDate,
      toDate,
      problemType,
    }: {
      userName: string;
      fromDate?: string;
      toDate?: string;
      problemType?: string;
    }) =>
      casesService.GetCasesByUserReport(
        userName,
        fromDate,
        toDate,
        problemType,
      ),
  });
};
