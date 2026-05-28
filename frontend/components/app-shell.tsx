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
import {
  FormEvent,
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  AgentAnalysis,
  AgentAskResponse,
  AgentBrief,
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
  ResumeGap,
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
type TabId = "agent" | "matches" | "workbench" | "profile" | "analytics" | "outreach";
type ChatMessage = { role: "user" | "agent"; text: string };
type AgentEvent = { id: string; title: string; detail: string; status: "done" | "working" };

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
  const [agentBrief, setAgentBrief] = useState<AgentBrief | null>(null);
  const [resumeGap, setResumeGap] = useState<ResumeGap | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<AgentAnalysis | null>(null);
  const [chatInput, setChatInput] = useState("What should I do next?");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "agent",
      text: "Select a job or add a daily match, then ask me about fit, resume gaps, referral timing, or next actions."
    }
  ]);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [notice, setNotice] = useState({
    tone: "neutral" as NoticeTone,
    text: "Backend: not connected yet"
  });
  const [addingSuggestionId, setAddingSuggestionId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [successAction, setSuccessAction] = useState<string | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("agent");

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

  function logAgent(title: string, detail: string, status: AgentEvent["status"] = "done") {
    setAgentEvents((current) =>
      [{ id: `${Date.now()}-${title}`, title, detail, status }, ...current].slice(0, 10)
    );
  }

  function finishAction(actionId: string) {
    setBusyAction(null);
    setSuccessAction(actionId);
    window.setTimeout(() => {
      setSuccessAction((current) => (current === actionId ? null : current));
    }, 1600);
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
      nextBrief,
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
      api.agentBrief(nextToken),
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
    setAgentBrief(nextBrief);
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
    const actionId = mode;
    try {
      setBusyAction(actionId);
      pushNotice(mode === "login" ? "Logging in..." : "Creating account...");
      const response =
        mode === "login"
          ? await api.login({ email, password })
          : await api.register({ email, password, name: "Haichuan Zhou" });
      window.localStorage.setItem("applyos_token", response.access_token);
      setToken(response.access_token);
      pushNotice("Connected. Profile, resume, and daily matches are ready.", "success");
      await refresh(response.access_token);
      logAgent("Session started", "Loaded profile, resume assets, daily matches, and agent brief.");
      finishAction(actionId);
    } catch (error) {
      setBusyAction(null);
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
      setBusyAction("save-profile");
      pushNotice("Saving profile and recalculating daily matches...");
      const saved = await api.saveProfile(token, payload);
      setProfile(saved);
      setProfileForm(payload);
      setProfileEditing(false);
      await refresh();
      logAgent("Profile locked", "Saved candidate profile and refreshed resume-aware matches.");
      pushNotice("Profile saved. Daily matches now use this profile.", "success");
      finishAction("save-profile");
    } catch (error) {
      setBusyAction(null);
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
      setBusyAction("upload-resume");
      pushNotice("Saving resume and refreshing match scores...");
      await api.uploadResume(token, {
        name: file instanceof File && file.name ? file.name : "Pasted resume profile",
        content,
        source: fileText ? "file upload" : "manual paste"
      });
      formElement.reset();
      await refresh();
      logAgent("Resume evidence updated", "Saved resume text and refreshed daily match scores.");
      pushNotice("Resume saved. Daily matches now include resume evidence.", "success");
      finishAction("upload-resume");
    } catch (error) {
      setBusyAction(null);
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
      setActiveTab("workbench");
      logAgent(
        "Decision package created",
        `${suggestion.company} was added with score ${suggestion.match_score} and a next action.`
      );
      pushNotice(
        `${suggestion.company} added. Decision package, tracker, and tech stack chart refreshed.`,
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
      setBusyAction("save-job");
      pushNotice("Saving job, then generating the decision package...");
      const job = await api.createJob(token, {
        company: String(form.get("company") || ""),
        title: String(form.get("title") || ""),
        location: String(form.get("location") || ""),
        job_url: String(form.get("job_url") || ""),
        source: "manual",
        jd_text: String(form.get("jd_text") || "")
      });
      const analysis = await api.analyzeJob(token, job.id);
      setSelectedJobId(job.id);
      setLastAnalysis(analysis);
      formElement.reset();
      await refresh();
      setActiveTab("workbench");
      logAgent("Manual JD analyzed", `${job.company} was saved and scored automatically.`);
      pushNotice("Job saved and analyzed. Decision package is ready.", "success");
      finishAction("save-job");
    } catch (error) {
      setBusyAction(null);
      pushNotice(error instanceof Error ? error.message : "Failed to add job", "warning");
    }
  }

  async function analyzeSelectedJob() {
    if (!token || !selectedJob) return;
    try {
      setBusyAction("analyze-job");
      pushNotice(`Analyzing ${selectedJob.company}...`);
      const analysis = await api.analyzeJob(token, selectedJob.id);
      setLastAnalysis(analysis);
      await refresh();
      logAgent("Decision package refreshed", `${selectedJob.company} was rescored and updated.`);
      pushNotice("Decision package generated. Review before any external action.", "success");
      finishAction("analyze-job");
    } catch (error) {
      setBusyAction(null);
      pushNotice(error instanceof Error ? error.message : "Analysis failed", "warning");
    }
  }

  async function addContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      setBusyAction("save-contact");
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
      logAgent("Contact saved", `${contact.name} is available for referral drafting.`);
      pushNotice("Contact saved. Draft generation is available.", "success");
      finishAction("save-contact");
    } catch (error) {
      setBusyAction(null);
      pushNotice(error instanceof Error ? error.message : "Failed to add contact", "warning");
    }
  }

  async function generateDraft() {
    if (!token) return;
    try {
      setBusyAction("draft-message");
      pushNotice("Drafting outreach message...");
      await api.generateMessage(token, {
        job_id: selectedJobId ?? undefined,
        contact_id: selectedContactId ?? undefined,
        message_type: "referral request",
        context: "the role appears aligned with AI agent infrastructure and backend systems"
      });
      await refresh();
      logAgent("Outreach drafted", "Generated a referral draft for manual review only.");
      pushNotice("Draft created. Nothing was sent externally.", "success");
      finishAction("draft-message");
    } catch (error) {
      setBusyAction(null);
      pushNotice(error instanceof Error ? error.message : "Failed to draft outreach", "warning");
    }
  }

  async function manualRefresh() {
    if (!token) return;
    try {
      setBusyAction("refresh");
      pushNotice("Refreshing workspace...");
      await refresh();
      logAgent("Workspace refreshed", "Pulled latest jobs, actions, matches, and analytics.");
      pushNotice("Workspace refreshed.", "success");
      finishAction("refresh");
    } catch (error) {
      setBusyAction(null);
      pushNotice(error instanceof Error ? error.message : "Refresh failed", "warning");
    }
  }

  async function askApplyOS(event?: FormEvent<HTMLFormElement>, forcedQuestion?: string) {
    event?.preventDefault();
    if (!token) return;
    const question = (forcedQuestion ?? chatInput).trim();
    if (!question) return;
    try {
      setBusyAction("ask-agent");
      setChatMessages((current) => [...current, { role: "user", text: question }]);
      setChatInput("");
      const response: AgentAskResponse = await api.askAgent(token, {
        question,
        selected_job_id: selectedJob?.id
      });
      setChatMessages((current) => [
        ...current,
        {
          role: "agent",
          text: `${response.answer}\n\nNext: ${response.next_actions.join(" • ")}`
        }
      ]);
      response.activity.forEach((item) => logAgent("Ask ApplyOS", item));
      finishAction("ask-agent");
    } catch (error) {
      setBusyAction(null);
      pushNotice(error instanceof Error ? error.message : "Ask ApplyOS failed", "warning");
    }
  }

  async function runResumeGap() {
    if (!token || !selectedJob) {
      pushNotice("Select or add a job before running Resume Gap.", "warning");
      return;
    }
    try {
      setBusyAction("resume-gap");
      pushNotice(`Checking resume gaps for ${selectedJob.company}...`);
      const gap = await api.resumeGap(token, selectedJob.id);
      setResumeGap(gap);
      gap.activity.forEach((item) => logAgent("Resume Gap", item));
      pushNotice("Resume Gap generated. Review suggestions before editing resume.", "success");
      finishAction("resume-gap");
    } catch (error) {
      setBusyAction(null);
      pushNotice(error instanceof Error ? error.message : "Resume Gap failed", "warning");
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
            <ActionButton
              actionId="login"
              busyAction={busyAction}
              icon={<ClipboardCheck size={18} />}
              loadingLabel="Logging in"
              onClick={() => authenticate("login")}
              successAction={successAction}
              successLabel="Logged in"
              type="button"
            >
              <ClipboardCheck size={18} /> Login
            </ActionButton>
            <ActionButton
              actionId="register"
              busyAction={busyAction}
              className="secondary"
              icon={<UsersRound size={18} />}
              loadingLabel="Creating"
              onClick={() => authenticate("register")}
              successAction={successAction}
              successLabel="Created"
              type="button"
            >
              <UsersRound size={18} /> Register
            </ActionButton>
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
          <ActionButton
            actionId="refresh"
            busyAction={busyAction}
            icon={<RefreshCw size={17} />}
            loadingLabel="Refreshing"
            onClick={manualRefresh}
            successAction={successAction}
            successLabel="Refreshed"
            type="button"
          >
            <RefreshCw size={17} /> Refresh
          </ActionButton>
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

      <nav aria-label="ApplyOS workspace sections" className="workspace-tabs">
        <TabButton
          active={activeTab === "agent"}
          icon={<Sparkles size={16} />}
          label="Agent Brief"
          onClick={() => setActiveTab("agent")}
        />
        <TabButton
          active={activeTab === "matches"}
          icon={<Sparkles size={16} />}
          label="Daily Matches"
          onClick={() => setActiveTab("matches")}
        />
        <TabButton
          active={activeTab === "workbench"}
          icon={<FileSearch size={16} />}
          label="JD Workbench"
          onClick={() => setActiveTab("workbench")}
        />
        <TabButton
          active={activeTab === "profile"}
          icon={<UserRoundCog size={16} />}
          label="Profile & Resume"
          onClick={() => setActiveTab("profile")}
        />
        <TabButton
          active={activeTab === "analytics"}
          icon={<BarChart3 size={16} />}
          label="Analytics"
          onClick={() => setActiveTab("analytics")}
        />
        <TabButton
          active={activeTab === "outreach"}
          icon={<UsersRound size={16} />}
          label="Outreach & Tracker"
          onClick={() => setActiveTab("outreach")}
        />
      </nav>

      <section className="tab-surface">
        {activeTab === "agent" ? (
          <div className="tab-panel-grid">
            <div className="agent-main">
              <AgentBriefPanel brief={agentBrief} />
              <AskApplyOSPanel
                busyAction={busyAction}
                chatInput={chatInput}
                messages={chatMessages}
                onAsk={askApplyOS}
                onQuickAsk={(question) => askApplyOS(undefined, question)}
                selectedJob={selectedJob}
                setChatInput={setChatInput}
                successAction={successAction}
              />
            </div>
            <div className="tab-side">
              <ResumeGapPanel
                busyAction={busyAction}
                gap={resumeGap}
                onRun={runResumeGap}
                selectedJob={selectedJob}
                successAction={successAction}
              />
              <AgentActivityLog brief={agentBrief} events={agentEvents} />
            </div>
          </div>
        ) : null}

        {activeTab === "matches" ? (
          <div className="tab-panel-grid">
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
            <div className="tab-side">
              <ActionsPanel actions={actions} />
              <TechStackPanel analytics={analytics} />
            </div>
          </div>
        ) : null}

        {activeTab === "workbench" ? (
          <div className="tab-panel-grid">
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
                  <ActionButton
                    actionId="save-job"
                    busyAction={busyAction}
                    icon={<Save size={17} />}
                    loadingLabel="Saving + analyzing"
                    successAction={successAction}
                    successLabel="Package ready"
                    type="submit"
                  >
                    <Save size={17} /> Save + Analyze
                  </ActionButton>
                  <ActionButton
                    actionId="analyze-job"
                    busyAction={busyAction}
                    className="secondary"
                    disabled={!selectedJob}
                    icon={<FileSearch size={17} />}
                    loadingLabel="Analyzing"
                    onClick={analyzeSelectedJob}
                    successAction={successAction}
                    successLabel="Updated"
                    type="button"
                  >
                    <FileSearch size={17} /> Analyze Selected
                  </ActionButton>
                </div>
              </form>
              <DecisionPanel analysis={lastAnalysis} selectedJob={selectedJob} />
            </div>
          </section>
            <section className="panel compact-panel">
            <SectionTitle
              icon={<BriefcaseBusiness size={18} />}
              kicker="Selection"
              title="Saved jobs"
              action={`${jobs.length} jobs`}
            />
            <JobList jobs={jobs} onSelect={setSelectedJobId} selectedJobId={selectedJobId} />
          </section>
          </div>
        ) : null}

        {activeTab === "profile" ? (
          <div className="tab-panel-grid even">
            <ProfilePanel
              busyAction={busyAction}
              isEditing={profileEditing || !profile}
              onCancel={() => setProfileEditing(false)}
              onEdit={() => setProfileEditing(true)}
              onSubmit={saveProfile}
              profile={profile}
              profileForm={profileForm}
              successAction={successAction}
            />
            <ResumePanel
              busyAction={busyAction}
              onSubmit={uploadResume}
              resumes={resumes}
              successAction={successAction}
            />
          </div>
        ) : null}

        {activeTab === "analytics" ? (
          <div className="tab-panel-grid even">
            <TechStackPanel analytics={analytics} />
            <ActionsPanel actions={actions} />
          </div>
        ) : null}

        {activeTab === "outreach" ? (
          <div className="tab-panel-grid even">
            <ReferralPanel
              busyAction={busyAction}
              generateDraft={generateDraft}
              onSubmit={addContact}
              selectedContactId={selectedContactId}
              successAction={successAction}
            />
            <section className="panel">
              <SectionTitle
                icon={<Send size={18} />}
                kicker="Tracker"
                title="Jobs, contacts, and drafts"
                action={`${jobs.length} jobs`}
              />
              <div className="tracker-grid">
                <JobList jobs={jobs} onSelect={setSelectedJobId} selectedJobId={selectedJobId} />
                <ContactAndDrafts contacts={contacts} messages={messages} />
              </div>
            </section>
          </div>
        ) : null}
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

function ActionButton({
  actionId,
  busyAction,
  successAction,
  loadingLabel,
  successLabel,
  icon,
  children,
  className,
  disabled,
  ...buttonProps
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  actionId: string;
  busyAction: string | null;
  successAction: string | null;
  loadingLabel: string;
  successLabel: string;
  icon: ReactNode;
}) {
  const isBusy = busyAction === actionId;
  const isSuccess = successAction === actionId;
  return (
    <button
      className={`${className ?? ""} ${isBusy ? "is-busy" : ""} ${isSuccess ? "is-success" : ""}`}
      disabled={disabled || isBusy}
      {...buttonProps}
    >
      {isBusy ? (
        <>
          <RefreshCw className="spin" size={17} /> {loadingLabel}
        </>
      ) : isSuccess ? (
        <>
          <CheckCircle2 size={17} /> {successLabel}
        </>
      ) : (
        <>{typeof children === "string" ? <><span>{icon}</span>{children}</> : children}</>
      )}
    </button>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`tab-button ${active ? "active" : ""}`}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
    </button>
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

function AgentBriefPanel({ brief }: { brief: AgentBrief | null }) {
  return (
    <section className="panel agent-brief-panel">
      <SectionTitle
        icon={<Sparkles size={18} />}
        kicker="Agent brief"
        title="What ApplyOS thinks now"
        action={brief ? "Live" : "Loading"}
      />
      <div className="agent-headline">{brief?.headline ?? "Loading today's brief..."}</div>
      <div className="brief-grid">
        <div>
          <h3>Priorities</h3>
          {(brief?.priorities ?? []).map((item) => (
            <article className={`brief-item ${item.severity}`} key={item.title}>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </article>
          ))}
        </div>
        <div>
          <h3>Recommended actions</h3>
          <ul className="clean-list">
            {(brief?.recommended_actions ?? []).map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="observation-strip">
        {(brief?.observations ?? []).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

function AskApplyOSPanel({
  busyAction,
  chatInput,
  messages,
  onAsk,
  onQuickAsk,
  selectedJob,
  setChatInput,
  successAction
}: {
  busyAction: string | null;
  chatInput: string;
  messages: ChatMessage[];
  onAsk: (event?: FormEvent<HTMLFormElement>, forcedQuestion?: string) => void;
  onQuickAsk: (question: string) => void;
  selectedJob?: Job;
  setChatInput: (value: string) => void;
  successAction: string | null;
}) {
  const quickPrompts = [
    "Is this job worth applying to first?",
    "What resume gaps should I fix?",
    "Should I seek referral before applying?"
  ];
  return (
    <section className="panel ask-panel">
      <SectionTitle
        icon={<MessageSquareText size={18} />}
        kicker="Ask ApplyOS"
        title="Decision copilot"
        action={selectedJob ? selectedJob.company : "No job selected"}
      />
      <div className="chat-log">
        {messages.map((message, index) => (
          <article className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
            <span>{message.role === "agent" ? "ApplyOS" : "You"}</span>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      <div className="quick-prompts">
        {quickPrompts.map((prompt) => (
          <button className="chip-button" key={prompt} onClick={() => onQuickAsk(prompt)} type="button">
            {prompt}
          </button>
        ))}
      </div>
      <form className="ask-form" onSubmit={(event) => onAsk(event)}>
        <input
          onChange={(event) => setChatInput(event.target.value)}
          placeholder="Ask about fit, resume, referral, or next action..."
          value={chatInput}
        />
        <ActionButton
          actionId="ask-agent"
          busyAction={busyAction}
          icon={<MessageSquareText size={16} />}
          loadingLabel="Thinking"
          successAction={successAction}
          successLabel="Answered"
          type="submit"
        >
          <MessageSquareText size={16} /> Ask
        </ActionButton>
      </form>
    </section>
  );
}

function ResumeGapPanel({
  busyAction,
  gap,
  onRun,
  selectedJob,
  successAction
}: {
  busyAction: string | null;
  gap: ResumeGap | null;
  onRun: () => void;
  selectedJob?: Job;
  successAction: string | null;
}) {
  return (
    <section className="panel">
      <SectionTitle
        icon={<FileSearch size={18} />}
        kicker="Resume Gap Agent"
        title="Truthful keyword gaps"
        action={selectedJob ? selectedJob.company : "Select job"}
      />
      {gap ? (
        <div className="gap-content">
          <div className="locked-summary">
            <span>Recommended resume</span>
            <strong>{gap.resume_version}</strong>
          </div>
          <h3>Covered</h3>
          <div className="tag-row">
            {gap.covered_terms.map((term) => (
              <span className="tag positive" key={term}>
                {term}
              </span>
            ))}
          </div>
          <h3>Gaps to verify</h3>
          <div className="tag-row">
            {gap.missing_terms.map((term) => (
              <span className="tag watch" key={term}>
                {term}
              </span>
            ))}
          </div>
          <ul className="clean-list">
            {gap.suggested_edits.map((edit) => (
              <li key={edit}>{edit}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="muted">Select a job and run Resume Gap before editing resume bullets.</p>
      )}
      <ActionButton
        actionId="resume-gap"
        busyAction={busyAction}
        className="full"
        disabled={!selectedJob}
        icon={<FileSearch size={16} />}
        loadingLabel="Checking"
        onClick={onRun}
        successAction={successAction}
        successLabel="Gap ready"
        type="button"
      >
        <FileSearch size={16} /> Run Resume Gap
      </ActionButton>
    </section>
  );
}

function AgentActivityLog({
  brief,
  events
}: {
  brief: AgentBrief | null;
  events: AgentEvent[];
}) {
  const rows = [
    ...events,
    ...(brief?.activity ?? []).map((detail, index) => ({
      id: `brief-${index}`,
      title: "Brief scan",
      detail,
      status: "done" as const
    }))
  ].slice(0, 8);
  return (
    <section className="panel">
      <SectionTitle
        icon={<ClipboardCheck size={18} />}
        kicker="Agent activity"
        title="What changed"
        action={`${rows.length} events`}
      />
      <div className="activity-log">
        {rows.length === 0 ? (
          <p className="muted">Agent actions will appear here.</p>
        ) : (
          rows.map((event) => (
            <article className={event.status} key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.detail}</span>
            </article>
          ))
        )}
      </div>
    </section>
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
        <button
          className={`${adding ? "is-busy" : ""} ${suggestion.already_added ? "is-success" : ""}`}
          disabled={adding || suggestion.already_added}
          onClick={onAdd}
          type="button"
        >
          {suggestion.already_added ? (
            <>
              <CheckCircle2 size={16} /> Added
            </>
          ) : adding ? (
            <>
              <RefreshCw className="spin" size={16} /> Adding
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
  busyAction,
  isEditing,
  onCancel,
  onEdit,
  profile,
  profileForm,
  onSubmit,
  successAction
}: {
  busyAction: string | null;
  isEditing: boolean;
  onCancel: () => void;
  onEdit: () => void;
  profile: Profile | null;
  profileForm: ProfilePayload;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  successAction: string | null;
}) {
  if (profile && !isEditing) {
    return (
      <section className="panel profile-panel">
        <SectionTitle
          icon={<UserRoundCog size={18} />}
          kicker="Candidate profile"
          title="Locked recommendation inputs"
          action="Locked"
        />
        <div className="profile-lock-banner">
          <CheckCircle2 size={18} />
          <div>
            <strong>Profile is saved and locked for matching.</strong>
            <span>Daily matches, resume gaps, and Agent Brief now use this profile.</span>
          </div>
        </div>
        <div className="locked-profile">
          <ReadOnlyBlock label="Target roles" values={profile.target_roles} />
          <ReadOnlyBlock label="Skills" values={profile.skills} />
          <ReadOnlyBlock label="Core projects" values={profile.core_projects} />
          <ReadOnlyBlock label="Resume versions" values={profile.resume_versions} />
          <div className="profile-facts">
            <article>
              <span>Visa / sponsor</span>
              <strong>{profile.visa_status || "Not set"}</strong>
            </article>
            <article>
              <span>Graduation</span>
              <strong>{profile.graduation_date || "Not set"}</strong>
            </article>
            <article>
              <span>Preferred locations</span>
              <strong>{profile.preferred_locations.join(", ") || "Not set"}</strong>
            </article>
          </div>
          {profile.notes ? (
            <div className="profile-note">
              <span>Notes</span>
              <p>{profile.notes}</p>
            </div>
          ) : null}
        </div>
        <button className="secondary" onClick={onEdit} type="button">
          <UserRoundCog size={16} /> Edit Profile
        </button>
      </section>
    );
  }

  return (
    <section className="panel">
      <SectionTitle
        icon={<UserRoundCog size={18} />}
        kicker="Candidate profile"
        title="Recommendation inputs"
        action={profile ? "Editing" : "Default"}
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
        <div className="button-row">
          <ActionButton
            actionId="save-profile"
            busyAction={busyAction}
            icon={<Save size={16} />}
            loadingLabel="Saving profile"
            successAction={successAction}
            successLabel="Profile locked"
            type="submit"
          >
            <Save size={16} /> Save Profile
          </ActionButton>
          {profile ? (
            <button className="secondary" onClick={onCancel} type="button">
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function ReadOnlyBlock({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="readonly-block">
      <span>{label}</span>
      <div className="readonly-tags">
        {values.length === 0 ? (
          <em>Not set</em>
        ) : (
          values.map((value) => <strong key={value}>{value}</strong>)
        )}
      </div>
    </div>
  );
}

function ResumePanel({
  busyAction,
  resumes,
  onSubmit,
  successAction
}: {
  busyAction: string | null;
  resumes: ResumeAsset[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  successAction: string | null;
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
        <ActionButton
          actionId="upload-resume"
          busyAction={busyAction}
          icon={<Upload size={16} />}
          loadingLabel="Saving resume"
          successAction={successAction}
          successLabel="Resume saved"
          type="submit"
        >
          <Upload size={16} /> Save Resume
        </ActionButton>
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
  busyAction,
  onSubmit,
  generateDraft,
  selectedContactId,
  successAction
}: {
  busyAction: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  generateDraft: () => void;
  selectedContactId: number | null;
  successAction: string | null;
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
        <ActionButton
          actionId="save-contact"
          busyAction={busyAction}
          icon={<UsersRound size={16} />}
          loadingLabel="Saving contact"
          successAction={successAction}
          successLabel="Contact saved"
          type="submit"
        >
          <UsersRound size={16} /> Save Contact
        </ActionButton>
      </form>
      <ActionButton
        actionId="draft-message"
        busyAction={busyAction}
        className="secondary full"
        icon={<MessageSquareText size={16} />}
        loadingLabel="Drafting"
        onClick={generateDraft}
        successAction={successAction}
        successLabel="Draft ready"
        type="button"
      >
        <MessageSquareText size={16} /> Generate Draft
      </ActionButton>
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
