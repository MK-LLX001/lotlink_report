// src/app/CASES-LOTTO/hooks/Hooks_Cases.ts

import { useQuery } from "@tanstack/react-query";
import { SIM_Service } from "../service/service.mastersim";
import { MASTERSIME_KEYS } from "../top_up.key";
import { SIM_ENTITY } from "../types/types.SIM";

const HEAVY_QUERY_OPTIONS = {
    staleTime: 1000 * 60 * 20,
    gcTime: 1000 * 60 * 45,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 0,
};

export const useGetMasterSim = (formDate: Date | null, toDate: Date | null) =>
    useQuery<SIM_ENTITY | null>({
        queryKey: MASTERSIME_KEYS.all(formDate, toDate),
        queryFn: () => SIM_Service.fetchById(formDate!, toDate!),
        enabled: !!formDate && !!toDate,
        ...HEAVY_QUERY_OPTIONS,
    });
