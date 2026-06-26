// ── hook/hook.daily.ts ────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dailyService } from "../service/service.daily";
import type {
  DailyServicePayload,
  DailyServiceListParams,
  DailyServiceListResponse,
} from "../types/types.daily.service";
import { DAILY_SERVICE_KEYS } from "../keys/key.daily.service";

const STALE_TIME = 1000 * 60 * 15;
const GC_TIME = 1000 * 60 * 20;

const baseQueryOptions = {
  staleTime: STALE_TIME,
  gcTime: GC_TIME,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: true,
  retry: 2,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10_000),
};

// ── CREATE ────────────────────────────────────────────────────────────────────

export const useCreateDailyService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      images,
    }: {
      data: DailyServicePayload;
      images?: File[];
    }) => dailyService.create(data, images),
    onSuccess: (res) => {
      if (res?.success)
        qc.invalidateQueries({ queryKey: DAILY_SERVICE_KEYS.list() });
    },
  });
};

// ── LIST ──────────────────────────────────────────────────────────────────────

export const useDailyServiceQuery = (params: DailyServiceListParams) =>
  useQuery<DailyServiceListResponse, Error>({
    queryKey: [...DAILY_SERVICE_KEYS.list(), params],
    queryFn: () => dailyService.fetchList(params),
    enabled: true, // ✅ fetch ทันทีเมื่อ mount
    ...baseQueryOptions,
  });
