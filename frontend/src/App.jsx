import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./lib/api";
import knightMark from "./assets/knight-mark.svg";

const SESSION_KEY = "knight-my-resume-session";

const initialSession = {
  token: "",
  user: null,
};

const initialAuthForms = {
  login: {
    email: "",
    password: "",
  },
  register: {
    fullName: "",
    email: "",
    password: "",
  },
};

const categoryLabel = {
  format: "Format",
  grammar: "Grammar",
  impact: "Impact",
  skills: "Skills",
  ats: "ATS",
};

const loadSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return initialSession;

    const parsed = JSON.parse(raw);
    return {
      token: parsed?.token || "",
      user: parsed?.user || null,
    };
  } catch {
    return initialSession;
  }
};

const formatDate = (value) => {
  if (!value) return "Just now";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatPercent = (value) => {
  if (typeof value !== "number") return "N/A";
  return `${Math.round(value)}%`;
};

const formatFileSize = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "Unknown size";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const scoreTone = (value) => {
  if (value >= 85) return "excellent";
  if (value >= 70) return "strong";
  if (value >= 50) return "growing";
  return "repair";
};

function App() {
  const [session, setSession] = useState(loadSession);
  const [authMode, setAuthMode] = useState("register");
  const [authForms, setAuthForms] = useState(initialAuthForms);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [booting, setBooting] = useState(Boolean(loadSession().token));

  useEffect(() => {
    if (session.token) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return;
    }

    localStorage.removeItem(SESSION_KEY);
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    if (!session.token) {
      setBooting(false);
      return undefined;
    }

    const syncProfile = async () => {
      setBooting(true);

      try {
        const user = await api.getProfile(session.token);
        if (!cancelled) {
          setSession((current) => ({ ...current, user }));
        }
      } catch {
        if (!cancelled) {
          setSession(initialSession);
        }
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    };

    syncProfile();

    return () => {
      cancelled = true;
    };
  }, [session.token]);

  const updateAuthField = (mode, field, value) => {
    setAuthForms((current) => ({
      ...current,
      [mode]: {
        ...current[mode],
        [field]: value,
      },
    }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const payload = authForms[authMode];
      const response =
        authMode === "register"
          ? await api.register(payload)
          : await api.login(payload);

      setSession({
        token: response.token,
        user: response.user,
      });
      setAuthForms(initialAuthForms);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(initialSession);
  };

  if (booting) {
    return (
      <div className="loading-screen">
        <img src={knightMark} alt="Knight crest" className="loading-mark" />
        <p>Sharpening your next draft...</p>
      </div>
    );
  }

  if (!session.token) {
    return (
      <AuthScreen
        authError={authError}
        authForms={authForms}
        authLoading={authLoading}
        authMode={authMode}
        onSubmit={handleAuthSubmit}
        setAuthMode={setAuthMode}
        updateAuthField={updateAuthField}
      />
    );
  }

  return <Dashboard session={session} onLogout={handleLogout} />;
}

function AuthScreen({
  authError,
  authForms,
  authLoading,
  authMode,
  onSubmit,
  setAuthMode,
  updateAuthField,
}) {
  return (
    <div className="auth-layout">
      <section className="auth-card-shell">
        <div className="auth-card auth-card-wide">
          <div className="brand-lockup auth-lockup">
            <img src={knightMark} alt="Knight My Resume crest" className="brand-mark" />
            <div>
              <p className="eyebrow">AI-Assited Resume Review</p>
              <h1>Knight My Resume</h1>
            </div>
          </div>

          <p className="auth-copy">
            Upload a PDF, preview it in the app, and get AI feedback.
          </p>

          <div className="auth-pill-row">
            <span className="info-pill">PDF preview</span>
            <span className="info-pill">AI suggestions</span>
            <span className="info-pill">Version history</span>
          </div>

          <div className="tab-row">
            <button
              className={authMode === "register" ? "tab active" : "tab"}
              type="button"
              onClick={() => setAuthMode("register")}
            >
              Register
            </button>
            <button
              className={authMode === "login" ? "tab active" : "tab"}
              type="button"
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
          </div>

          <div className="auth-header">
            <h2>{authMode === "register" ? "Create account" : "Log in"}</h2>
            <p>
              {authMode === "register"
                ? "Start a clean resume workspace."
                : "Open your saved dashboard."}
            </p>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            {authMode === "register" ? (
              <label className="field">
                <span>Full name</span>
                <input
                  value={authForms.register.fullName}
                  onChange={(event) =>
                    updateAuthField("register", "fullName", event.target.value)
                  }
                  placeholder="Citronaut Candidate"
                  required
                />
              </label>
            ) : null}

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={authForms[authMode].email}
                onChange={(event) => updateAuthField(authMode, "email", event.target.value)}
                placeholder="knight@ucf.edu"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={authForms[authMode].password}
                onChange={(event) =>
                  updateAuthField(authMode, "password", event.target.value)
                }
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </label>

            {authError ? <p className="banner error">{authError}</p> : null}

            <button className="primary-button auth-submit" disabled={authLoading}>
              {authLoading
                ? "Please wait..."
                : authMode === "register"
                  ? "Create workspace"
                  : "Open dashboard"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function Dashboard({ session, onLogout }) {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [selectedResume, setSelectedResume] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [versions, setVersions] = useState([]);
  const [analysisRecords, setAnalysisRecords] = useState([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardNotice, setDashboardNotice] = useState("");
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [highlightResumeId, setHighlightResumeId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const previewRef = useRef("");
  const suggestionsRef = useRef(null);
  const token = session.token;

  const replacePreview = (nextUrl) => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }

    previewRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  };

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  const handleAuthFailure = (error) => {
    if (error?.status === 401) {
      onLogout();
      return true;
    }

    return false;
  };

  const loadResumes = async () => {
    setLoadingResumes(true);
    setDashboardError("");

    try {
      const nextResumes = await api.listResumes(token);
      setResumes(nextResumes);
      setSelectedResumeId((current) => {
        if (current && nextResumes.some((resume) => resume._id === current)) {
          return current;
        }

        return nextResumes[0]?._id || null;
      });
    } catch (error) {
      if (!handleAuthFailure(error)) {
        setDashboardError(error.message);
      }
    } finally {
      setLoadingResumes(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    const loadResumeDetail = async () => {
      if (!selectedResumeId) {
        setSelectedResume(null);
        setVersions([]);
        setAnalysisRecords([]);
        setActiveAnalysisId(null);
        replacePreview("");
        return;
      }

      setLoadingDetail(true);
      setDashboardError("");

      try {
        const [resume, versionList, suggestionList] = await Promise.all([
          api.getResume(token, selectedResumeId),
          api.listVersions(token, selectedResumeId),
          api.listSuggestions(token, selectedResumeId),
        ]);

        let pdfPreview = "";

        try {
          const fileBlob = await api.getResumeFile(token, selectedResumeId);
          pdfPreview = URL.createObjectURL(fileBlob);
        } catch (error) {
          if (error.status !== 404) {
            throw error;
          }
        }

        if (!cancelled) {
          setSelectedResume(resume);
          setVersions(versionList);
          setAnalysisRecords(suggestionList);
          setActiveAnalysisId((current) => {
            if (current && suggestionList.some((record) => record._id === current)) {
              return current;
            }

            return suggestionList[0]?._id || null;
          });
          replacePreview(pdfPreview);
        } else if (pdfPreview) {
          URL.revokeObjectURL(pdfPreview);
        }
      } catch (error) {
        if (!cancelled && !handleAuthFailure(error)) {
          setDashboardError(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    };

    loadResumeDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedResumeId, token]);

  const activeAnalysis = useMemo(
    () =>
      analysisRecords.find((record) => record._id === activeAnalysisId) ||
      analysisRecords[0] ||
      null,
    [analysisRecords, activeAnalysisId]
  );

  const dashboardStats = useMemo(() => {
    const analyzedCount = resumes.filter((resume) => resume.status === "analyzed").length;

    return [
      { label: "Resumes", value: resumes.length },
      { label: "Analyzed", value: analyzedCount },
      {
        label: "Current score",
        value: activeAnalysis ? formatPercent(activeAnalysis.overallScore) : "N/A",
      },
    ];
  }, [activeAnalysis, resumes]);

  const previewDocumentUrl = previewUrl
    ? `${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`
    : "";
  const shouldHighlightAnalysis = highlightResumeId === selectedResumeId;

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setDashboardError("Choose a PDF before uploading.");
      return;
    }

    setUploading(true);
    setDashboardError("");
    setDashboardNotice("");

    try {
      const uploaded = await api.uploadResume(token, selectedFile);
      setDashboardNotice(`Uploaded ${uploaded.fileName}.`);
      await loadResumes();
      setSelectedResumeId(uploaded._id);
      setHighlightResumeId(uploaded._id);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      if (!handleAuthFailure(error)) {
        setDashboardError(error.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedResumeId) return;

    setAnalyzing(true);
    setDashboardError("");
    setDashboardNotice("");
    setHighlightResumeId(null);

    try {
      const record = await api.analyzeResume(token, selectedResumeId);
      setAnalysisRecords((current) => [
        record,
        ...current.filter((entry) => entry._id !== record._id),
      ]);
      setActiveAnalysisId(record._id);
      setDashboardNotice("Fresh suggestions are ready.");
      await loadResumes();
      requestAnimationFrame(() => {
        suggestionsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (error) {
      if (!handleAuthFailure(error)) {
        setDashboardError(error.message);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSuggestionUpdate = async (suggestionId, payload) => {
    if (!activeAnalysis) return;

    setDashboardError("");
    setDashboardNotice("");

    try {
      const updated = await api.updateSuggestion(
        token,
        activeAnalysis._id,
        suggestionId,
        payload
      );

      setAnalysisRecords((current) =>
        current.map((record) => (record._id === updated._id ? updated : record))
      );
      setDashboardNotice("Suggestion updated.");
    } catch (error) {
      if (!handleAuthFailure(error)) {
        setDashboardError(error.message);
      }
    }
  };

  return (
    <div className="dashboard-shell">
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="brand-lockup dashboard-lockup">
            <img src={knightMark} alt="Knight My Resume crest" className="sidebar-mark" />
            <div>
              <p className="eyebrow">Black and gold review desk</p>
              <h1>{session.user?.fullName || "Knight"}'s dashboard</h1>
              <p className="topbar-copy">{session.user?.email}</p>
            </div>
          </div>

          <button className="secondary-button top-logout" onClick={onLogout} type="button">
            Log out
          </button>
        </header>

        {dashboardError ? <p className="banner error">{dashboardError}</p> : null}
        {dashboardNotice ? <p className="banner success">{dashboardNotice}</p> : null}

        <section className="dashboard-overview">
          {dashboardStats.map((stat) => (
            <article className="summary-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>

        <section className="action-grid">
          <form className="panel upload-panel" onSubmit={handleUpload}>
            <div className="section-heading">
              <div>
                <h3>Upload resume PDF</h3>
                <span>Max 5 MB</span>
              </div>
            </div>

            <label className="upload-dropzone">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
              />
              <strong>{selectedFile ? selectedFile.name : "Choose a PDF"}</strong>
              <span>
                {selectedFile
                  ? "Ready to upload into your vault."
                  : "Drop in your current resume and start refining."}
              </span>
            </label>

            <button className="primary-button" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload PDF"}
            </button>
          </form>

          <div className="panel analysis-panel">
            <p className="eyebrow analysis-eyebrow">Run a fresh review</p>
            <h2>
              {selectedResume ? selectedResume.fileName : "Choose a resume to analyze"}
            </h2>
            <p className="analysis-copy">
              {selectedResume
                ? "Recieve AI recommendations and scores to improve your resume!"
                : "Upload a PDF or select one from the list first."}
            </p>

            <button
              className={
                shouldHighlightAnalysis
                  ? "primary-button analysis-button highlight"
                  : "primary-button analysis-button"
              }
              type="button"
              onClick={handleAnalyze}
              onAnimationEnd={() => {
                if (shouldHighlightAnalysis) {
                  setHighlightResumeId(null);
                }
              }}
              disabled={!selectedResumeId || analyzing || loadingDetail}
            >
              {analyzing ? "Analyzing..." : "Run knight analysis"}
            </button>
          </div>
        </section>

        <section className="workspace-grid">
          <div className="panel resume-list-panel">
            <div className="section-heading">
              <div>
                <h3>Resume vault</h3>
                <span>{loadingResumes ? "Refreshing..." : `${resumes.length} stored`}</span>
              </div>
            </div>

            {resumes.length === 0 && !loadingResumes ? (
              <EmptyState
                body="Use the upload card above to add your first PDF."
                title="No resumes uploaded yet."
              />
            ) : (
              <div className="resume-list">
                {resumes.map((resume) => (
                  <button
                    key={resume._id}
                    type="button"
                    className={
                      resume._id === selectedResumeId
                        ? "resume-item active"
                        : "resume-item"
                    }
                    onClick={() => setSelectedResumeId(resume._id)}
                  >
                    <div>
                      <strong>{resume.fileName}</strong>
                      <span>{formatDate(resume.updatedAt)}</span>
                    </div>
                    <span className={`status-pill ${resume.status}`}>{resume.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="panel detail-panel">
            <div className="section-heading">
              <div>
                <h3>Resume summary</h3>
                <span>{selectedResume ? "Selected file" : "Awaiting upload"}</span>
              </div>
            </div>

            {selectedResume ? (
              <>
                <div className="summary-head">
                  <strong>{selectedResume.fileName}</strong>
                  <span className={`status-pill ${selectedResume.status}`}>
                    {selectedResume.status}
                  </span>
                </div>

                <div className="briefing-grid">
                  <article className="briefing-card">
                    <span>Updated</span>
                    <strong>{formatDate(selectedResume.updatedAt)}</strong>
                    <p>Latest activity</p>
                  </article>
                  <article className="briefing-card">
                    <span>Size</span>
                    <strong>{formatFileSize(selectedResume.pdfSize)}</strong>
                    <p>Stored PDF file</p>
                  </article>
                  <article className="briefing-card">
                    <span>Versions</span>
                    <strong>{versions.length}</strong>
                    <p>Saved snapshots</p>
                  </article>
                  <article className="briefing-card">
                    <span>Latest score</span>
                    <strong>
                      {activeAnalysis ? formatPercent(activeAnalysis.overallScore) : "N/A"}
                    </strong>
                    <p>
                      {activeAnalysis
                        ? `Tone: ${scoreTone(activeAnalysis.overallScore)}`
                        : "Run analysis to score this resume"}
                    </p>
                  </article>
                </div>

                <div className="focus-note">
                  <span>Next step</span>
                  <p>
                    {activeAnalysis
                      ? "Review the suggestions list below and apply the highest-impact rewrites first."
                      : "Run knight analysis to generate ATS, formatting, and impact feedback."}
                  </p>
                </div>
              </>
            ) : (
              <EmptyState title="Select a resume to view its summary." />
            )}
          </div>

          <div className="panel versions-panel">
            <div className="section-heading">
              <div>
                <h3>Version history</h3>
                <span>{versions.length ? `${versions.length} entries` : "No versions"}</span>
              </div>
            </div>

            {versions.length > 0 ? (
              <div className="version-list">
                {versions.map((version) => (
                  <article className="version-card" key={version._id}>
                    <div className="version-top">
                      <strong>Version {version.versionNumber}</strong>
                      <span>{formatDate(version.createdAt)}</span>
                    </div>
                    <p>{version.changeSummary}</p>
                    <div className="version-meta">
                      <span>Improvement score</span>
                      <strong>{formatPercent(version.improvementScore)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                body="The API creates version history automatically on upload."
                title="No stored versions yet."
              />
            )}
          </div>
        </section>

        <section className="analysis-grid" ref={suggestionsRef}>
          <div className="panel suggestion-panel">
            <div className="section-heading">
              <div>
                <h3>AI suggestions</h3>
                <span>
                  {activeAnalysis
                    ? `${activeAnalysis.suggestions.length} recommendations`
                    : "No analysis yet"}
                </span>
              </div>
            </div>

            {analysisRecords.length > 0 ? (
              <div className="analysis-history">
                {analysisRecords.map((record) => (
                  <button
                    key={record._id}
                    type="button"
                    className={
                      record._id === activeAnalysis?._id
                        ? "history-chip active"
                        : "history-chip"
                    }
                    onClick={() => setActiveAnalysisId(record._id)}
                  >
                    <strong>{formatPercent(record.overallScore)}</strong>
                    <span>{formatDate(record.createdAt)}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {activeAnalysis ? (
              <div className="suggestion-list">
                {activeAnalysis.suggestions.map((suggestion) => (
                  <article className="suggestion-card" key={suggestion.suggestionId}>
                    <div className="suggestion-top">
                      <span className={`category-pill ${suggestion.category}`}>
                        {categoryLabel[suggestion.category]}
                      </span>
                      <span className={`score-pill ${scoreTone(suggestion.score)}`}>
                        {formatPercent(suggestion.score)}
                      </span>
                    </div>

                    <h4>{suggestion.message}</h4>

                    {suggestion.beforeText ? (
                      <div className="rewrite-block">
                        <span>Before</span>
                        <p>{suggestion.beforeText}</p>
                      </div>
                    ) : null}

                    {suggestion.suggestedText ? (
                      <div className="rewrite-block accent">
                        <span>Suggested rewrite</span>
                        <p>{suggestion.suggestedText}</p>
                      </div>
                    ) : null}

                    <div className="suggestion-actions">
                      <button
                        className={
                          suggestion.isApplied
                            ? "secondary-button active"
                            : "secondary-button"
                        }
                        type="button"
                        onClick={() =>
                          handleSuggestionUpdate(suggestion.suggestionId, {
                            isApplied: !suggestion.isApplied,
                          })
                        }
                      >
                        {suggestion.isApplied ? "Applied" : "Mark applied"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                body="Upload a resume and run the knight analysis to populate this board."
                title="No AI suggestions yet."
              />
            )}
          </div>
        </section>

        <section className="panel preview-panel">
          <div className="section-heading preview-heading">
            <div>
              <h3>PDF preview</h3>
              <span>{selectedResume ? selectedResume.fileName : "Nothing selected"}</span>
            </div>

            {previewUrl ? (
              <a
                className="secondary-button preview-link"
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open PDF
              </a>
            ) : null}
          </div>

          {loadingDetail ? (
            <EmptyState title="Loading resume details..." />
          ) : previewUrl ? (
            <object
              className="resume-frame"
              data={previewDocumentUrl}
              type="application/pdf"
            >
              <div className="empty-panel">
                <p>Preview not available in this browser.</p>
                <a
                  className="primary-button preview-link"
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open the PDF
                </a>
              </div>
            </object>
          ) : (
            <EmptyState
              body="Upload a fresh resume to enable in-app preview."
              title="No PDF preview available."
            />
          )}
        </section>
      </main>
    </div>
  );
}

function EmptyState({ body, title }) {
  return (
    <div className="empty-panel">
      <p>{title}</p>
      {body ? <span>{body}</span> : null}
    </div>
  );
}

export default App;
