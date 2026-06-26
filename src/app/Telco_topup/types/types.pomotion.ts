export interface PromotionEntity {
    PROMO_DATE: string;       // Date of the promotion (e.g., '2026-06-18')
    PROMO_TXN_TOTAL: number;  // Total number of transactions
    AMT_TOTAL: number;        // Total amount

    // LTC Metrics
    TXN_LTC: number;          // Transaction count for LTC
    AMT_LTC: number;          // Amount for LTC

    // TPLUS Metrics
    TXN_TPLUS: number;        // Transaction count for TPLUS
    AMT_TPLUS: number;        // Amount for TPLUS

    // ETL Metrics
    TXN_ETL: number;          // Transaction count for ETL
    AMT_ETL: number;          // Amount for ETL

    // UNITEL Metrics
    TXN_UNITEL: number;       // Transaction count for UNITEL
    AMT_UNITEL: number;       // Amount for UNITEL
}