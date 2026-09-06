import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import ReactMarkdown from "react-markdown";
import {
  Activity,
  Archive,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudUpload,
  Copy,
  Database,
  Download,
  FileArchive,
  FileBarChart2,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FileType2,
  Folder,
  FolderOpen,
  Gauge,
  Grid2X2,
  HelpCircle,
  History,
  LayoutDashboard,
  Library,
  Loader2,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
  Eye,
  EyeOff,
  Zap,
} from "lucide-react";

import "./style.css";

const API = "http://localhost:8000/api/v1";

type View = "dashboard" | "documents" | "chat" | "search" | "compare" | "analytics";

type DocumentItem = {
  id: number;
  filename: string;
  status?: string;
  mime_type?: string;
  file_size?: number;
  created_at?: string;
  updated_at?: string;
  page_count?: number;
  chunk_count?: number;
};

type Citation = {
  document_id: number;
  page_number?: number | null;
  chunk_id?: number | null;
};
type DocumentDetail = {
  id: number;
  filename: string;
  mime_type?: string | null;
  storage_path: string;
  status: string;
  created_at: string;
  chunk_count: number;
  page_count: number;
};

type DocumentChunk = {
  id: number;
  document_id: number;
  page_number?: number | null;
  chunk_index: number;
  content: string;
  has_embedding: boolean;
  metadata: Record<string, unknown>;
};
async function api(path: string, options: RequestInit = {}) {
  // Support both "remember me" storage modes.
  const token =
    localStorage.getItem("token") ??
    sessionStorage.getItem("token");

  const headers: Record<string, string> = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(API + path, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("DocMind API network error:", error);
    throw new Error(
      `Cannot reach the DocMind backend at ${API}. Make sure the backend is running on port 8000.`
    );
  }

  const responseText = await response.text();

  if (!response.ok) {
    let message = responseText;

    try {
      const payload = JSON.parse(responseText);
      message = payload.detail ?? payload.message ?? responseText;
    } catch {}

    throw new Error(
      message || `Request failed with status ${response.status}.`
    );
  }

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error("The backend returned an invalid JSON response.");
  }
}

function fileIcon(filename: string, size = 18) {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "csv") return <FileSpreadsheet size={size} />;
  if (ext === "docx") return <FileType2 size={size} />;
  if (ext === "txt") return <FileText size={size} />;
  if (ext === "pdf") return <FileText size={size} />;
  if (["png", "jpg", "jpeg"].includes(ext || "")) return <FileArchive size={size} />;
  return <FileCode2 size={size} />;
}

function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(status?: string) {
  const value = String(status || "unknown").toLowerCase();
  if (value === "ready") return "Ready";
  if (value === "processing") return "Processing";
  if (value === "failed") return "Failed";
  return value;
}

/* =========================================================
   AUTH
========================================================= */

function Auth({ onLogin }: { onLogin: () => void }) {
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (register && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await api(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(
          register ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password },
        ),
      });

      if (remember) {
        localStorage.setItem("token", data.access_token);
      } else {
        sessionStorage.setItem("token", data.access_token);
      }

      onLogin();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-grid" aria-hidden="true" />

      <section className="auth-shell">
        <aside className="auth-showcase">
          <div className="auth-brand">
            <div className="logo-mark"><Sparkles size={17} /></div>
            <span>DocMind AI</span>
          </div>

          <div className="showcase-copy">
            <div className="eyebrow-pill">
              <span className="live-dot" />
              AI document intelligence
            </div>
            <h1>Turn documents into decisions.</h1>
            <p>
              Search, understand, compare and extract insights from your documents
              with evidence-backed AI.
            </p>

            <div className="showcase-points">
              <div><CheckCircle2 size={16} /> Evidence-grounded answers</div>
              <div><CheckCircle2 size={16} /> Multi-document research</div>
              <div><CheckCircle2 size={16} /> Structured extraction ready</div>
            </div>
          </div>

          <div className="showcase-footer">
            <ShieldCheck size={15} />
            Your workspace is protected with authenticated access.
          </div>
        </aside>

        <section className="auth-panel">
          <div className="mobile-auth-brand">
            <div className="logo-mark"><Sparkles size={16} /></div>
            <span>DocMind AI</span>
          </div>

          <div className="auth-heading">
            <span className="auth-kicker">{register ? "Create workspace" : "Welcome back"}</span>
            <h2>{register ? "Start your document workspace." : "Continue your research."}</h2>
            <p>
              {register
                ? "Create an account and start building your document intelligence workspace."
                : "Sign in to access your documents, conversations and insights."}
            </p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {register && (
              <label className="field-group">
                <span>Name</span>
                <div className="input-wrap">
                  <User size={16} />
                  <input
                    autoComplete="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </label>
            )}

            <label className="field-group">
              <span>Email</span>
              <div className="input-wrap">
                <Mail size={16} />
                <input
                  autoComplete="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>

            <label className="field-group">
              <div className="field-label-row">
                <span>Password</span>
                {!register && <button type="button" className="link-button" onClick={() => setError("Password reset is not connected yet.")}>Forgot password?</button>}
              </div>
              <div className="input-wrap">
                <ShieldCheck size={16} />
                <input
                  autoComplete={register ? "new-password" : "current-password"}
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="icon-button" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password visibility">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {register && password.length > 0 && (
                <div className="password-meter">
                  <div className="password-bars">
                    {[1, 2, 3, 4].map((item) => (
                      <span key={item} className={item <= passwordScore ? "filled" : ""} />
                    ))}
                  </div>
                  <small>{passwordScore >= 3 ? "Strong password" : "Use 8+ characters, a number and a symbol"}</small>
                </div>
              )}
            </label>

            {!register && (
              <label className="remember-row">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Keep me signed in</span>
              </label>
            )}

            {error && (
              <div className="auth-error" role="alert">
                <X size={15} />
                <span>{error}</span>
              </div>
            )}

            <button className="auth-submit" disabled={loading} type="submit">
              {loading ? <Loader2 className="spin" size={17} /> : register ? <Plus size={17} /> : <ArrowRight size={17} />}
              {loading ? "Signing in…" : register ? "Create account" : "Sign in"}
            </button>
          </form>

          <div className="auth-divider"><span>secure workspace access</span></div>

          <button
            className="auth-switch"
            type="button"
            onClick={() => {
              setRegister((v) => !v);
              setError("");
              setPassword("");
            }}
          >
            {register ? "Already have an account? Sign in" : "New to DocMind AI? Create an account"}
          </button>
        </section>
      </section>
    </main>
  );
}

/* =========================================================
   APP
========================================================= */

function App() {
  const [logged, setLogged] = useState(Boolean(localStorage.getItem("token") || sessionStorage.getItem("token")));
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null);
  const [viewerChunkId, setViewerChunkId] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const result = await api("/documents");
      setDocs(Array.isArray(result) ? result : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load documents");
    }
  }

  useEffect(() => {
    if (logged) refresh();
  }, [logged]);

  const readyDocs = useMemo(
    () => docs.filter((doc) => String(doc.status).toLowerCase() === "ready"),
    [docs],
  );

  const filteredDocs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return docs;
    return docs.filter((doc) => doc.filename.toLowerCase().includes(term));
  }, [docs, searchTerm]);

  const selectedDocs = useMemo(
    () => docs.filter((doc) => selected.includes(doc.id)),
    [docs, selected],
  );

  function navigate(view: View) {
    setActiveView(view);
    setMobileNav(false);
    setError("");
  }

  function toggleDocument(id: number) {
    const doc = docs.find((item) => item.id === id);
    if (!doc) return;

    if (String(doc.status).toLowerCase() !== "ready") {
      setError("This document is still being processed.");
      return;
    }

    setError("");
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function selectAllReady() {
    setSelected(readyDocs.map((doc) => doc.id));
  }

  function clearSelection() {
    setSelected([]);
  }

  function handleFile(fileValue: File | null) {
    if (!fileValue) return;
    const allowed = [".pdf", ".docx", ".txt", ".csv", ".png", ".jpg", ".jpeg"];
    const valid = allowed.some((ext) => fileValue.name.toLowerCase().endsWith(ext));
    if (!valid) {
      setError("Supported formats: PDF, DOCX, TXT, CSV, PNG, JPG and JPEG.");
      return;
    }
    setError("");
    setFile(fileValue);
  }

  async function upload() {
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);

      await api("/documents", {
        method: "POST",
        body: fd,
      });

      setFile(null);
      setShowUpload(false);
      await refresh();
      navigate("documents");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function ask() {
    const trimmed = question.trim();
    if (!trimmed) return;

    if (selected.length === 0) {
      setError("Select at least one ready document first.");
      return;
    }

    const notReady = selectedDocs.some((doc) => String(doc.status).toLowerCase() !== "ready");
    if (notReady) {
      setError("One or more selected documents are still processing.");
      return;
    }

    setLoading(true);
    setError("");
    setLastQuestion(trimmed);
    navigate("chat");

    try {
      const conversation = await api("/conversations", { method: "POST" });

      const result = await api(`/conversations/${conversation.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          question: trimmed,
          document_ids: selected,
        }),
      });

      setAnswer(result.answer || "");
      setCitations(Array.isArray(result.citations) ? result.citations : []);
      setQuestion("");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Question failed";
      console.error("DocMind chat request failed:", e);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function newChat() {
    setAnswer("");
    setQuestion("");
    setLastQuestion("");
    setCitations([]);
    setError("");
    navigate("chat");
  }
  function openCitation(citation: Citation) {
  const doc = docs.find(
    (item) => item.id === citation.document_id
  );

  if (!doc) {
    setError("The cited document is no longer available.");
    return;
  }

  setViewerChunkId(citation.chunk_id ?? null);
  setViewerDoc(doc);
 }
  function logout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setLogged(false);
  }

  if (!logged) {
    return <Auth onLogin={() => setLogged(true)} />;
  }

  const stats = {
    total: docs.length,
    ready: readyDocs.length,
    processing: docs.filter((doc) => String(doc.status).toLowerCase() === "processing").length,
    selected: selected.length,
  };

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div>
          <div className="sidebar-brand">
            <div className="logo-mark"><Sparkles size={16} /></div>
            <div>
              <strong>DocMind AI</strong>
              <span>Document intelligence</span>
            </div>
          </div>

          <button className="new-chat-button" onClick={newChat}>
            <Plus size={16} />
            New research
          </button>

          <nav className="nav-stack">
            <NavItem icon={<LayoutDashboard size={16} />} label="Overview" active={activeView === "dashboard"} onClick={() => navigate("dashboard")} />
            <NavItem icon={<Library size={16} />} label="Documents" active={activeView === "documents"} count={docs.length || undefined} onClick={() => navigate("documents")} />
            <NavItem icon={<MessageSquare size={16} />} label="AI Chat" active={activeView === "chat"} onClick={() => navigate("chat")} />
            <NavItem icon={<Search size={16} />} label="Search" active={activeView === "search"} onClick={() => navigate("search")} />
            <NavItem icon={<Grid2X2 size={16} />} label="Compare" active={activeView === "compare"} onClick={() => navigate("compare")} />
          </nav>

          <div className="sidebar-section-label">Workspace</div>
          <nav className="nav-stack">
            <NavItem icon={<Folder size={16} />} label="Collections" disabled onClick={() => undefined} />
            <NavItem icon={<BookOpen size={16} />} label="Notes & research" disabled onClick={() => undefined} />
            <NavItem icon={<BarChart3 size={16} />} label="Analytics" active={activeView === "analytics"} onClick={() => navigate("analytics")} />
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-mini-card">
            <div className="mini-icon"><Zap size={14} /></div>
            <div>
              <strong>AI pipeline</strong>
              <span>{stats.processing > 0 ? `${stats.processing} processing` : "All systems ready"}</span>
            </div>
          </div>

          <button className="profile-row" onClick={() => setShowProfile((v) => !v)}>
            <div className="profile-avatar">P</div>
            <div className="profile-copy">
              <strong>Workspace</strong>
              <span>Authenticated user</span>
            </div>
            <ChevronDown size={15} />
          </button>

          {showProfile && (
            <div className="profile-menu">
              <button onClick={() => setError("Settings are coming in the workspace phase.")}><Settings size={15} /> Settings</button>
              <button onClick={logout}><LogOut size={15} /> Sign out</button>
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>

          <div className="topbar-context">
            <span className="topbar-kicker">Workspace</span>
            <h1>{viewTitle(activeView)}</h1>
          </div>

          <div className="topbar-actions">
            <div className="global-search">
              <Search size={15} />
              <input
                placeholder="Search documents…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (activeView !== "search") setActiveView("search");
                }}
              />
              <kbd>⌘ K</kbd>
            </div>
            <button className="top-icon-button" title="Help"><HelpCircle size={17} /></button>
            <button className="top-avatar" onClick={() => setShowProfile((v) => !v)}>P</button>
          </div>
        </header>

        {error && (
          <div className="global-error">
            <X size={16} />
            <span>{error}</span>
            <button onClick={() => setError("")}><X size={14} /></button>
          </div>
        )}

        <div className="page-content">
          {activeView === "dashboard" && (
            <Dashboard
              docs={docs}
              stats={stats}
              selectedDocs={selectedDocs}
              onUpload={() => setShowUpload(true)}
              onNavigate={navigate}
              onSelect={toggleDocument}
              onOpen={(doc) => setViewerDoc(doc)}
            />
          )}

          {activeView === "documents" && (
            <DocumentsView
              docs={filteredDocs}
              selected={selected}
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              onUpload={() => setShowUpload(true)}
              onSelect={toggleDocument}
              onSelectAll={selectAllReady}
              onClearSelection={clearSelection}
              onOpen={(doc) => setViewerDoc(doc)}
            />
          )}

          {activeView === "chat" && (
            <ChatView
              selectedDocs={selectedDocs}
              readyCount={readyDocs.length}
              question={question}
              setQuestion={setQuestion}
              answer={answer}
              lastQuestion={lastQuestion}
              loading={loading}
              citations={citations}
              docs={docs}
              onAsk={ask}
              onNavigate={navigate}
              onSelectDocument={toggleDocument}
              onOpenCitation={openCitation}
            />
          )}

          {activeView === "search" && (
            <SearchView
              docs={filteredDocs}
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
              onOpen={(doc) => setViewerDoc(doc)}
              onSelect={toggleDocument}
              selected={selected}
            />
          )}

          {activeView === "compare" && (
            <CompareView docs={readyDocs} selected={selected} onSelect={toggleDocument} />
          )}

          {activeView === "analytics" && <AnalyticsView docs={docs} stats={stats} />}
        </div>
      </main>

      {showUpload && (
        <UploadModal
          file={file}
          dragActive={dragActive}
          uploading={uploading}
          fileInput={fileInput}
          setDragActive={setDragActive}
          onFile={handleFile}
          onClose={() => {
            if (!uploading) {
              setShowUpload(false);
              setFile(null);
            }
          }}
          onUpload={upload}
        />
      )}

      {viewerDoc && (
        <DocumentViewer
          doc={viewerDoc}
          targetChunkId={viewerChunkId}
          onClose={() => {
            setViewerDoc(null);
            setViewerChunkId(null);
          }}
        />
      )}
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  count,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`nav-item ${active ? "active" : ""} ${disabled ? "disabled" : ""}`} onClick={onClick} disabled={disabled}>
      {icon}
      <span>{label}</span>
      {count !== undefined && <small>{count}</small>}
    </button>
  );
}

function viewTitle(view: View) {
  if (view === "documents") return "Document library";
  if (view === "chat") return "AI research";
  if (view === "search") return "Search";
  if (view === "compare") return "Compare documents";
  if (view === "analytics") return "Analytics";
  return "Overview";
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  docs,
  stats,
  selectedDocs,
  onUpload,
  onNavigate,
  onSelect,
  onOpen,
}: {
  docs: DocumentItem[];
  stats: { total: number; ready: number; processing: number; selected: number };
  selectedDocs: DocumentItem[];
  onUpload: () => void;
  onNavigate: (view: View) => void;
  onSelect: (id: number) => void;
  onOpen: (doc: DocumentItem) => void;
}) {
  return (
    <div className="dashboard">
      <section className="hero-card">
        <div>
          <span className="eyebrow">Document intelligence workspace</span>
          <h2>Research across your documents with evidence.</h2>
          <p>Upload your files, build a source library, then ask questions across one or many documents.</p>
          <div className="hero-actions">
            <button className="button-primary" onClick={onUpload}><CloudUpload size={16} /> Upload documents</button>
            <button className="button-secondary" onClick={() => onNavigate("chat")}><MessageCircle size={16} /> Start research</button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-core"><Sparkles size={26} /></div>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard icon={<Library size={17} />} label="Documents" value={stats.total} hint="In your workspace" />
        <StatCard icon={<CheckCircle2 size={17} />} label="Ready" value={stats.ready} hint="Available for RAG" />
        <StatCard icon={<Clock3 size={17} />} label="Processing" value={stats.processing} hint="In ingestion pipeline" />
        <StatCard icon={<Database size={17} />} label="Selected" value={stats.selected} hint="Current research scope" />
      </section>

      <div className="section-heading-row">
        <div>
          <span className="eyebrow">Library</span>
          <h3>Recent documents</h3>
        </div>
        <button className="text-action" onClick={() => onNavigate("documents")}>View all <ArrowRight size={14} /></button>
      </div>

      {docs.length === 0 ? (
        <EmptyState icon={<Library size={23} />} title="Your document library is empty" text="Upload a PDF, DOCX, TXT, CSV or image to start building your workspace." action="Upload first document" onClick={onUpload} />
      ) : (
        <div className="document-grid">
          {docs.slice(0, 6).map((doc) => (
            <DocumentCard key={doc.id} doc={doc} selected={selectedDocs.some((item) => item.id === doc.id)} onSelect={onSelect} onOpen={onOpen} />
          ))}
        </div>
      )}

      <section className="capability-grid">
        <Capability icon={<Search size={17} />} title="Semantic search" text="Find relevant passages instead of relying only on filenames." onClick={() => onNavigate("search")} />
        <Capability icon={<MessageSquare size={17} />} title="Evidence-backed chat" text="Ask questions across selected ready documents." onClick={() => onNavigate("chat")} />
        <Capability icon={<Grid2X2 size={17} />} title="Document comparison" text="Compare selected documents in a dedicated workspace." onClick={() => onNavigate("compare")} />
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </div>
  );
}

function Capability({ icon, title, text, onClick }: { icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button className="capability-card" onClick={onClick}>
      <div className="capability-icon">{icon}</div>
      <div><strong>{title}</strong><span>{text}</span></div>
      <ArrowRight size={15} />
    </button>
  );
}

/* =========================================================
   DOCUMENTS
========================================================= */

function DocumentsView({
  docs,
  selected,
  searchTerm,
  onSearch,
  onUpload,
  onSelect,
  onSelectAll,
  onClearSelection,
  onOpen,
}: {
  docs: DocumentItem[];
  selected: number[];
  searchTerm: string;
  onSearch: (value: string) => void;
  onUpload: () => void;
  onSelect: (id: number) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOpen: (doc: DocumentItem) => void;
}) {
  return (
    <div className="workspace-view">
      <div className="view-intro">
        <div><span className="eyebrow">Source library</span><h2>Your documents</h2><p>Manage the files that power your AI research workspace.</p></div>
        <button className="button-primary" onClick={onUpload}><Upload size={16} /> Upload</button>
      </div>

      <div className="toolbar">
        <div className="search-box large"><Search size={16} /><input placeholder="Filter your document library…" value={searchTerm} onChange={(e) => onSearch(e.target.value)} /></div>
        <div className="toolbar-actions">
          <button className="button-secondary small" onClick={onSelectAll}><Check size={14} /> Select ready</button>
          {selected.length > 0 && <button className="button-ghost small" onClick={onClearSelection}>Clear selection</button>}
        </div>
      </div>

      {docs.length === 0 ? (
        <EmptyState icon={<Search size={22} />} title="No matching documents" text="Try another search term or upload a new document." action="Upload document" onClick={onUpload} />
      ) : (
        <div className="library-table">
          <div className="library-table-head">
            <span>Document</span><span>Status</span><span>Size</span><span>Created</span><span />
          </div>
          {docs.map((doc) => (
            <div className={`library-row ${selected.includes(doc.id) ? "selected" : ""}`} key={doc.id}>
              <label className="library-document">
                <input
                  type="checkbox"
                  checked={selected.includes(doc.id)}
                  disabled={String(doc.status).toLowerCase() !== "ready"}
                  onChange={() => onSelect(doc.id)}
                />
                <div className="file-type-icon">{fileIcon(doc.filename, 18)}</div>
                <div><strong>{doc.filename}</strong><small>{doc.mime_type || "Document"} · {doc.chunk_count ? `${doc.chunk_count} chunks` : "AI index"}</small></div>
              </label>
              <StatusBadge status={doc.status} />
              <span className="muted-cell">{formatBytes(doc.file_size)}</span>
              <span className="muted-cell">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "—"}</span>
              <button className="row-action" onClick={() => onOpen(doc)} title="Open document"><Eye size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentCard({
  doc,
  selected,
  onSelect,
  onOpen,
}: {
  doc: DocumentItem;
  selected: boolean;
  onSelect: (id: number) => void;
  onOpen: (doc: DocumentItem) => void;
}) {
  const ready = String(doc.status).toLowerCase() === "ready";

  return (
    <article className={`document-card ${selected ? "selected" : ""}`}>
      <div className="document-card-top">
        <div className="file-type-icon large">{fileIcon(doc.filename, 20)}</div>
        <button className="row-action" onClick={() => onOpen(doc)} title="Open"><MoreHorizontal size={17} /></button>
      </div>
      <button className="document-card-body" onClick={() => onOpen(doc)}>
        <strong title={doc.filename}>{doc.filename}</strong>
        <span>{formatBytes(doc.file_size)} · {doc.mime_type || "Document"}</span>
      </button>
      <div className="document-card-footer">
        <StatusBadge status={doc.status} />
        <label className={`scope-check ${!ready ? "disabled" : ""}`}>
          <input type="checkbox" checked={selected} disabled={!ready} onChange={() => onSelect(doc.id)} />
          Research scope
        </label>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const value = String(status || "").toLowerCase();
  return <span className={`status-badge ${value}`}><span />{statusLabel(status)}</span>;
}

/* =========================================================
   CHAT
========================================================= */

function ChatView({
  selectedDocs,
  readyCount,
  question,
  setQuestion,
  answer,
  lastQuestion,
  loading,
  citations,
  docs,
  onAsk,
  onNavigate,
  onSelectDocument,
  onOpenCitation,
}: {
  selectedDocs: DocumentItem[];
  readyCount: number;
  question: string;
  setQuestion: (value: string) => void;
  answer: string;
  lastQuestion: string;
  loading: boolean;
  citations: Citation[];
  docs: DocumentItem[];
  onAsk: () => void;
  onNavigate: (view: View) => void;
  onSelectDocument: (id: number) => void;
  onOpenCitation: (citation: Citation) => void;
}) {
  const canAsk = selectedDocs.length > 0 && !loading;

  return (
    <div className="chat-layout">
      <section className="chat-main">
        {!answer && !loading && !lastQuestion ? (
          <div className="chat-empty">
            <div className="chat-empty-icon"><Sparkles size={23} /></div>
            <span className="eyebrow">AI research assistant</span>
            <h2>Ask your document library.</h2>
            <p>Select one or more ready documents and ask a question. DocMind AI will ground the response in retrieved document context.</p>

            <div className="prompt-grid">
              {[
                ["Summarize the selected documents", "Create a concise overview of the most important points."],
                ["Find key risks and contradictions", "Surface important warnings, gaps or conflicting statements."],
                ["Extract important numbers", "Identify useful metrics, dates, amounts and named entities."],
              ].map(([title, text]) => (
                <button key={title} className="prompt-card" disabled={!canAsk} onClick={() => setQuestion(title)}>
                  <strong>{title}</strong><span>{text}</span><ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="conversation">
            <div className="conversation-meta">
              <span><MessageCircle size={14} /> Research session</span>
              <span>{selectedDocs.length} source{selectedDocs.length === 1 ? "" : "s"}</span>
            </div>

            {lastQuestion && (
              <div className="chat-message user">
                <div className="message-avatar user-avatar">P</div>
                <div><span className="message-role">You</span><p>{lastQuestion}</p></div>
              </div>
            )}

            <div className="chat-message assistant">
              <div className="message-avatar ai-avatar"><Sparkles size={14} /></div>
              <div className="assistant-body">
                <span className="message-role">DocMind AI</span>
                {loading ? (
                  <div className="thinking"><span /><span /><span /> <small>Retrieving evidence and generating answer…</small></div>
                ) : (
                  <>
                    <div className="answer"><ReactMarkdown>{answer}</ReactMarkdown></div>
                    <CitationList
                      citations={citations}
                      docs={docs}
                      onOpenCitation={onOpenCitation}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="composer-zone">
          <div className="composer">
            <textarea
              rows={1}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onAsk();
                }
              }}
              disabled={!canAsk}
              placeholder={selectedDocs.length ? "Ask anything about your selected sources…" : "Select a ready document to start researching…"}
            />
            <button className="send-button" disabled={!canAsk || !question.trim()} onClick={onAsk} aria-label="Send question"><Send size={17} /></button>
          </div>
          <div className="composer-meta">
            <span>Enter to send · Shift + Enter for a new line</span>
            <span>{selectedDocs.length} source{selectedDocs.length === 1 ? "" : "s"} · {readyCount} ready in library</span>
          </div>
        </div>
      </section>

      <aside className="source-panel">
        <div className="source-panel-head">
          <div><span className="eyebrow">Research scope</span><h3>Sources</h3></div>
          <button className="button-ghost small" onClick={() => onNavigate("documents")}>Manage</button>
        </div>

        {selectedDocs.length === 0 ? (
          <div className="source-empty"><Library size={20} /><strong>No sources selected</strong><span>Select documents from your library to start.</span><button className="button-secondary small" onClick={() => onNavigate("documents")}>Open library</button></div>
        ) : (
          <div className="source-list">
            {selectedDocs.map((doc) => (
              <button className="source-item" key={doc.id} onClick={() => onSelectDocument(doc.id)}>
                <div className="file-type-icon">{fileIcon(doc.filename, 16)}</div>
                <div><strong>{doc.filename}</strong><span>Ready · grounded source</span></div>
                <X size={14} />
              </button>
            ))}
          </div>
        )}

        <div className="source-panel-note">
          <ShieldCheck size={15} />
          <span>Answers are instructed to use only retrieved document context.</span>
        </div>
      </aside>
    </div>
  );
}

function CitationList({
  citations,
  docs,
  onOpenCitation,
}: {
  citations: Citation[];
  docs: DocumentItem[];
  onOpenCitation: (citation: Citation) => void;
}) {
  if (!citations.length) return null;

  const unique = citations.filter((citation, index, arr) => arr.findIndex((item) => item.chunk_id === citation.chunk_id) === index);

  return (
    <div className="citations">
      <span className="citation-title">Sources</span>
      <div className="citation-list">
        {unique.slice(0, 6).map((citation, index) => {
          const doc = docs.find((item) => item.id === citation.document_id);
          return (
            <button
                key={`${citation.document_id}-${citation.chunk_id}-${index}`}
                className="citation-chip"
                onClick={() => onOpenCitation(citation)}
                title="Open source"
              >
              <span>[{index + 1}]</span>
              {doc?.filename || `Document ${citation.document_id}`}
              {citation.page_number ? ` · p. ${citation.page_number}` : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================
   SEARCH
========================================================= */

function SearchView({
  docs,
  searchTerm,
  onSearch,
  onOpen,
  onSelect,
  selected,
}: {
  docs: DocumentItem[];
  searchTerm: string;
  onSearch: (value: string) => void;
  onOpen: (doc: DocumentItem) => void;
  onSelect: (id: number) => void;
  selected: number[];
}) {
  return (
    <div className="workspace-view">
      <div className="view-intro compact">
        <div><span className="eyebrow">Library search</span><h2>Find a source</h2><p>Search your indexed document library by filename. Semantic retrieval remains available through AI Chat.</p></div>
      </div>

      <div className="search-box large standalone"><Search size={18} /><input autoFocus placeholder="Search documents…" value={searchTerm} onChange={(e) => onSearch(e.target.value)} /></div>

      <div className="search-results-head"><span>{docs.length} result{docs.length === 1 ? "" : "s"}</span><span>Document library</span></div>
      <div className="search-result-list">
        {docs.map((doc) => (
          <button className="search-result" key={doc.id} onClick={() => onOpen(doc)}>
            <div className="file-type-icon large">{fileIcon(doc.filename, 20)}</div>
            <div className="search-result-main">
              <strong>{doc.filename}</strong>
              <span>{doc.mime_type || "Document"} · {formatBytes(doc.file_size)} · {statusLabel(doc.status)}</span>
            </div>
            <label className="search-scope" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={selected.includes(doc.id)} disabled={String(doc.status).toLowerCase() !== "ready"} onChange={() => onSelect(doc.id)} />
              Scope
            </label>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   COMPARE / ANALYTICS
========================================================= */

function CompareView({ docs, selected, onSelect }: { docs: DocumentItem[]; selected: number[]; onSelect: (id: number) => void }) {
  const chosen = docs.filter((doc) => selected.includes(doc.id)).slice(0, 2);

  return (
    <div className="workspace-view">
      <div className="view-intro">
        <div><span className="eyebrow">Analysis</span><h2>Compare documents</h2><p>Select two ready documents. The comparison engine will be connected to the backend in the next implementation phase.</p></div>
      </div>

      <div className="compare-grid">
        {docs.map((doc) => (
          <label className={`compare-select ${selected.includes(doc.id) ? "selected" : ""}`} key={doc.id}>
            <input type="checkbox" checked={selected.includes(doc.id)} onChange={() => onSelect(doc.id)} />
            <div className="file-type-icon large">{fileIcon(doc.filename, 20)}</div>
            <div><strong>{doc.filename}</strong><span>Ready · {formatBytes(doc.file_size)}</span></div>
            <CheckCircle2 size={17} />
          </label>
        ))}
      </div>

      <div className="compare-preview">
        <div className="compare-preview-head"><div><span className="eyebrow">Comparison preview</span><h3>{chosen.length === 2 ? "Two sources selected" : "Select two sources"}</h3></div><Grid2X2 size={20} /></div>
        {chosen.length === 2 ? (
          <div className="compare-columns">
            <div><span>Document A</span><strong>{chosen[0].filename}</strong><small>Ready for comparison</small></div>
            <div><span>Document B</span><strong>{chosen[1].filename}</strong><small>Ready for comparison</small></div>
          </div>
        ) : (
          <EmptyState icon={<Grid2X2 size={20} />} title="Comparison engine not connected yet" text="The UI and selection workflow are ready. Next we will add the comparison API and AI analysis pipeline." />
        )}
      </div>
    </div>
  );
}

function AnalyticsView({ docs, stats }: { docs: DocumentItem[]; stats: { total: number; ready: number; processing: number; selected: number } }) {
  const readiness = stats.total ? Math.round((stats.ready / stats.total) * 100) : 0;

  return (
    <div className="workspace-view">
      <div className="view-intro compact">
        <div><span className="eyebrow">System visibility</span><h2>Analytics foundation</h2><p>This surface is ready for ingestion, retrieval, latency and evaluation metrics as the backend grows.</p></div>
      </div>

      <div className="analytics-grid">
        <MetricPanel icon={<Gauge size={17} />} title="Library readiness" value={`${readiness}%`} detail={`${stats.ready} of ${stats.total} documents ready`} progress={readiness} />
        <MetricPanel icon={<Activity size={17} />} title="Processing queue" value={String(stats.processing)} detail="Documents currently processing" progress={stats.total ? Math.round((stats.processing / stats.total) * 100) : 0} />
        <MetricPanel icon={<FileBarChart2 size={17} />} title="Indexed sources" value={String(stats.ready)} detail="Available for grounded RAG" progress={readiness} />
        <MetricPanel icon={<History size={17} />} title="AI sessions" value="—" detail="Conversation telemetry will appear here" progress={0} />
      </div>

      <div className="analytics-placeholder">
        <div className="placeholder-icon"><BarChart3 size={20} /></div>
        <div><strong>Production evaluation layer</strong><span>Next: retrieval Recall@K, MRR, answer faithfulness, citation accuracy, latency and token usage.</span></div>
      </div>
    </div>
  );
}

function MetricPanel({ icon, title, value, detail, progress }: { icon: React.ReactNode; title: string; value: string; detail: string; progress: number }) {
  return (
    <div className="metric-panel">
      <div className="metric-head"><span>{icon} {title}</span><MoreHorizontal size={15} /></div>
      <strong>{value}</strong>
      <span>{detail}</span>
      <div className="progress-track"><i style={{ width: `${Math.min(100, progress)}%` }} /></div>
    </div>
  );
}

/* =========================================================
   UPLOAD / VIEWER
========================================================= */

function UploadModal({
  file,
  dragActive,
  uploading,
  fileInput,
  setDragActive,
  onFile,
  onClose,
  onUpload,
}: {
  file: File | null;
  dragActive: boolean;
  uploading: boolean;
  fileInput: React.RefObject<HTMLInputElement>;
  setDragActive: (value: boolean) => void;
  onFile: (file: File | null) => void;
  onClose: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="upload-modal">
        <div className="modal-head"><div><span className="eyebrow">Ingestion</span><h2>Add documents</h2><p>Upload a source and let the background pipeline parse, chunk and embed it.</p></div><button className="top-icon-button" onClick={onClose}><X size={17} /></button></div>

        <div
          className={`dropzone ${dragActive ? "drag-active" : ""} ${file ? "has-file" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => { e.preventDefault(); setDragActive(false); onFile(e.dataTransfer.files?.[0] || null); }}
          onClick={() => fileInput.current?.click()}
        >
          <input ref={fileInput} type="file" hidden accept=".pdf,.docx,.txt,.csv,.png,.jpg,.jpeg" onChange={(e) => onFile(e.target.files?.[0] || null)} />
          <div className="dropzone-icon">{file ? <CheckCircle2 size={23} /> : <CloudUpload size={23} />}</div>
          <strong>{file ? file.name : "Drop a document here"}</strong>
          <span>{file ? `${formatBytes(file.size)} · ready to upload` : "or click to browse from your computer"}</span>
          <small>PDF · DOCX · TXT · CSV · PNG · JPG</small>
        </div>

        <div className="pipeline-strip">
          <PipelineStep icon={<Upload size={14} />} label="Upload" />
          <ArrowRight size={13} />
          <PipelineStep icon={<FileText size={14} />} label="Parse / OCR" />
          <ArrowRight size={13} />
          <PipelineStep icon={<Database size={14} />} label="Embed" />
          <ArrowRight size={13} />
          <PipelineStep icon={<Sparkles size={14} />} label="RAG ready" />
        </div>

        <div className="modal-actions">
          <button className="button-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
          <button className="button-primary" onClick={onUpload} disabled={!file || uploading}>
            {uploading ? <><Loader2 className="spin" size={15} /> Uploading…</> : <><Upload size={15} /> Upload document</>}
          </button>
        </div>
      </section>
    </div>
  );
}

function PipelineStep({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="pipeline-step">{icon}<span>{label}</span></div>;
}

function DocumentViewer({
  doc,
  targetChunkId,
  onClose,
}: {
  doc: DocumentItem;
  targetChunkId: number | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      setLoading(true);
      setError("");

      try {
        const [detailResult, chunkResult] = await Promise.all([
          api(`/documents/${doc.id}/detail`),
          api(`/documents/${doc.id}/chunks`),
        ]);

        if (cancelled) return;

        setDetail(detailResult);
        setChunks(Array.isArray(chunkResult) ? chunkResult : []);
      } catch (e) {
        if (cancelled) return;

        setError(
          e instanceof Error
            ? e.message
            : "Failed to load document"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [doc.id]);

  useEffect(() => {
    if (loading || !targetChunkId || !chunks.length) {
      return;
    }

    const element = document.querySelector(
      `[data-chunk-id="${targetChunkId}"]`
    );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [loading, targetChunkId, chunks]);

  return (
    <div className="modal-backdrop">
      <section className="viewer-modal viewer-modal-enhanced">
        <header className="viewer-head">
          <div className="viewer-title">
            <div className="file-type-icon">
              {fileIcon(doc.filename, 17)}
            </div>

            <div>
              <strong>{doc.filename}</strong>
              <span>
                {statusLabel(doc.status)}
                {detail
                  ? ` · ${detail.chunk_count} chunks`
                  : ""}
              </span>
            </div>
          </div>

          <div className="viewer-actions">
            <button
              className="top-icon-button"
              onClick={onClose}
              title="Close viewer"
              aria-label="Close viewer"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="viewer-body">
          <div className="viewer-page">
            <div className="viewer-page-label">
              Extracted document content
            </div>

            {loading ? (
              <div className="viewer-loading">
                <Loader2 className="spin" size={22} />
                <span>Loading document intelligence…</span>
              </div>
            ) : error ? (
              <div className="viewer-error">
                <X size={18} />
                <strong>Unable to load document</strong>
                <span>{error}</span>
              </div>
            ) : chunks.length === 0 ? (
              <div className="document-placeholder">
                <FileText size={38} />
                <h3>No extracted content</h3>
                <p>
                  This document does not have any indexed text chunks yet.
                </p>
              </div>
            ) : (
              <div className="document-content">
                {chunks.map((chunk) => (
                  <article
                    key={chunk.id}
                    className={`document-chunk ${
                      targetChunkId === chunk.id
                        ? "document-chunk-highlight"
                        : ""
                    }`}
                    data-chunk-id={chunk.id}
                  >
                    <div className="chunk-header">
                      <span>
                        Chunk {chunk.chunk_index + 1}
                      </span>

                      {chunk.page_number && (
                        <span>
                          Page {chunk.page_number}
                        </span>
                      )}
                    </div>

                    <p>{chunk.content}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="viewer-sidebar">
            <span className="eyebrow">
              Document intelligence
            </span>

            <h3>Source details</h3>

            <div className="detail-list">
              <div>
                <span>File type</span>
                <strong>
                  {detail?.mime_type || doc.mime_type || "—"}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {statusLabel(detail?.status || doc.status)}
                </strong>
              </div>

              <div>
                <span>Pages</span>
                <strong>
                  {detail?.page_count || doc.page_count || "—"}
                </strong>
              </div>

              <div>
                <span>Chunks</span>
                <strong>
                  {detail?.chunk_count || chunks.length || "—"}
                </strong>
              </div>
            </div>

            {!loading && chunks.length > 0 && (
              <div className="viewer-source-list">
                <div className="viewer-source-heading">
                  <Database size={14} />
                  <span>Indexed sources</span>
                </div>

                {chunks.slice(0, 8).map((chunk) => (
                  <button
                    key={chunk.id}
                    className="viewer-source-item"
                    onClick={() => {
                      document
                        .querySelector(
                          `[data-chunk-id="${chunk.id}"]`
                        )
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                    }}
                  >
                    <span>
                      {chunk.page_number
                        ? `Page ${chunk.page_number}`
                        : `Chunk ${chunk.chunk_index + 1}`}
                    </span>

                    <small>
                      {chunk.has_embedding
                        ? "Embedded"
                        : "Not embedded"}
                    </small>
                  </button>
                ))}
              </div>
            )}

            <div className="source-panel-note">
              <ShieldCheck size={15} />
              <span>
                Source content is loaded from the authenticated
                document workspace.
              </span>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
function EmptyState({ icon, title, text, action, onClick }: { icon: React.ReactNode; title: string; text: string; action?: string; onClick?: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && onClick && <button className="button-primary" onClick={onClick}>{action} <ArrowRight size={14} /></button>}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
