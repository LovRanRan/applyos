const API_BASE = "/api/backend";

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type DashboardSummary = {
  total_jobs: number;
  high_readiness_jobs: number;
  ready_to_apply: number;
  applied_jobs: number;
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

export type ResumeAsset = {
  id: number;
  name: string;
  source: string;
  content: string;
};

export type Profile = {
  id: number;
  user_id: number;
  target_roles: string[];
  visa_status?: string | null;
  graduation_date?: string | null;
  preferred_locations: string[];
  resume_versions: string[];
  core_projects: string[];
  skills: string[];
  notes?: string | null;
};

export type ProfilePayload = Omit<Profile, "id" | "user_id">;

export type DailyJobSuggestion = {
  id: string;
  company: string;
  title: string;
  location: string;
  job_url: string;
  jd_text: string;
  reason: string;
  suggested_resume: string;
  score_hint: string;
  match_score: number;
  matched_terms: string[];
  missing_terms: string[];
  referral_query: string;
  already_added: boolean;
};

export type TechStackCount = {
  term: string;
  job_count: number;
  mention_count: number;
};

export type TechStackAnalytics = {
  total_jobs: number;
  terms: TechStackCount[];
  top_terms: string[];
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

export type AgentBriefItem = {
  title: string;
  detail: string;
  severity: string;
};

export type AgentBrief = {
  headline: string;
  priorities: AgentBriefItem[];
  observations: string[];
  recommended_actions: string[];
  activity: string[];
};

export type AgentAskResponse = {
  answer: string;
  next_actions: string[];
  referenced_jobs: string[];
  activity: string[];
};

export type ResumeGap = {
  job_id: number;
  resume_version: string;
  covered_terms: string[];
  missing_terms: string[];
  suggested_edits: string[];
  project_emphasis: string[];
  activity: string[];
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
  updateJob: (
    token: string,
    jobId: number,
    payload: {
      status?: string;
      next_action?: string;
      follow_up_date?: string;
      notes?: string;
    }
  ) => request<Job>(`/jobs/${jobId}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  analyzeJob: (token: string, jobId: number) =>
    request<AgentAnalysis>(`/jobs/${jobId}/analyze`, { method: "POST" }, token),
  contacts: (token: string) => request<Contact[]>("/contacts", {}, token),
  createContact: (
    token: string,
    payload: { name: string; company?: string; title?: string; relationship?: string; source?: string }
  ) => request<Contact>("/contacts", { method: "POST", body: JSON.stringify(payload) }, token),
  messages: (token: string) => request<OutreachMessage[]>("/outreach/messages", {}, token),
  profile: (token: string) => request<Profile>("/profile", {}, token),
  saveProfile: (token: string, payload: ProfilePayload) =>
    request<Profile>("/profile", { method: "PUT", body: JSON.stringify(payload) }, token),
  resumes: (token: string) => request<ResumeAsset[]>("/resumes", {}, token),
  uploadResume: (token: string, payload: { name: string; content: string; source?: string }) =>
    request<ResumeAsset>("/resumes", { method: "POST", body: JSON.stringify(payload) }, token),
  dailySuggestions: (token: string, refresh = 0) =>
    request<DailyJobSuggestion[]>(`/daily/suggestions?refresh=${refresh}`, {}, token),
  addSuggestion: (token: string, suggestionId: string) =>
    request<Job>(`/daily/suggestions/${suggestionId}/add`, { method: "POST" }, token),
  techStackAnalytics: (token: string) =>
    request<TechStackAnalytics>("/analytics/tech-stack", {}, token),
  agentBrief: (token: string) => request<AgentBrief>("/agent/brief", {}, token),
  askAgent: (token: string, payload: { question: string; selected_job_id?: number }) =>
    request<AgentAskResponse>("/agent/ask", { method: "POST", body: JSON.stringify(payload) }, token),
  resumeGap: (token: string, jobId: number) =>
    request<ResumeGap>(`/agent/resume-gap/${jobId}`, {}, token),
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
