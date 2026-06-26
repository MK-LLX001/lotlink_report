export const CASES_SUPPORT_KEYS = {
  all: ["cases-support"] as const,

  lists: () => [...CASES_SUPPORT_KEYS.all, "list"] as const,
  list: (params?: unknown) => [...CASES_SUPPORT_KEYS.lists(), params] as const,

  details: () => [...CASES_SUPPORT_KEYS.all, "detail"] as const,
  detail: (id: string) => [...CASES_SUPPORT_KEYS.details(), id] as const,

  updates: () => [...CASES_SUPPORT_KEYS.all, "update"] as const,
  update: (id: string) => [...CASES_SUPPORT_KEYS.updates(), id] as const,
};

// ── BCEL keys แยกออกมาเลย ──────────────────────────────────────────────────

export const BCEL_KEYS = {
  all: ["bcel"] as const,

  order: (caseNumber: string) => [caseNumber] as const,
  stmt: (id: string) => ["bcel", "stmt", id] as const,
  reward: (id: string) => ["bcel", "reward", id] as const,
};
export const SPIN_KEYS = {
  all: ["spin"] as const,

  order: (caseNumber: string) => [caseNumber] as const,
  stmt: (caseNumber: string) => ["spin", "stmt", caseNumber] as const,
  refundPoints: (caseNumber: string) => ["spin", "refund-points", caseNumber] as const,
};

export const LDB_KEYS = {
  all: ["ldb"] as const,

  order: (caseNumber: string) => [caseNumber] as const,
  stmt: (id: string) => ["ldb", "stmt", id] as const,
  reward: (id: string) => ["ldb", "reward", id] as const,
};
export const JDB_KEYS = {
  all: ["jdb"] as const,

  order: (caseNumber: string) => [caseNumber] as const,
  stmt: (id: string) => ["jdb", "stmt", id] as const,
  reward: (id: string) => ["jdb ", "reward", id] as const,
};

export const User_KEYS = {
  all: ["user"] as const,
  order: (caseNumber: string) => [caseNumber] as const,
};
