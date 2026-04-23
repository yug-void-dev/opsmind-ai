/**
 * OpsMind AI — Frontend API Client
 *
 * A production-grade axios instance built to match the backend exactly:
 *
 *  Backend response envelope:
 *    { success: boolean, message: string, data: any, timestamp: string }
 *
 *  All routes:
 *    POST   /api/auth/register
 *    POST   /api/auth/login
 *    GET    /api/auth/me
 *    POST   /api/auth/admin/create        (admin only)
 *
 *    GET    /api/documents                (list)
 *    GET    /api/documents/:id            (single + status poll)
 *    POST   /api/documents/upload         → 202, async pipeline
 *    DELETE /api/documents/:id            (admin only)
 *    POST   /api/documents/:id/reindex    (admin only)
 *    PATCH  /api/documents/:id/tags       (admin only)
 *
 *    POST   /api/query                    (standard JSON)
 *    POST   /api/query/stream             (SSE — use streamQuery(), not this client)
 *
 *    GET    /api/chats
 *    GET    /api/chats/:id
 *    POST   /api/chats/save
 *    DELETE /api/chats/:id
 *    DELETE /api/chats
 *
 *    GET    /api/admin/stats
 *    GET    /api/admin/analytics
 *    GET    /api/admin/users
 *    PATCH  /api/admin/users/:id/toggle
 *    POST   /api/admin/reindex
 *    DELETE /api/admin/cache
 *    GET    /api/admin/failed-queries
 *    GET    /api/admin/documents
 *
 *    GET    /health
 */

import axios from "axios";

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Vite proxy rewrites /api → http://localhost:5000 in dev.
// In production, VITE_API_URL must point to the deployed backend.
const BASE_URL = import.meta.env.VITE_API_URL || "";

// ─── Axios Instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,              // 30 s — generous for embedding pipeline responses
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false,       // JWT in Authorization header, not cookies
});

// ─── Request Interceptor — inject JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — unwrap envelope + handle auth errors ──────────────
// Backend always wraps: { success, message, data, timestamp }
// We unwrap so callers receive response.data directly (the inner `data` field).
api.interceptors.response.use(
  (response) => {
    // Unwrap the backend envelope: { success: true, message, data, timestamp }
    if (
      response.data &&
      typeof response.data === "object" &&
      "success" in response.data
    ) {
      // Preserve backend message for toast notifications without breaking data access
      response.data._message = response.data.message;
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    // Network error — no response received from server at all
    if (!error.response) {
      return Promise.reject(
        new ApiError(
          "Unable to reach the server. Check your connection.",
          0,
          "NETWORK_ERROR"
        )
      );
    }

    const { status, data } = error.response;

    // 401 — token expired or invalid → clear storage and force re-login
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete axios.defaults.headers.common["Authorization"];
      // Only redirect if not already on an auth page to avoid infinite loops
      if (
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        window.location.href = "/login";
      }
      return Promise.reject(
        new ApiError(
          data?.message || "Session expired. Please log in again.",
          401,
          "UNAUTHORIZED"
        )
      );
    }

    // 403 — authenticated but not authorised (e.g. employee hitting /api/admin)
    if (status === 403) {
      return Promise.reject(
        new ApiError(
          data?.message || "You do not have permission to do this.",
          403,
          "FORBIDDEN"
        )
      );
    }

    // 429 — rate limited (upload, query, or auth abuse)
    if (status === 429) {
      return Promise.reject(
        new ApiError(
          data?.message || "Too many requests. Please slow down.",
          429,
          "RATE_LIMITED"
        )
      );
    }

    // 4xx — validation or business logic errors (e.g. duplicate document name)
    if (status >= 400 && status < 500) {
      return Promise.reject(
        new ApiError(
          data?.message || "Bad request.",
          status,
          "CLIENT_ERROR",
          data?.errors || null   // backend may attach a Joi validation errors array
        )
      );
    }

    // 5xx — server errors
    return Promise.reject(
      new ApiError(
        data?.message || "Something went wrong on the server. Try again.",
        status,
        "SERVER_ERROR"
      )
    );
  }
);

// ─── Custom Error Class ───────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(message, statusCode = 0, code = "UNKNOWN", errors = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;     // NETWORK_ERROR | UNAUTHORIZED | FORBIDDEN | RATE_LIMITED | CLIENT_ERROR | SERVER_ERROR
    this.errors = errors;   // field-level validation errors array from backend Joi
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

export const authApi = {
  /**
   * POST /api/auth/register
   * Body: { name, email, password, confirmPassword }
   * Returns: { token, user }
   */
  register: (data) => api.post("/api/auth/register", data),

  /**
   * POST /api/auth/login
   * Body: { email, password }
   * Returns: { token, user }
   */
  login: (data) => api.post("/api/auth/login", data),

  /**
   * GET /api/auth/me
   * Returns: { user }  — used to verify token is still valid on app load
   */
  getMe: () => api.get("/api/auth/me"),

  /**
   * POST /api/auth/admin/create   (admin only)
   * Body: { name, email, password }
   * Returns: { token, user }
   */
  createAdmin: (data) => api.post("/api/auth/admin/create", data),
};

// ══════════════════════════════════════════════════════════════════════════════
//  DOCUMENT ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

export const documentsApi = {
  /**
   * POST /api/documents/upload
   * Sends multipart/form-data. Backend responds 202 immediately — pipeline runs async.
   * Response: { documentId, name, status: "processing", statusEndpoint }
   *
   * @param {File}       file          — the PDF File object from input or dropzone
   * @param {string}     [name]        — optional custom display name
   * @param {string[]}   [tags]        — optional tags array
   * @param {Function}   [onProgress]  — (percent: number) => void for upload progress bar
   */
  upload: (file, name, tags = [], onProgress) => {
    const form = new FormData();
    form.append("file", file);
    if (name) form.append("name", name);
    if (tags.length > 0) form.append("tags", tags.join(","));

    return api.post("/api/documents/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,    // 2 min — large PDFs take time to upload
      onUploadProgress: onProgress
        ? (evt) => {
          const percent = evt.total
            ? Math.round((evt.loaded * 100) / evt.total)
            : 0;
          onProgress(percent);
        }
        : undefined,
    });
  },

  /**
   * GET /api/documents
   * Query params: { page?, limit?, status?, tags?, search? }
   * Returns: Document[]
   */
  list: (params = {}) => api.get("/api/documents", { params }),

  /**
   * GET /api/documents/:id
   * Used to poll processing status after upload.
   * Returns: Document { status: "processing" | "ready" | "failed" | "reindexing" }
   */
  getById: (id) => api.get(`/api/documents/${id}`),

  /**
   * DELETE /api/documents/:id   (admin only)
   * Deletes document record + ALL vector chunk embeddings + file from disk.
   * Returns: { deleted: { documentId, name, chunksRemoved } }
   */
  delete: (id) => api.delete(`/api/documents/${id}`),

  /**
   * POST /api/documents/:id/reindex   (admin only)
   * Re-processes and re-embeds without needing a re-upload.
   * Returns 202 — poll getById() for status.
   */
  reindex: (id) => api.post(`/api/documents/${id}/reindex`),

  /**
   * PATCH /api/documents/:id/tags   (admin only)
   * Body: { tags: string[] }
   * Propagates tag updates to all associated chunks for hybrid search filtering.
   */
  updateTags: (id, tags) => api.patch(`/api/documents/${id}/tags`, { tags }),
};

// ══════════════════════════════════════════════════════════════════════════════
//  QUERY ENDPOINT  (standard JSON — for non-streaming use)
//  For the real-time chat experience, use streamQuery() below instead.
// ══════════════════════════════════════════════════════════════════════════════

export const queryApi = {
  /**
   * POST /api/query
   * Body: { query, documentId?, tags?, stream?: false, rewriteQuery?: true }
   * Returns: { answer, sources[], answered, chunksRetrieved, responseTimeMs, tokenUsage }
   */
  ask: (query, options = {}) =>
    api.post("/api/query", { query, stream: false, ...options }),
};

// ══════════════════════════════════════════════════════════════════════════════
//  SSE STREAMING — native fetch (axios cannot handle Server-Sent Events)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * streamQuery — POST /api/query/stream with SSE response
 *
 * The backend sends 5 typed SSE events in this order:
 *   { type: "metadata", queryRewritten, chunksRetrieved, pipeline }
 *   { type: "sources",  sources: Citation[] }
 *   { type: "chunk",    content: string }     ← one token at a time
 *   { type: "done",     answer, sources, answered, responseTimeMs, tokenUsage }
 *   { type: "error",    message: string }
 *
 * @param {string}    query
 * @param {object}    options      — { documentId?, tags?, rewriteQuery? }
 * @param {object}    callbacks    — { onMetadata, onSources, onChunk, onDone, onError }
 * @returns {Function}             — call this function to abort the stream mid-way
 *
 * Example usage in a React component:
 *   const abort = streamQuery("How do I process a refund?", {}, {
 *     onSources: (sources) => setSources(sources),
 *     onChunk:   (token)   => setAnswer((prev) => prev + token),
 *     onDone:    (data)    => setLoading(false),
 *     onError:   (msg)     => setError(msg),
 *   });
 *   // Cancel on component unmount:
 *   return () => abort();
 */
export const streamQuery = (query, options = {}, callbacks = {}) => {
  const { onMetadata, onSources, onChunk, onDone, onError } = callbacks;
  const controller = new AbortController();
  const token = localStorage.getItem("token");

  const body = JSON.stringify({
    query,
    stream: true,
    rewriteQuery: options.rewriteQuery ?? true,
    ...(options.documentId && { documentId: options.documentId }),
    ...(options.tags?.length > 0 && { tags: options.tags }),
  });

  fetch(`${BASE_URL}/api/query/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body,
    signal: controller.signal,
  })
    .then(async (response) => {
      // Non-2xx means the stream never started (e.g. auth error, rate limit)
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg =
          response.status === 401 ? "Session expired. Please log in again."
            : response.status === 429 ? "Query rate limit reached. Please wait a moment."
              : errData?.message || `Stream request failed (${response.status})`;
        onError?.(msg);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Accumulate decoded text — SSE frames can split across read() calls
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are delimited by double newline
        const frames = buffer.split("\n\n");

        // Last element may be an incomplete frame — keep it in buffer
        buffer = frames.pop() || "";

        for (const frame of frames) {
          // Each SSE frame line looks like: "data: {...json...}"
          const line = frame.replace(/^data:\s*/m, "").trim();
          if (!line) continue;

          let event;
          try {
            event = JSON.parse(line);
          } catch {
            // Malformed JSON frame — skip silently
            continue;
          }

          switch (event.type) {
            case "metadata":
              onMetadata?.(event);
              break;
            case "sources":
              onSources?.(event.sources ?? []);
              break;
            case "chunk":
              onChunk?.(event.content ?? "");
              break;
            case "done":
              onDone?.(event);
              break;
            case "error":
              onError?.(event.message ?? "An error occurred during streaming");
              break;
            default:
              break;
          }
        }
      }
    })
    .catch((err) => {
      // AbortError = caller cancelled intentionally — not an error
      if (err.name === "AbortError") return;
      onError?.(err.message || "Stream connection failed");
    });

  // Return an abort function so the caller (e.g. useChat hook) can cancel
  return () => controller.abort();
};

// ══════════════════════════════════════════════════════════════════════════════
//  CHAT HISTORY ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════════

export const chatsApi = {
  /**
   * GET /api/chats
   * Query: { page?, limit? }
   * Returns: Chat[] sorted by updatedAt descending
   */
  list: (params = {}) => api.get("/api/chats", { params }),

  /**
   * GET /api/chats/:id
   * Returns: Chat with full messages[] array
   */
  getById: (id) => api.get(`/api/chats/${id}`),

  /**
   * POST /api/chats/save
   * Supports two formats:
   *   Format A (full messages): { _id?, title, messages: Message[] }
   *   Format B (pair append):   { chatId?, userMessage, assistantMessage, sources? }
   * Returns: { _id, chatId, title, messageCount }
   */
  save: (data) => api.post("/api/chats/save", data),

  /**
   * DELETE /api/chats/:id
   * Soft-deletes a single chat session (sets isActive: false)
   */
  delete: (id) => api.delete(`/api/chats/${id}`),

  /**
   * DELETE /api/chats
   * Soft-deletes ALL chats for the authenticated user
   */
  clearAll: () => api.delete("/api/chats"),
};

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS   (all require role: "admin")
// ══════════════════════════════════════════════════════════════════════════════

export const adminApi = {
  /**
   * GET /api/admin/stats
   * Returns: { documentCount, chunkCount, userCount, queryCount, ... }
   */
  getStats: () => api.get("/api/admin/stats"),

  /**
   * GET /api/admin/analytics
   * Query: { days? }
   * Returns analytics data used by the admin overview page
   */
  getAnalytics: (params = {}) => api.get("/api/admin/analytics", { params }),

  /**
   * GET /api/admin/documents
   * Returns all documents across all users (full admin view)
   */
  listAllDocuments: (params = {}) => api.get("/api/admin/documents", { params }),

  /**
   * GET /api/admin/users
   * Returns all registered users with their query counts and isActive status
   */
  listUsers: (params = {}) => api.get("/api/admin/users", { params }),

  /**
   * PATCH /api/admin/users/:id/toggle
   * Toggles user.isActive — activates a deactivated user or vice versa
   */
  toggleUser: (id) => api.patch(`/api/admin/users/${id}/toggle`),

  /**
   * POST /api/admin/reindex
   * Re-embeds ALL documents across the entire knowledge base.
   * Heavy operation — responds 202 immediately, runs async.
   */
  reindexAll: () => api.post("/api/admin/reindex"),

  /**
   * DELETE /api/admin/cache
   * Flushes the in-memory node-cache (query response cache).
   * Useful after bulk document changes.
   */
  clearCache: () => api.delete("/api/admin/cache"),

  /**
   * GET /api/admin/failed-queries
   * Returns queries where answered: false (hallucination guard activations)
   */
  getFailedQueries: (params = {}) => api.get("/api/admin/failed-queries", { params }),
};

// ══════════════════════════════════════════════════════════════════════════════
//  HEALTH CHECK
// ══════════════════════════════════════════════════════════════════════════════

/**
 * GET /health  (no auth required)
 * Returns: { status, service, version, database, uptime, memory, llmProvider }
 */
export const healthCheck = () => api.get("/health");

// ─── Default Export ───────────────────────────────────────────────────────────
export default api;

// ─── Re-exports from streamParser (keep imports DRY for consumers) ────────────
export { extractCitations, formatMessageWithCitations } from "./streamParser";
