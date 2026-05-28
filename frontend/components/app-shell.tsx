"use client";

import {
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileSearch,
  Inbox,
  Link2,
  LogOut,
  MessageSquareText,
  PlusCircle,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Upload,
  UserRoundCog,
  UsersRound
} from "lucide-react";
import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import {
  AgentAnalysis,
  api,
  ApiError,
  Contact,
  DailyJobSuggestion,
  DashboardSummary,
  Job,
  OutreachMessage,
  Profile,
  ProfilePayload,
  ResumeAsset,
  TechStackAnalytics,
  TodayAction
} from "@/lib/api";

const demoJD =
  "Build LLM agent workflows with tool calling, retrieval, evals, Python APIs, and backend systems. Early career candidates welcome.";

const defaultProfile: ProfilePayload = {
  target_roles: ["AI Agent Engineer", "Backend SDE", "Applied AI Engineer"],
  visa_status: "F-1 student; needs OPT/STEM OPT/H-1B-friendly employers",
  graduation_date: "Dec 2026",
  preferred_locations: ["United States", "Remote", "San Francisco", "New York"],
  resume_versions: ["AI Agent Engineer resume", "Backend SDE resume", "Data / ML / RAG resume"],
  core_projects: ["Wayfinder", "MCP Codebase Intelligence Toolkit", "Agent-Eval-Harness"],
  skills: ["Python", "FastAPI", "TypeScript", "RAG", "LLM Agents", "MCP", "AWS", "SQL"],
  notes: "Prioritize roles where agent judgment, backend reliability, and referral strategy matter."
};

type NoticeTone = "neutral" | "success" | "warning";

function formatList(values: string[]) {
  return values.join("\n");
}

function parseList(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreClass(score?: number | null) {
  if (!score) return "score-neutral";
  if (score >= 86) return "score-high";
  if (score >= 75) return "score-good";
  return "score-watch";
}

export function ApplyOSApp() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("haichuan@example.com");
  const [password, setPassword] = useState("password123");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [actions, setActions] = useState<TodayAction[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [resumes, setResumes] = useState<ResumeAsset[]>([]);
  const [suggestions, setSuggestions] = useState<DailyJobSuggestion[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfilePayload>(defaultProfile);
  const [analytics, setAnalytics] = useState<TechStackAnalytics | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<AgentAnalysis | null>(null);
  const [notice, setNotice] = useState({
    tone: "neutral" as NoticeTone,
    text: "Backend: not connected yet"
  });
  const [addingSuggestionId, setAddingSuggestionId] = useState<string | null>(null);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0],
    [jobs, selectedJobId]
  );

  const profileCompleteness = useMemo(() => {
    const fields = [
      profileForm.target_roles.length > 0,
      profileForm.skills.length > 0,
      profileForm.core_projects.length > 0,
      profileForm.resume_versions.length > 0,
      Boolean(profileForm.visa_status),
      Boolean(profileForm.graduation_date),
      resumes.length > 0
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profileForm, resumes.length]);

  function pushNotice(text: string, tone: NoticeTone = "neutral") {
    setNotice({ text, tone });
  }

  async function refresh(nextToken = token) {
    if (!nextToken) return;
    const profileRequest = api.profile(nextToken).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    });
    const [
      nextSummary,
      nextActions,
      nextJobs,
      nextContacts,
      nextMessages,
      nextResumes,
      nextSuggestions,
      nextAnalytics,
      nextProfile
    ] = await Promise.all([
      api.summary(nextToken),
      api.todayActions(nextToken),
      api.jobs(nextToken),
      api.contacts(nextToken),
      api.messages(nextToken),
      api.resumes(nextToken),
      api.dailySuggestions(nextToken),
      api.techStackAnalytics(nextToken),
      profileRequest
    ]);
    setSummary(nextSummary);
    setActions(nextActions);
    setJobs(nextJobs);
    setContacts(nextContacts);
    setMessages(nextMessages);
    setResumes(nextResumes);
    setSuggestions(nextSuggestions);
    setAnalytics(nextAnalytics);
    if (nextProfile) {
      setProfile(nextProfile);
      setProfileForm({
        target_roles: nextProfile.target_roles,
        visa_status: nextProfile.visa_status,
        graduation_date: nextProfile.graduation_date,
        preferred_locations: nextProfile.preferred_locations,
        resume_versions: nextProfile.resume_versions,
        core_projects: nextProfile.core_projects,
        skills: nextProfile.skills,
        notes: nextProfile.notes
      });
    }
    if (!selectedJobId && nextJobs[0]) setSelectedJobId(nextJobs[0].id);
    if (!selectedContactId && nextContacts[0]) setSelectedContactId(nextContacts[0].id);
  }

  useEffect(() => {
    const stored = window.localStorage.getItem("applyos_token");
    if (stored) {
      setToken(stored);
      refresh(stored).catch((error: unknown) => {
        pushNotice(error instanceof Error ? error.message : "Failed to restore session", "warning");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function authenticate(mode: "login" | "register") {
    try {
      pushNotice(mode === "login" ? "Logging in..." : "Creating account...");
      const response =
        mode === "login"
          ? await api.login({ email, password })
          : await api.register({ email, password, name: "Haichuan Zhou" });
      window.localStorage.setItem("applyos_token", response.access_token);
      setToken(response.access_token);
      pushNotice("Connected. Profile, resume, and daily matches are ready.", "success");
      await refresh(response.access_token);
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Authentication failed", "warning");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const payload: ProfilePayload = {
      target_roles: parseList(form.get("target_roles")),
      skills: parseList(form.get("skills")),
      core_projects: parseList(form.get("core_projects")),
      resume_versions: parseList(form.get("resume_versions")),
      preferred_locations: parseList(form.get("preferred_locations")),
      visa_status: String(form.get("visa_status") || ""),
      graduation_date: String(form.get("graduation_date") || ""),
      notes: String(form.get("notes") || "")
    };
    try {
      pushNotice("Saving profile and recalculating daily matches...");
      const saved = await api.saveProfile(token, payload);
      setProfile(saved);
      setProfileForm(payload);
      await refresh();
      pushNotice("Profile saved. Daily matches now use this profile.", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Failed to save profile", "warning");
    }
  }

  async function uploadResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("resume_file");
    const pastedText = String(form.get("resume_text") || "").trim();
    const fileText = file instanceof File && file.size > 0 ? await file.text() : "";
    const content = (fileText || pastedText).trim();

    if (content.length < 20) {
      pushNotice("Upload a .txt/.md resume or paste at least 20 characters.", "warning");
      return;
    }

    try {
      pushNotice("Saving resume and refreshing match scores...");
      await api.uploadResume(token, {
        name: file instanceof File && file.name ? file.name : "Pasted resume profile",
        content,
        source: fileText ? "file upload" : "manual paste"
      });
      formElement.reset();
      await refresh();
      pushNotice("Resume saved. Daily matches now include resume evidence.", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Failed to save resume", "warning");
    }
  }

  async function addSuggestedJob(suggestion: DailyJobSuggestion) {
    if (!token) return;
    try {
      setAddingSuggestionId(suggestion.id);
      pushNotice(`Adding ${suggestion.company} to the tracker...`);
      const job = await api.addSuggestion(token, suggestion.id);
      setSelectedJobId(job.id);
      setLastAnalysis(null);
      await refresh();
      pushNotice(
        `${suggestion.company} added. Stats, tracker, and tech stack chart refreshed.`,
        "success"
      );
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Failed to add suggestion", "warning");
    } finally {
      setAddingSuggestionId(null);
    }
  }

  async function addJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      pushNotice("Saving job and refreshing dashboard...");
      const job = await api.createJob(token, {
        company: String(form.get("company") || ""),
        title: String(form.get("title") || ""),
        location: String(form.get("location") || ""),
        job_url: String(form.get("job_url") || ""),
        source: "manual",
        jd_text: String(form.get("jd_text") || "")
      });
      setSelectedJobId(job.id);
      formElement.reset();
      await refresh();
      pushNotice("Job saved. Run analysis when you are ready.", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Failed to add job", "warning");
    }
  }

  async function analyzeSelectedJob() {
    if (!token || !selectedJob) return;
    try {
      pushNotice(`Analyzing ${selectedJob.company}...`);
      const analysis = await api.analyzeJob(token, selectedJob.id);
      setLastAnalysis(analysis);
      await refresh();
      pushNotice("Decision package generated. Review before any external action.", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Analysis failed", "warning");
    }
  }

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const contact = await api.createContact(token, {
        name: String(form.get("name") || ""),
        company: String(form.get("company") || ""),
        title: String(form.get("title") || ""),
        relationship: String(form.get("relationship") || "alumni"),
        source: "manual"
      });
      setSelectedContactId(contact.id);
      formElement.reset();
      await refresh();
      pushNotice("Contact saved. Draft generation is available.", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Failed to add contact", "warning");
    }
  }

  async function generateDraft() {
    if (!token) return;
    try {
      pushNotice("Drafting outreach message...");
      await api.generateMessage(token, {
        job_id: selectedJobId ?? undefined,
        contact_id: selectedContactId ?? undefined,
        message_type: "referral request",
        context: "the role appears aligned with AI agent infrastructure and backend systems"
      });
      await refresh();
      pushNotice("Draft created. Nothing was sent externally.", "success");
    } catch (error) {
      pushNotice(error instanceof Error ? error.message : "Failed to draft outreach", "warning");
    }
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">ApplyOS V2</p>
          <h1>Application Decision Agent</h1>
          <p className="auth-copy">
            Resume-aware role matching, referral planning, outreach drafts, and job analytics.
            Applications still stay manual.
          </p>
          <div className="auth-grid">
            <label>
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>
          <div className="button-row">
            <button onClick={() => authenticate("login")} type="button">
              <ClipboardCheck size={18} /> Login
            </button>
            <button className="secondary" onClick={() => authenticate("register")} type="button">
              <UsersRound size={18} /> Register
            </button>
          </div>
          <Notice notice={notice} />
        </section>
      </main>
    );
  }

  return (
    <main className="workspace">
      <header className="app-header">
        <div>
          <p className="eyebrow">ApplyOS V2</p>
          <h1>Job Search Command Center</h1>
          <p>
            Discover roles, explain fit, pick resume versions, prep referrals, and track evidence
            without automating risky submissions.
          </p>
        </div>
        <div className="header-actions">
          <button onClick={() => refresh()} type="button">
            <RefreshCw size={17} /> Refresh
          </button>
          <button
            className="secondary"
            onClick={() => {
              window.localStorage.removeItem("applyos_token");
              setToken(null);
            }}
            type="button"
          >
            <LogOut size={17} /> Logout
          </button>
        </div>
      </header>

      <Notice notice={notice} />

      <section className="metrics">
        <Metric label="Total jobs" value={summary?.total_jobs ?? 0} icon={<BriefcaseBusiness />} />
        <Metric
          label="High readiness"
          value={summary?.high_readiness_jobs ?? 0}
          icon={<Sparkles />}
        />
        <Metric
          label="Ready to apply"
          value={summary?.ready_to_apply ?? 0}
          icon={<CheckCircle2 />}
        />
        <Metric label="Follow-ups due" value={summary?.followups_due ?? 0} icon={<Inbox />} />
        <Metric label="Profile ready" value={`${profileCompleteness}%`} icon={<UserRoundCog />} />
      </section>

      <section className="command-layout">
        <div className="primary-column">
          <section className="panel">
            <SectionTitle
              icon={<Sparkles size={18} />}
              kicker="Daily role push"
              title="Resume-aware matches"
              action={`${suggestions.length} roles`}
            />
            <div className="match-list">
              {suggestions.map((suggestion) => (
                <DailyMatchCard
                  adding={addingSuggestionId === suggestion.id}
                  key={suggestion.id}
                  onAdd={() => addSuggestedJob(suggestion)}
                  suggestion={suggestion}
                />
              ))}
            </div>
          </section>

          <section className="panel workbench-panel">
            <SectionTitle
              icon={<FileSearch size={18} />}
              kicker="Manual intake"
              title="JD decision workbench"
              action={selectedJob ? `${selectedJob.company} selected` : "No job selected"}
            />
            <div className="workbench-grid">
              <form className="job-form" onSubmit={addJob}>
                <div className="form-grid">
                  <label>
                    Company
                    <input name="company" placeholder="Anthropic" required />
                  </label>
                  <label>
                    Role
                    <input name="title" placeholder="Applied AI Engineer" required />
                  </label>
                  <label>
                    Location
                    <input name="location" placeholder="San Francisco / Remote" />
                  </label>
                  <label>
                    Job URL
                    <input name="job_url" placeholder="https://..." />
                  </label>
                </div>
                <label>
                  JD Text
                  <textarea name="jd_text" defaultValue={demoJD} rows={8} />
                </label>
                <div className="button-row">
                  <button type="submit">
                    <Save size={17} /> Save Job
                  </button>
                  <button className="secondary" onClick={analyzeSelectedJob} type="button">
                    <FileSearch size={17} /> Analyze Selected
                  </button>
                </div>
              </form>
              <DecisionPanel analysis={lastAnalysis} selectedJob={selectedJob} />
            </div>
          </section>

          <section className="panel">
            <SectionTitle
              icon={<BriefcaseBusiness size={18} />}
              kicker="Tracker"
              title="Jobs and outreach records"
              action={`${jobs.length} jobs`}
            />
            <div className="tracker-grid">
              <JobList jobs={jobs} onSelect={setSelectedJobId} selectedJobId={selectedJobId} />
              <ContactAndDrafts contacts={contacts} messages={messages} />
            </div>
          </section>
        </div>

        <aside className="side-column">
          <ProfilePanel profile={profile} profileForm={profileForm} onSubmit={saveProfile} />
          <ResumePanel onSubmit={uploadResume} resumes={resumes} />
          <TechStackPanel analytics={analytics} />
          <ActionsPanel actions={actions} />
          <ReferralPanel
            generateDraft={generateDraft}
            onSubmit={addContact}
            selectedContactId={selectedContactId}
          />
        </aside>
      </section>
    </main>
  );
}

function Notice({ notice }: { notice: { tone: NoticeTone; text: string } }) {
  return <p className={`notice ${notice.tone}`}>{notice.text}</p>;
}

function Metric({
  label,
  value,
  icon
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
}) {
  return (
    <article className="metric">
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SectionTitle({
  icon,
  kicker,
  title,
  action
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  action?: string;
}) {
  return (
    <div className="section-title">
      <div className="title-icon">{icon}</div>
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>
      {action ? <strong>{action}</strong> : null}
    </div>
  );
}

function DailyMatchCard({
  suggestion,
  adding,
  onAdd
}: {
  suggestion: DailyJobSuggestion;
  adding: boolean;
  onAdd: () => void;
}) {
  return (
    <article className="match-card">
      <div className="match-main">
        <div className="match-heading">
          <div>
            <h3>{suggestion.title}</h3>
            <p>
              {suggestion.company} · {suggestion.location}
            </p>
          </div>
          <div className={`match-score ${scoreClass(suggestion.match_score)}`}>
            {suggestion.match_score}
          </div>
        </div>
        <p className="match-reason">{suggestion.reason}</p>
        <div className="tag-row">
          {suggestion.matched_terms.map((term) => (
            <span className="tag positive" key={term}>
              {term}
            </span>
          ))}
          {suggestion.missing_terms.slice(0, 3).map((term) => (
            <span className="tag watch" key={term}>
              Verify {term}
            </span>
          ))}
        </div>
      </div>
      <div className="match-actions">
        <span>{suggestion.score_hint}</span>
        <strong>{suggestion.suggested_resume}</strong>
        <a href={suggestion.job_url} rel="noreferrer" target="_blank">
          <ExternalLink size={15} /> Open JD
        </a>
        <button disabled={adding || suggestion.already_added} onClick={onAdd} type="button">
          {suggestion.already_added ? (
            <>
              <CheckCircle2 size={16} /> Added
            </>
          ) : adding ? (
            <>
              <RefreshCw size={16} /> Adding
            </>
          ) : (
            <>
              <PlusCircle size={16} /> Add to Tracker
            </>
          )}
        </button>
      </div>
    </article>
  );
}

function ProfilePanel({
  profile,
  profileForm,
  onSubmit
}: {
  profile: Profile | null;
  profileForm: ProfilePayload;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="panel">
      <SectionTitle
        icon={<UserRoundCog size={18} />}
        kicker="Candidate profile"
        title="Recommendation inputs"
        action={profile ? "Saved" : "Default"}
      />
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Target roles
          <textarea
            defaultValue={formatList(profileForm.target_roles)}
            name="target_roles"
            rows={3}
          />
        </label>
        <label>
          Skills
          <textarea defaultValue={formatList(profileForm.skills)} name="skills" rows={4} />
        </label>
        <label>
          Core projects
          <textarea
            defaultValue={formatList(profileForm.core_projects)}
            name="core_projects"
            rows={3}
          />
        </label>
        <div className="form-grid compact">
          <label>
            Visa / sponsor
            <input defaultValue={profileForm.visa_status ?? ""} name="visa_status" />
          </label>
          <label>
            Graduation
            <input defaultValue={profileForm.graduation_date ?? ""} name="graduation_date" />
          </label>
        </div>
        <label>
          Resume versions
          <textarea
            defaultValue={formatList(profileForm.resume_versions)}
            name="resume_versions"
            rows={3}
          />
        </label>
        <label>
          Preferred locations
          <textarea
            defaultValue={formatList(profileForm.preferred_locations)}
            name="preferred_locations"
            rows={2}
          />
        </label>
        <label>
          Notes
          <textarea defaultValue={profileForm.notes ?? ""} name="notes" rows={3} />
        </label>
        <button type="submit">
          <Save size={16} /> Save Profile
        </button>
      </form>
    </section>
  );
}

function ResumePanel({
  resumes,
  onSubmit
}: {
  resumes: ResumeAsset[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="panel">
      <SectionTitle
        icon={<Upload size={18} />}
        kicker="Resume vault"
        title="Evidence for matching"
        action={`${resumes.length} saved`}
      />
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Upload .txt / .md resume
          <input accept=".txt,.md,.markdown" name="resume_file" type="file" />
        </label>
        <label>
          Or paste resume bullets
          <textarea
            name="resume_text"
            placeholder="Paste AI Agent / Backend resume bullets..."
            rows={4}
          />
        </label>
        <button type="submit">
          <Upload size={16} /> Save Resume
        </button>
      </form>
      <div className="mini-list">
        {resumes.slice(0, 3).map((resume) => (
          <article key={resume.id}>
            <strong>{resume.name}</strong>
            <span>{resume.source}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function TechStackPanel({ analytics }: { analytics: TechStackAnalytics | null }) {
  const rows = analytics?.terms.slice(0, 8) ?? [];
  const max = Math.max(1, ...rows.map((row) => row.job_count));
  return (
    <section className="panel">
      <SectionTitle
        icon={<BarChart3 size={18} />}
        kicker="Market signal"
        title="Tech stack frequency"
        action={`${analytics?.total_jobs ?? 0} jobs`}
      />
      <div className="bar-list">
        {rows.length === 0 ? (
          <p className="muted">Add jobs to see repeated technologies.</p>
        ) : (
          rows.map((row) => (
            <article key={row.term}>
              <div>
                <strong>{row.term}</strong>
                <span>{row.job_count} jobs · {row.mention_count} mentions</span>
              </div>
              <div className="bar-track">
                <span style={{ width: `${Math.max(12, (row.job_count / max) * 100)}%` }} />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ActionsPanel({ actions }: { actions: TodayAction[] }) {
  return (
    <section className="panel">
      <SectionTitle
        icon={<ClipboardCheck size={18} />}
        kicker="Execution"
        title="Today's actions"
        action={`${actions.length} open`}
      />
      <div className="action-list">
        {actions.length === 0 ? (
          <p className="muted">No pending actions yet.</p>
        ) : (
          actions.map((action, index) => (
            <article className="action-row" key={`${action.action}-${index}`}>
              <strong>{action.priority}</strong>
              <div>
                <span>{action.action_type}</span>
                <p>{action.action}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ReferralPanel({
  onSubmit,
  generateDraft,
  selectedContactId
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  generateDraft: () => void;
  selectedContactId: number | null;
}) {
  return (
    <section className="panel">
      <SectionTitle
        icon={<UsersRound size={18} />}
        kicker="Referral"
        title="Contact and draft"
        action={selectedContactId ? "Contact selected" : "Manual"}
      />
      <form className="stack" onSubmit={onSubmit}>
        <input name="name" placeholder="Name" required />
        <input name="company" placeholder="Company" />
        <input name="title" placeholder="Title / team" />
        <input name="relationship" placeholder="USC alumni / engineer / recruiter" />
        <button type="submit">
          <UsersRound size={16} /> Save Contact
        </button>
      </form>
      <button className="secondary full" onClick={generateDraft} type="button">
        <MessageSquareText size={16} /> Generate Draft
      </button>
    </section>
  );
}

function DecisionPanel({
  analysis,
  selectedJob
}: {
  analysis: AgentAnalysis | null;
  selectedJob?: Job;
}) {
  if (analysis) {
    return (
      <section className="decision-panel">
        <div className={`readiness ${scoreClass(analysis.apply_readiness)}`}>
          <span>Apply Readiness</span>
          <strong>{analysis.apply_readiness}/100</strong>
        </div>
        <dl>
          <dt>Decision</dt>
          <dd>{analysis.decision}</dd>
          <dt>Resume</dt>
          <dd>{analysis.recommended_resume}</dd>
          <dt>Projects</dt>
          <dd>{analysis.top_projects.join(" -> ")}</dd>
          <dt>Referral Query</dt>
          <dd>{analysis.referral_search_query}</dd>
          <dt>Next Action</dt>
          <dd>{analysis.next_action}</dd>
        </dl>
        <div className="breakdown">
          <span>Role {analysis.role_fit}/25</span>
          <span>Skill {analysis.skill_match}/25</span>
          <span>Project {analysis.project_relevance}/20</span>
          <span>Visa {analysis.visa_sponsor}/15</span>
          <span>New grad {analysis.new_grad_friendliness}/10</span>
          <span>Location {analysis.location_fit}/5</span>
        </div>
      </section>
    );
  }

  if (!selectedJob) {
    return (
      <section className="decision-panel empty">
        <p>Add or select a job, then run analysis.</p>
      </section>
    );
  }

  return (
    <section className="decision-panel">
      <div className={`readiness ${scoreClass(selectedJob.apply_readiness)}`}>
        <span>Selected role</span>
        <strong>{selectedJob.apply_readiness ? `${selectedJob.apply_readiness}/100` : "Unscored"}</strong>
      </div>
      <dl>
        <dt>Company</dt>
        <dd>{selectedJob.company}</dd>
        <dt>Role</dt>
        <dd>{selectedJob.title}</dd>
        <dt>Status</dt>
        <dd>{selectedJob.status}</dd>
        <dt>Resume</dt>
        <dd>{selectedJob.recommended_resume ?? "Run analysis or add from daily matches."}</dd>
        <dt>Next Action</dt>
        <dd>{selectedJob.next_action ?? "Run analysis to generate next action."}</dd>
      </dl>
    </section>
  );
}

function JobList({
  jobs,
  selectedJobId,
  onSelect
}: {
  jobs: Job[];
  selectedJobId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="job-list">
      {jobs.length === 0 ? (
        <p className="muted">No jobs yet.</p>
      ) : (
        jobs.map((job) => (
          <article
            className={`job-row ${selectedJobId === job.id ? "selected" : ""}`}
            key={job.id}
          >
            <button onClick={() => onSelect(job.id)} type="button">
              <span>{job.company}</span>
              <strong>{job.title}</strong>
              <em>{job.apply_readiness ? `${job.apply_readiness}/100` : job.status}</em>
            </button>
            {job.job_url ? (
              <a href={job.job_url} rel="noreferrer" target="_blank">
                <Link2 size={14} /> JD
              </a>
            ) : null}
          </article>
        ))
      )}
    </div>
  );
}

function ContactAndDrafts({
  contacts,
  messages
}: {
  contacts: Contact[];
  messages: OutreachMessage[];
}) {
  return (
    <div className="records-grid">
      <div className="record-block">
        <h3>Contacts</h3>
        {contacts.length === 0 ? (
          <p className="muted">No contacts yet.</p>
        ) : (
          contacts.slice(0, 5).map((contact) => (
            <article key={contact.id}>
              <strong>{contact.name}</strong>
              <span>{contact.company ?? "Unknown company"} · {contact.title ?? contact.status}</span>
            </article>
          ))
        )}
      </div>
      <div className="record-block">
        <h3>Drafts</h3>
        {messages.length === 0 ? (
          <p className="muted">No drafts yet.</p>
        ) : (
          messages.slice(0, 4).map((message) => (
            <article key={message.id}>
              <strong>{message.message_type}</strong>
              <span>{message.draft_text}</span>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
