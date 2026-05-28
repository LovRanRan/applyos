"use client";

import {
  ClipboardCheck,
  FileSearch,
  LogOut,
  MessageSquareText,
  PlusCircle,
  RefreshCw,
  Send,
  Upload,
  UserPlus
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AgentAnalysis,
  api,
  Contact,
  DailyJobSuggestion,
  DashboardSummary,
  Job,
  OutreachMessage,
  ResumeAsset,
  TodayAction
} from "@/lib/api";

const demoJD =
  "Build LLM agent workflows with tool calling, retrieval, evals, Python APIs, and backend systems. Early career candidates welcome.";

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
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<AgentAnalysis | null>(null);
  const [status, setStatus] = useState("Backend: not connected yet");
  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? jobs[0],
    [jobs, selectedJobId]
  );

  async function refresh(nextToken = token) {
    if (!nextToken) return;
    const [
      nextSummary,
      nextActions,
      nextJobs,
      nextContacts,
      nextMessages,
      nextResumes,
      nextSuggestions
    ] = await Promise.all([
      api.summary(nextToken),
      api.todayActions(nextToken),
      api.jobs(nextToken),
      api.contacts(nextToken),
      api.messages(nextToken),
      api.resumes(nextToken),
      api.dailySuggestions(nextToken)
    ]);
    setSummary(nextSummary);
    setActions(nextActions);
    setJobs(nextJobs);
    setContacts(nextContacts);
    setMessages(nextMessages);
    setResumes(nextResumes);
    setSuggestions(nextSuggestions);
    if (!selectedJobId && nextJobs[0]) setSelectedJobId(nextJobs[0].id);
    if (!selectedContactId && nextContacts[0]) setSelectedContactId(nextContacts[0].id);
  }

  useEffect(() => {
    const stored = window.localStorage.getItem("applyos_token");
    if (stored) {
      setToken(stored);
      refresh(stored).catch((error: unknown) => {
        setStatus(error instanceof Error ? error.message : "Failed to restore session");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function authenticate(mode: "login" | "register") {
    try {
      setStatus(mode === "login" ? "Logging in..." : "Creating account...");
      const response =
        mode === "login"
          ? await api.login({ email, password })
          : await api.register({ email, password, name: "Haichuan Zhou" });
      window.localStorage.setItem("applyos_token", response.access_token);
      setToken(response.access_token);
      setStatus("Connected. Add a JD and run the decision agent.");
      await refresh(response.access_token);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Authentication failed");
    }
  }

  async function addJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      setStatus("Saving job...");
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
      setStatus("Job saved. Run analysis to create the decision package.");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to add job");
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
      setStatus("Upload a .txt/.md resume or paste at least 20 characters.");
      return;
    }

    try {
      setStatus("Saving resume asset...");
      await api.uploadResume(token, {
        name: file instanceof File && file.name ? file.name : "Pasted resume profile",
        content,
        source: fileText ? "file upload" : "manual paste"
      });
      formElement.reset();
      setStatus("Resume asset saved. It is available for future matching upgrades.");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save resume");
    }
  }

  async function addSuggestedJob(suggestion: DailyJobSuggestion) {
    if (!token) return;
    try {
      setStatus(`Adding ${suggestion.company} suggestion...`);
      const job = await api.addSuggestion(token, suggestion.id);
      setSelectedJobId(job.id);
      setStatus("Suggested role added to tracker. Run analysis when ready.");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to add suggestion");
    }
  }

  async function analyzeSelectedJob() {
    if (!token || !selectedJob) return;
    try {
      setStatus(`Analyzing ${selectedJob.company}...`);
      const analysis = await api.analyzeJob(token, selectedJob.id);
      setLastAnalysis(analysis);
      setStatus("Decision package generated. Review before any external action.");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Analysis failed");
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
      setStatus("Contact saved. Generate a draft only after manual review.");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to add contact");
    }
  }

  async function generateDraft() {
    if (!token) return;
    try {
      setStatus("Drafting outreach message...");
      await api.generateMessage(token, {
        job_id: selectedJobId ?? undefined,
        contact_id: selectedContactId ?? undefined,
        message_type: "referral request",
        context: "the role appears aligned with AI agent infrastructure and backend systems"
      });
      setStatus("Draft created. Nothing was sent.");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to draft outreach");
    }
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">ApplyOS</p>
          <h1>Application Decision Agent</h1>
          <p className="auth-copy">
            Discover better-fit roles, score readiness, pick the right resume, draft referral
            messages, and keep every next action visible. External submissions stay manual.
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
              <UserPlus size={18} /> Register
            </button>
          </div>
          <p className="status-line">{status}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <div>
          <p className="eyebrow">ApplyOS</p>
          <h1>Daily Job Decisions</h1>
        </div>
        <div className="button-row compact">
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

      <section className="metrics">
        <Metric label="Total jobs" value={summary?.total_jobs ?? 0} />
        <Metric label="High readiness" value={summary?.high_readiness_jobs ?? 0} />
        <Metric label="Ready to apply" value={summary?.ready_to_apply ?? 0} />
        <Metric label="Follow-ups due" value={summary?.followups_due ?? 0} />
        <Metric label="Outreach drafts" value={summary?.outreach_drafts ?? 0} />
      </section>

      <section className="split-grid">
        <section className="panel">
          <div className="panel-title">
            <Upload size={18} />
            <h2>Resume Upload</h2>
          </div>
          <form className="stack" onSubmit={uploadResume}>
            <label>
              Upload .txt / .md resume
              <input accept=".txt,.md,.markdown" name="resume_file" type="file" />
            </label>
            <label>
              Or paste resume bullets
              <textarea
                name="resume_text"
                placeholder="Paste your AI Agent / Backend resume bullets here..."
                rows={4}
              />
            </label>
            <button type="submit">
              <Upload size={17} /> Save Resume
            </button>
          </form>
          <p className="muted">{resumes.length} resume asset(s) saved.</p>
        </section>

        <section className="panel">
          <div className="panel-title">
            <PlusCircle size={18} />
            <h2>Daily Role Push</h2>
          </div>
          <div className="suggestion-list">
            {suggestions.map((suggestion) => (
              <article className="suggestion-card" key={suggestion.id}>
                <div>
                  <strong>
                    {suggestion.company} · {suggestion.title}
                  </strong>
                  <p>{suggestion.reason}</p>
                  <span>{suggestion.score_hint}</span>
                </div>
                <button onClick={() => addSuggestedJob(suggestion)} type="button">
                  <PlusCircle size={16} /> Add
                </button>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="main-grid">
        <form className="panel job-form" onSubmit={addJob}>
          <div className="panel-title">
            <FileSearch size={18} />
            <h2>Job Intake</h2>
          </div>
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
              <ClipboardCheck size={17} /> Save Job
            </button>
            <button className="secondary" onClick={analyzeSelectedJob} type="button">
              <FileSearch size={17} /> Analyze Selected
            </button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-title">
            <ClipboardCheck size={18} />
            <h2>Decision Package</h2>
          </div>
          {lastAnalysis ? (
            <DecisionPackage analysis={lastAnalysis} />
          ) : selectedJob ? (
            <JobSnapshot job={selectedJob} />
          ) : (
            <p className="muted">Add a job, then run analysis.</p>
          )}
        </section>
      </section>

      <section className="split-grid">
        <section className="panel">
          <div className="panel-title">
            <ClipboardCheck size={18} />
            <h2>Today&apos;s Actions</h2>
          </div>
          <div className="action-list">
            {actions.map((action, index) => (
              <article className="action-row" key={`${action.action}-${index}`}>
                <strong>{action.priority}</strong>
                <div>
                  <span>{action.action_type}</span>
                  <p>{action.action}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <UserPlus size={18} />
            <h2>Referral Contact</h2>
          </div>
          <form className="stack" onSubmit={addContact}>
            <input name="name" placeholder="Name" required />
            <input name="company" placeholder="Company" />
            <input name="title" placeholder="Title / team" />
            <input name="relationship" placeholder="USC alumni / engineer / recruiter" />
            <button type="submit">
              <UserPlus size={17} /> Save Contact
            </button>
          </form>
          <button className="secondary full" onClick={generateDraft} type="button">
            <MessageSquareText size={17} /> Generate Draft
          </button>
        </section>
      </section>

      <section className="panel">
        <div className="panel-title">
          <Send size={18} />
          <h2>Jobs, Contacts, Drafts</h2>
        </div>
        <div className="tables">
          <DataTable
            headers={["Company", "Role", "Readiness", "Decision", "Resume"]}
            rows={jobs.map((job) => [
              job.company,
              job.title,
              job.apply_readiness ? `${job.apply_readiness}/100` : "-",
              job.decision ?? job.status,
              job.recommended_resume ?? "-"
            ])}
          />
          <DataTable
            headers={["Contact", "Company", "Title", "Status"]}
            rows={contacts.map((contact) => [
              contact.name,
              contact.company ?? "-",
              contact.title ?? "-",
              contact.status
            ])}
          />
          <DataTable
            headers={["Type", "Status", "Draft"]}
            rows={messages.map((message) => [
              message.message_type,
              message.status,
              message.draft_text
            ])}
          />
        </div>
      </section>
      <p className="status-line">{status}</p>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DecisionPackage({ analysis }: { analysis: AgentAnalysis }) {
  return (
    <div className="decision">
      <div className="score">
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
    </div>
  );
}

function JobSnapshot({ job }: { job: Job }) {
  return (
    <div className="decision">
      <div className="score">
        <span>Selected job</span>
        <strong>{job.apply_readiness ? `${job.apply_readiness}/100` : "Unscored"}</strong>
      </div>
      <dl>
        <dt>Company</dt>
        <dd>{job.company}</dd>
        <dt>Role</dt>
        <dd>{job.title}</dd>
        <dt>Status</dt>
        <dd>{job.status}</dd>
        <dt>Next Action</dt>
        <dd>{job.next_action ?? "Run analysis to generate next action."}</dd>
      </dl>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length}>No records yet</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
