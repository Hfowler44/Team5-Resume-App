const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const jsonHeaders = {
  Accept: "application/json",
};

const getErrorMessage = (payload, fallback) => {
  if (payload?.error) return payload.error;
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors.map((entry) => entry.msg).join(", ");
  }
  return fallback;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, options);
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    let payload = null;

    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    const error = new Error(
      typeof payload === "string"
        ? payload || response.statusText
        : getErrorMessage(payload, response.statusText)
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (contentType.includes("application/pdf")) {
    return response.blob();
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
};

const authHeaders = (token, extraHeaders = {}) => ({
  ...extraHeaders,
  Authorization: `Bearer ${token}`,
});

export const api = {
  register(payload) {
    return request("/auth/register", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  login(payload) {
    return request("/auth/login", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  requestPasswordReset(payload) {
    return request("/auth/forgot-password", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  resetPassword(payload) {
    return request("/auth/reset-password", {
      method: "POST",
      headers: {
        ...jsonHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  getProfile(token) {
    return request("/users/me", {
      headers: authHeaders(token, jsonHeaders),
    });
  },
  updateProfile(token, payload) {
    return request("/users/me", {
      method: "PUT",
      headers: authHeaders(token, {
        ...jsonHeaders,
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
    });
  },
  listResumes(token) {
    return request("/resumes", {
      headers: authHeaders(token, jsonHeaders),
    });
  },
  getResume(token, resumeId) {
    return request(`/resumes/${resumeId}`, {
      headers: authHeaders(token, jsonHeaders),
    });
  },
  getResumeFile(token, resumeId) {
    return request(`/resumes/${resumeId}/file`, {
      headers: authHeaders(token),
    });
  },
  listVersions(token, resumeId) {
    return request(`/resumes/${resumeId}/versions`, {
      headers: authHeaders(token, jsonHeaders),
    });
  },
  getVersionFile(token, resumeId, versionNumber) {
    return request(`/resumes/${resumeId}/versions/${versionNumber}/file`, {
      headers: authHeaders(token),
    });
  },
  listSuggestions(token, resumeId) {
    return request(`/resumes/${resumeId}/suggestions`, {
      headers: authHeaders(token, jsonHeaders),
    });
  },
  uploadResume(token, file) {
    const formData = new FormData();
    formData.append("resume", file);

    return request("/resumes", {
      method: "POST",
      headers: authHeaders(token),
      body: formData,
    });
  },
  analyzeResume(token, resumeId) {
    return request(`/resumes/${resumeId}/analyze`, {
      method: "POST",
      headers: authHeaders(token, jsonHeaders),
    });
  },
  updateSuggestion(token, recordId, suggestionId, payload) {
    return request(`/suggestions/${recordId}/items/${suggestionId}`, {
      method: "PATCH",
      headers: authHeaders(token, {
        ...jsonHeaders,
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
    });
  },
};
