import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./lib/api";
import knightMark from "./assets/knight-mark.svg";

const SESSION_KEY = "knight-my-resume-session";
const RESET_TOKEN_PARAM = "reset";

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
  forgot: {
    email: "",
  },
  reset: {
    password: "",
    confirmPassword: "",
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

const loadResetToken = () => {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(RESET_TOKEN_PARAM) || "";
};

const setResetTokenInUrl = (token) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);

  if (token) {
    url.searchParams.set(RESET_TOKEN_PARAM, token);
  } else {
    url.searchParams.delete(RESET_TOKEN_PARAM);
  }

  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
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
  const [resetToken, setResetToken] = useState(loadResetToken);
  const [authMode, setAuthMode] = useState(() =>
    loadResetToken() ? "reset" : "register"
  );
  const [authForms, setAuthForms] = useState(initialAuthForms);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
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

  const changeAuthMode = (mode) => {
    if (mode !== "reset" && resetToken) {
      setResetToken("");
      setResetTokenInUrl("");
    }

    setAuthMode(mode);
    setAuthError("");
    setAuthNotice("");
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthNotice("");

    try {
      if (authMode === "forgot") {
        const response = await api.requestPasswordReset(authForms.forgot);
        setAuthNotice(response.message);
        setAuthForms((current) => ({
          ...current,
          login: {
            ...current.login,
            email: current.forgot.email,
          },
          forgot: initialAuthForms.forgot,
        }));
        return;
      }

      if (authMode === "reset") {
        if (!resetToken) {
          throw new Error("This password reset link is missing or invalid.");
        }

        if (authForms.reset.password !== authForms.reset.confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const response = await api.resetPassword({
          token: resetToken,
          password: authForms.reset.password,
        });

        setResetToken("");
        setResetTokenInUrl("");
        setAuthForms((current) => ({
          ...current,
          reset: initialAuthForms.reset,
        }));
        setAuthMode("login");
        setAuthNotice(response.message);
        return;
      }

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
        authNotice={authNotice}
        hasResetToken={Boolean(resetToken)}
        onSubmit={handleAuthSubmit}
        setAuthMode={changeAuthMode}
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
  authNotice,
  hasResetToken,
  onSubmit,
  setAuthMode,
  updateAuthField,
}) {
  const isRegister = authMode === "register";
  const isLogin = authMode === "login";
  const isForgot = authMode === "forgot";
  const isReset = authMode === "reset";
  const showTabs = isRegister || isLogin;

  const headerTitle = isRegister
    ? "Create account"
    : isLogin
      ? "Log in"
      : isForgot
        ? "Reset your password"
        : "Choose a new password";

  const headerCopy = isRegister
    ? "Start a clean resume workspace."
    : isLogin
      ? "Open your saved dashboard."
      : isForgot
        ? "Enter your email and we’ll send a reset link."
        : "Set a new password for your account.";

  const submitLabel = authLoading
    ? "Please wait..."
    : isRegister
      ? "Create account"
      : isLogin
        ? "Login"
        : isForgot
          ? "Send reset email"
          : "Save new password";

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

          {showTabs ? (
            <div className="tab-row">
              <button
                className={isRegister ? "tab active" : "tab"}
                type="button"
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
              <button
                className={isLogin ? "tab active" : "tab"}
                type="button"
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
            </div>
          ) : (
            <button
              className="link-button auth-back-link"
              type="button"
              onClick={() => setAuthMode("login")}
            >
              Back to login
            </button>
          )}

          <div className="auth-header">
            <h2>{headerTitle}</h2>
            <p>{headerCopy}</p>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            {isRegister ? (
              <label className="field">
                <span>Full name<span className="required-star">*</span></span>
                <input
                  value={authForms.register.fullName}
                  onChange={(event) =>
                    updateAuthField("register", "fullName", event.target.value)
                  }
                  placeholder="Name"
                  required
                />
              </label>
            ) : null}

            {isReset ? (
              <>
                <label className="field">
                  <span>New password<span className="required-star">*</span></span>
                  <input
                    type="password"
                    value={authForms.reset.password}
                    onChange={(event) =>
                      updateAuthField("reset", "password", event.target.value)
                    }
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    required
                  />
                </label>

                <label className="field">
                  <span>Confirm password<span className="required-star">*</span></span>
                  <input
                    type="password"
                    value={authForms.reset.confirmPassword}
                    onChange={(event) =>
                      updateAuthField("reset", "confirmPassword", event.target.value)
                    }
                    placeholder="Re-enter your password"
                    minLength={6}
                    required
                  />
                </label>

                {!hasResetToken ? (
                  <p className="auth-helper-copy">
                    This reset link is missing its token. Request a new email to continue.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <label className="field">
                  <span>Email<span className="required-star">*</span></span>
                  <input
                    type="email"
                    value={authForms[authMode].email}
                    onChange={(event) =>
                      updateAuthField(authMode, "email", event.target.value)
                    }
                    placeholder="knight@ucf.edu"
                    required
                  />
                </label>

                {isForgot ? (
                  <p className="auth-helper-copy">
                    If the address exists in the system, we&apos;ll send a one-time reset
                    link there.
                  </p>
                ) : (
                  <>
                    <label className="field">
                      <span>Password<span className="required-star">*</span></span>
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

                    {isLogin ? (
                      <div className="auth-helper-row">
                        <button
                          className="link-button"
                          type="button"
                          onClick={() => setAuthMode("forgot")}
                        >
                          Forgot password?
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </>
            )}

            {authNotice ? <p className="banner success">{authNotice}</p> : null}

            {authError ? <p className="banner error">{authError}</p> : null}

            <button
              className="primary-button auth-submit"
              disabled={authLoading || (isReset && !hasResetToken)}
            >
              {submitLabel}
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
  const [activeVersionNumber, setActiveVersionNumber] = useState(null);
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
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [reviewTab, setReviewTab] = useState("suggestions");
  const [jobMatches, setJobMatches] = useState([]);
  const [jobMatchesResumeId, setJobMatchesResumeId] = useState(null);
  const [loadingJobMatches, setLoadingJobMatches] = useState(false);
  const [jobMatchPhase, setJobMatchPhase] = useState("idle");
  const fileInputRef = useRef(null);
  const previewRef = useRef("");
  const suggestionsRef = useRef(null);
  const jobMatchRequestRef = useRef(0);
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

  useEffect(() => {
    setJobMatches([]);
    setJobMatchesResumeId(null);
    setLoadingJobMatches(false);
    setJobMatchPhase("idle");
    jobMatchRequestRef.current += 1;
  }, [selectedResumeId]);

  const handleAuthFailure = (error) => {
    if (error?.status === 401) {
      onLogout();
      return true;
    }

    return false;
  };

  const loadJobMatches = async (
    resumeId,
    { force = false, resync = false } = {}
  ) => {
    if (!resumeId) return;
    if (!force && jobMatchesResumeId === resumeId) return;

    const requestId = jobMatchRequestRef.current + 1;
    jobMatchRequestRef.current = requestId;

    setLoadingJobMatches(true);
    setJobMatchPhase(resync ? "syncing" : "matching");
    setDashboardError("");

    try {
      if (resync) {
        await api.syncJobs(token, { force: true });

        if (jobMatchRequestRef.current !== requestId) return;
      }

      const matches = await api.matchJobs(token, resumeId);

      if (jobMatchRequestRef.current !== requestId) return;

      setJobMatches(matches);
      setJobMatchesResumeId(resumeId);
    } catch (error) {
      if (jobMatchRequestRef.current !== requestId) return;

      if (!handleAuthFailure(error)) {
        setDashboardError(error.message);
      }
    } finally {
      if (jobMatchRequestRef.current === requestId) {
        setLoadingJobMatches(false);
        setJobMatchPhase("idle");
      }
    }
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
        setActiveVersionNumber(null);
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
          const latestVersion = versionList[0]?.versionNumber || null;
          setActiveVersionNumber(latestVersion);
          setAnalysisRecords(suggestionList);
          setActiveAnalysisId((current) => {
            if (current && suggestionList.some((record) => record._id === current)) {
              return current;
            }

            return suggestionList[0]?._id || null;
          });
          replacePreview(pdfPreview);
        }else if (pdfPreview) {
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
  }, [selectedResumeId, detailRefresh, token]);

  useEffect(() => {
    if (reviewTab !== "jobs" || !selectedResumeId) {
      return;
    }

    if (jobMatchesResumeId === selectedResumeId) {
      return;
    }

    loadJobMatches(selectedResumeId);
  }, [jobMatchesResumeId, reviewTab, selectedResumeId, token]);

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

  const handleVersionClick = async (versionNumber) => {
    if (!selectedResumeId || versionNumber === activeVersionNumber) return;

    setActiveVersionNumber(versionNumber);

    // Switch to the analysis linked to this version
    const version = versions.find((v) => v.versionNumber === versionNumber);
    if (version) {
      const matchingAnalysis = analysisRecords.find(
        (r) => r.resumeVersionId === version._id
      );
      if (matchingAnalysis) {
        setActiveAnalysisId(matchingAnalysis._id);
      }
    }

    try {
      const fileBlob = await api.getVersionFile(token, selectedResumeId, versionNumber);
      replacePreview(URL.createObjectURL(fileBlob));
    } catch (error) {
      if (!handleAuthFailure(error)) {
        setDashboardError("Could not load PDF for that version.");
      }
    }
  };

  const handleAnalysisClick = async (record) => {
    if (record._id === activeAnalysis?._id) return;

    setActiveAnalysisId(record._id);

    // Find the version linked to this analysis and switch to it
    if (record.resumeVersionId) {
      const version = versions.find((v) => v._id === record.resumeVersionId);
      if (version && version.versionNumber !== activeVersionNumber) {
        setActiveVersionNumber(version.versionNumber);
        try {
          const fileBlob = await api.getVersionFile(token, selectedResumeId, version.versionNumber);
          replacePreview(URL.createObjectURL(fileBlob));
        } catch (error) {
          if (!handleAuthFailure(error)) {
            setDashboardError("Could not load PDF for that version.");
          }
        }
      }
    }
  };

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
      setDetailRefresh((n) => n + 1);
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
                <h3>Upload resume PDF<span className="required-star">*</span></h3>
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
                  <article
                    className={`version-card${version.versionNumber === activeVersionNumber ? " version-card-active" : ""}`}
                    key={version._id}
                    onClick={() => handleVersionClick(version.versionNumber)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleVersionClick(version.versionNumber);
                    }}
                  >
                    <div className="version-top">
                      <strong>Version {version.versionNumber}</strong>
                      <span>{formatDate(version.createdAt)}</span>
                    </div>
                    <p>{version.changeSummary}</p>
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

        <section className="review-layout">
          <div className="review-left">
            <div className="analysis-grid" ref={suggestionsRef}>
              <div className="panel suggestion-panel">
                <div className="section-heading review-heading">
                  <div>
                    <h3>{reviewTab === "suggestions" ? "AI suggestions" : "Job matches"}</h3>
                    <span>
                      {reviewTab === "suggestions"
                        ? activeAnalysis
                          ? `${activeAnalysis.suggestions.length} recommendations`
                          : "No analysis yet"
                        : !selectedResumeId
                          ? "Choose a resume first"
                          : loadingJobMatches
                            ? jobMatchPhase === "syncing"
                              ? "Syncing listings and refreshing matches..."
                              : "Finding matching roles..."
                            : jobMatches.length > 0
                              ? `${jobMatches.length} roles found`
                              : "No matches yet"}
                    </span>
                  </div>

                  {reviewTab === "jobs" && selectedResumeId ? (
                    <button
                      className="ghost-button review-refresh"
                      type="button"
                      onClick={() =>
                        loadJobMatches(selectedResumeId, {
                          force: true,
                          resync: true,
                        })
                      }
                      disabled={loadingJobMatches}
                    >
                      {loadingJobMatches && jobMatchPhase === "syncing"
                        ? "Syncing..."
                        : loadingJobMatches
                          ? "Refreshing..."
                          : "Refresh jobs"}
                    </button>
                  ) : null}
                </div>

                <div className="review-tab-row">
                  <button
                    className={reviewTab === "suggestions" ? "tab active" : "tab"}
                    type="button"
                    onClick={() => setReviewTab("suggestions")}
                  >
                    Suggestions
                  </button>
                  <button
                    className={reviewTab === "jobs" ? "tab active" : "tab"}
                    type="button"
                    onClick={() => setReviewTab("jobs")}
                  >
                    Job matches
                  </button>
                </div>

                {reviewTab === "suggestions" ? (
                  <>
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
                            onClick={() => handleAnalysisClick(record)}
                          >
                            <strong>{formatPercent(record.overallScore)}</strong>
                            <span>{formatDate(record.createdAt)}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {activeAnalysis ? (
                      <>
                        {activeAnalysis.roleMatches && activeAnalysis.roleMatches.length > 0 ? (
                          <div className="role-matches">
                            <div className="role-matches-header">
                              <strong>Best-fit roles</strong>
                              {activeAnalysis.detectedField ? (
                                <span className="detected-field-pill">
                                  {activeAnalysis.detectedField}
                                </span>
                              ) : null}
                            </div>
                            <div className="role-pill-list">
                              {activeAnalysis.roleMatches.map((role, i) => (
                                <span className="role-pill" key={i}>
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

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
                      </>
                    ) : (
                      <EmptyState
                        body="Upload a resume and run the knight analysis to populate this board."
                        title="No AI suggestions yet."
                      />
                    )}
                  </>
                ) : (
                  <JobMatchesPanel
                    hasSelectedResume={Boolean(selectedResumeId)}
                    jobMatches={jobMatches}
                    jobMatchPhase={jobMatchPhase}
                    loadingJobMatches={loadingJobMatches}
                  />
                )}
              </div>
            </div>
          </div>

          <aside className="review-right">
            <div className="panel preview-panel preview-sticky">
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
                <div className="resume-frame-wrapper">
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
                </div>
              ) : (
                <EmptyState
                  body="Upload a fresh resume to enable in-app preview."
                  title="No PDF preview available."
                />
              )}
            </div>
          </aside>
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

function JobMatchesPanel({
  hasSelectedResume,
  jobMatches,
  jobMatchPhase,
  loadingJobMatches,
}) {
  if (!hasSelectedResume) {
    return (
      <EmptyState
        body="Choose a resume from the vault to score it against the available jobs."
        title="Select a resume to unlock job matches."
      />
    );
  }

  if (loadingJobMatches) {
    return (
      <EmptyState
        body={
          jobMatchPhase === "syncing"
            ? "Refreshing the job feed, then recomputing the best matches for this resume."
            : "Comparing this resume against the jobs already synced into the app."
        }
        title={
          jobMatchPhase === "syncing"
            ? "Syncing jobs and finding matches..."
            : "Finding matching roles..."
        }
      />
    );
  }

  if (jobMatches.length === 0) {
    return (
      <EmptyState
        body="No roles cleared the current match threshold for this resume."
        title="No job matches found yet."
      />
    );
  }

  return (
    <div className="job-match-list">
      {jobMatches.map((match, index) => {
        const job = match.job || {};
        const jobKey =
          job._id || job.externalJobId || `${job.company}-${job.title}-${index}`;
        const topSkills = Array.isArray(job.requiredSkills)
          ? job.requiredSkills.slice(0, 6)
          : [];

        return (
          <article className="job-match-card" key={jobKey}>
            <div className="job-match-top">
              <div className="job-match-copy">
                <span className="job-match-company">{job.company || "Unknown company"}</span>
                <h4>{job.title || "Untitled role"}</h4>
              </div>

              <span className={`score-pill ${scoreTone(match.matchScore)}`}>
                {formatPercent(match.matchScore)} match
              </span>
            </div>

            {job.location || job.source ? (
              <div className="job-meta-row">
                {job.location ? <span className="job-meta-chip">{job.location}</span> : null}
                {job.source ? <span className="job-meta-chip">{job.source}</span> : null}
              </div>
            ) : null}

            {job.description ? <p className="job-description">{job.description}</p> : null}

            {topSkills.length > 0 ? (
              <div className="job-skill-list">
                {topSkills.map((skill) => (
                  <span
                    className="job-skill-pill"
                    key={`${jobKey}-${skill.name || "skill"}`}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="job-card-actions">
              {job.jobUrl ? (
                <a
                  className="primary-button job-link-button"
                  href={job.jobUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open listing
                </a>
              ) : (
                <span className="job-link-missing">Link unavailable</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default App;
