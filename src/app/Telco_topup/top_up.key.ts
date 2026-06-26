// src/app/CASES-LOTTO/top_up.key.ts

export const MASTERSIME_KEYS = {
    /** root key — ໃຊ້ສຳລັບ invalidate ທັງໝົດທີ່ກ່ຽວກັບ mastersime */
    root: ["mastersime"] as const,

    all: (fromDate?: Date | null, toDate?: Date | null) =>
        [
            ...MASTERSIME_KEYS.root,
            "range",
            fromDate ? fromDate.toISOString().split("T")[0] : null,
            toDate ? toDate.toISOString().split("T")[0] : null,
        ] as const,
};
export const POMOTION_KEYS = {
    /** root key — ໃຊ້ສຳລັບ invalidate ທັງໝົດທີ່ກ່ຽວກັບ mastersime */
    root: ["pomotion"] as const,

    all: (fromDate?: Date | null, toDate?: Date | null) =>
        [
            ...POMOTION_KEYS.root,
            "range",
            fromDate ? fromDate.toISOString().split("T")[0] : null,
            toDate ? toDate.toISOString().split("T")[0] : null,
        ] as const,
};