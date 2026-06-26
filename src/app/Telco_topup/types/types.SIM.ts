// src/app/Telco_topup/types/types.SIM.ts
export interface SIM_ENTITY {
    TXN_DATE: string;
    LTC_IDX: number | null;
    LTC_PROVIDER: string;
    LTC_TIME: string | null;
    LTC_BALANCE: string | null;
    TPLUS_IDX: number | null;
    TPLUS_PROVIDER: string;
    TPLUS_TIME: string | null;
    TPLUS_BALANCE: string | null;
    ETL_IDX: number | null;
    ETL_PROVIDER: string;
    ETL_TIME: string | null;
    ETL_BALANCE: string | null;
    UNITEL_IDX: number | null;
    UNITEL_PROVIDER: string;
    UNITEL_TIME: string | null;
    UNITEL_BALANCE: string | null;
}