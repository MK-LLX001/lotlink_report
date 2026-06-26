export const DAILY_SERVICE_KEYS = {
  all: ["daily-services"] as const,
  lists: () => [...DAILY_SERVICE_KEYS.all, "list"] as const,
  list: (params?: unknown) => [...DAILY_SERVICE_KEYS.lists(), params] as const,

  details: () => [...DAILY_SERVICE_KEYS.all, "detail"] as const,
};
