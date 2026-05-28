const API_BASE = "/api/backend";

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type DashboardSummary = {
  total_jobs: number;
  high_readiness_jobs: number;
  ready_to_apply: number;
  outreach_drafts: number;
  followups_due: number;
  applications_by_status: Record<string, number>;
  role_categories: Record<string, number>;
};

export type TodayAction = {
  priority: string;
  action_type: string;
  company?: string | null;
  title?: string | null;
  action: string;
  due_date?: string | null;
};

export type Job = {
  id: number;
  company: string;
  title: string;
  location?: string | null;
  job_url?: string | null;
  source?: string | null;
  jd_text?: string | null;
  role_category?: string | null;
  visa_signal?: string | null;
  apply_readiness?: number | null;
  match_score?: number | null;
  decision?: string | null;
  recommended_resume?: string | null;
  top_projects: string[];
  risk_flags: string[];
  referral_search_query?: string | null;
  status: string;
  next_action?: string | null;
  follow_up_date?: string | null;
};

export type Contact = {
  id: number;
  name: string;
  company?: string | null;
  title?: string | null;
  status: string;
  next_action?: string | null;
};

export type OutreachMessage = {
  id: number;
  message_type: string;
  draft_text: string;
  status: string;
};

export type AgentAnalysis = {
  role_category: string;
  visa_signal: string;
  risk_flags: string[];
  role_fit: number;
  skill_match: number;
  project_relevance: number;
  visa_sponsor: number;
  new_grad_friendliness: number;
  location_fit: number;
  apply_readiness: number;
  match_score: number;
  decision: string;
  recommended_resume: string;
  top_projects: string[];
  referral_search_query: string;
  next_action: string;
  rationale: string[];
  source: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, cache: "no-store" });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      message = body.detail ?? message;
    } catch {
      // Keep status text when backend returns no JSON.
    }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  register: (payload: { email: string; password: string; name?: string }) =>
    request<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  summary: (token: string) => request<DashboardSummary>("/dashboard/summary", {}, token),
  todayActions: (token: string) => request<TodayAction[]>("/dashboard/today-actions", {}, token),
  jobs: (token: string) => request<Job[]>("/jobs", {}, token),
  createJob: (
    token: string,
    payload: {
      company: string;
      title: string;
      location?: string;
      job_url?: string;
      source?: string;
      jd_text?: string;
      notes?: string;
    }
  ) => request<Job>("/jobs", { method: "POST", body: JSON.stringify(payload) }, token),
  analyzeJob: (token: string, jobId: number) =>
    request<AgentAnalysis>(`/jobs/${jobId}/analyze`, { method: "POST" }, token),
  contacts: (token: string) => request<Contact[]>("/contacts", {}, token),
  createContact: (
    token: string,
    payload: { name: string; company?: string; title?: string; relationship?: string; source?: string }
  ) => request<Contact>("/contacts", { method: "POST", body: JSON.stringify(payload) }, token),
  messages: (token: string) => request<OutreachMessage[]>("/outreach/messages", {}, token),
  generateMessage: (
    token: string,
    payload: { job_id?: number; contact_id?: number; message_type: string; context?: string }
  ) =>
    request<OutreachMessage>(
      "/outreach/generate",
      { method: "POST", body: JSON.stringify(payload) },
      token
    )
};
