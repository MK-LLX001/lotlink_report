// src/app/CASES-LOTTO/hooks/Hooks_Cases.ts

import { useQuery } from "@tanstack/react-query";
import { Promotion_Service } from "../service/service.promotion";
import { POMOTION_KEYS } from "../top_up.key";
import { PromotionEntity } from "../types/types.pomotion";

const HEAVY_QUERY_OPTIONS = {
    staleTime: 1000 * 60 * 20,
    gcTime: 1000 * 60 * 45,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 0,
};

export const useGetPromotion = (formDate: Date | null, toDate: Date | null) =>
    useQuery<PromotionEntity | null>({
        queryKey: POMOTION_KEYS.all(formDate, toDate),
        queryFn: () => Promotion_Service.fetchPromotion(formDate!, toDate!),
        enabled: !!formDate && !!toDate,
        ...HEAVY_QUERY_OPTIONS,
    });
