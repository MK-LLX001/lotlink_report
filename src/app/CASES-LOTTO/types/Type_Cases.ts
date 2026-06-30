// ─── Filter / Params ─────────────────────────────────────────────────────────
export type CasesListParams = {
  page: number;
  limit: number;
  search: string;
  status: "ALL" | "ACTIVE" | "CLOSED";
};

// ─── Single case item ─────────────────────────────────────────────────────────
export type CaseItem = {
  id: string;
  case_number: string;
  problem_type: string;
  error_type: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string;
  customer: string;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  cust_connect?: string | null;
  notes?: string | null;
  resolved_at?: string | null;
  close_user?: string | null;
  remove_at?: string | null;
  remove_user?: string | null;
  StartDate: string;
  EndDate: string | null;
};

// ─── API response ─────────────────────────────────────────────────────────────
export type CasesListResponse = {
  success: boolean;
  message: string;
  data: CaseItem[];
  total: number;
  page: number;
  limit: number;
};

// ============ list data =======

export type DataTypeCases = {
  id: number;
  case_number: string;
  customer: string;
  description: string;
  problem_type: string;
  error_type: string;
  priority: string;
  status: string;
  assigned_to: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  close_user: string | null;
  remove_at: string | null;
  remove_user: string | null;
  cust_connect: string | null;
  notes: string | null;
  StartDate: string;
  EndDate: string | null;
};

export type Case_Payload = {
  case_number: string;
  problem_type: string;
  error_type: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string;
  customer: string;
  cust_connect: string;
  notes: string;
  StartDate: string;
  EndDate: string;
};
