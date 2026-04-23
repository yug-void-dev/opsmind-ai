<<<<<<< HEAD
import { useState, useCallback, useRef, useEffect } from "react";
import { streamQuery, chatsApi } from "../utils/api";
=======
import { useState, useCallback, useRef } from "react";
import { extractCitations, streamQuery as apiStreamQuery } from "../utils/api";

const STORAGE_KEY = "opsmind_chat_sessions";

function loadSessions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSessions(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
>>>>>>> d2edd9f1d4444e8172e5ae18061a76c26fd07a48

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useChat() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Refs for values needed in async callbacks without stale closures
  const abortRef = useRef(null);
  const activeSessionIdRef = useRef(null);
  const messagesRef = useRef([]);

  // Keep refs in sync with state
  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ── Session Management ───────────────────────────────────────────────────

  const refreshSessions = useCallback(async () => {
    try {
      const response = await chatsApi.list();
      setSessions(Array.isArray(response) ? response : []);
    } catch (err) {
      console.error("Failed to refresh sessions:", err);
    }
  }, []);

  // 1. Fetch sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await chatsApi.list();
        setSessions(Array.isArray(response) ? response : []);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
        setError("Could not load chat history.");
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  // 2. Load a specific session's messages
  const loadSession = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setActiveSessionId(sessionId);
      const response = await chatsApi.getById(sessionId);
      // Normalize messages from backend — add a client-side id for keying
      const normalized = (response.messages || []).map((m) => ({
        ...m,
        id: generateId(),
      }));
      setMessages(normalized);
    } catch (err) {
      console.error("Failed to load session:", err);
      setError("Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 3. Delete session
  const deleteSession = useCallback(
    async (sessionId) => {
      try {
        await chatsApi.delete(sessionId);
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
        if (activeSessionIdRef.current === sessionId) {
          setActiveSessionId(null);
          setMessages([]);
        }
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    },
    []
  );

  // 4. Clear current chat (start new chat without clearing history)
  const clearChat = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ── Messaging Logic ─────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text) => {
      if (!text?.trim() || isStreaming) return;
      setError(null);

      const userMsgId = generateId();
      const assistantMsgId = generateId();

      const userMsg = {
        id: userMsgId,
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      const assistantMsg = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        sources: [],
        isStreaming: true,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      // These are captured in closures for the SSE callbacks
      let fullAnswer = "";
      let finalSources = [];
      let wasAnswered = true;

<<<<<<< HEAD
      const abort = streamQuery(
        text.trim(),
        {},
        {
          onMetadata: (meta) => {
            if (meta.answered !== undefined) {
              wasAnswered = meta.answered;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, answered: meta.answered } : m
                )
              );
            }
          },

          onSources: (sources) => {
            finalSources = sources;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, sources } : m
              )
            );
          },

          onChunk: (token) => {
            fullAnswer += token;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: fullAnswer } : m
              )
            );
          },

          onDone: async (data) => {
            if (data?.answered !== undefined) wasAnswered = data.answered;

            // Use the authoritative sources from the done event (backend may have cleared them
            // if the LLM said "I don't know" after generation)
            const authoritativeSources = data?.sources ?? finalSources;
            wasAnswered = data?.answered ?? wasAnswered;

            // 1. Finalize message state
            const finalAssistantMsg = {
              id: assistantMsgId,
              role: "assistant",
              content: fullAnswer || data?.answer || "",
              sources: authoritativeSources,
              answered: wasAnswered,
              isStreaming: false,
              timestamp: new Date().toISOString(),
            };

            setIsStreaming(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId ? finalAssistantMsg : m
              )
            );

            // 2. Persist to backend using current ref values (avoids stale closure)
            const currentSessionId = activeSessionIdRef.current;
            const currentMessages = messagesRef.current;

            const allMessages = currentMessages.map((m) => {
              const resolved = m.id === assistantMsgId ? finalAssistantMsg : m;
              return {
                role: resolved.role,
                content: resolved.content || "",
                sources: (resolved.sources || []).map((s) => ({
                  documentId: s.documentId ? String(s.documentId) : undefined,
                  filename: s.filename || s.documentName || "",
                  page: s.page || s.pageNumber || null,
                  score: s.score || s.relevanceScore || null,
                  snippet: s.snippet || "",
                })),
                answered: resolved.answered !== false,
              };
            });

            try {
              const payload = {
                _id: currentSessionId || undefined,
                title: currentSessionId
                  ? undefined
                  : text.trim().slice(0, 60) + (text.trim().length > 60 ? "..." : ""),
                messages: allMessages,
              };

              const saveRes = await chatsApi.save(payload);

              if (saveRes?._id) {
                if (!currentSessionId) {
                  setActiveSessionId(saveRes._id);
                }
                // Always refresh session list after save
                refreshSessions();
              }
            } catch (err) {
              console.error("[useChat] Failed to persist chat:", err);
            }
          },

          onError: (msg) => {
            const errMsg = msg || "Streaming interrupted. Please retry.";
            setError(errMsg);
            setIsStreaming(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: errMsg, isError: true, isStreaming: false }
                  : m
              )
            );
          },
        }
      );

      abortRef.current = abort;
=======
        let accumulated = "";

        const abort = apiStreamQuery(
          text,
          {},
          {
            onMetadata: (event) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, answered: event.answered ?? true }
                    : m
                )
              );
            },
            onSources: (sources) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id ? { ...m, sources } : m
                )
              );
            },
            onChunk: (content) => {
              accumulated += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? {
                        ...m,
                        content: accumulated,
                        citations: extractCitations(accumulated),
                      }
                    : m
                )
              );
            },
            onDone: (event) => {
              setMessages((prev) => {
                const finalMsgs = prev.map((m) =>
                  m.id === assistantMsg.id
                    ? {
                        ...m,
                        isStreaming: false,
                        answered: event.answered ?? true,
                      }
                    : m
                );
                persistMessages(sessionId, finalMsgs);
                return finalMsgs;
              });
              setIsStreaming(false);
            },
            onError: (msg) => {
              setError(msg);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: msg, isError: true, isStreaming: false }
                    : m
                )
              );
              setIsStreaming(false);
            },
          }
        );

        // Store abort so stopStreaming() can cancel mid-stream
        abortRef.current = { abort };
      } catch (err) {
        if (err.name === "AbortError") return;

        const errMsg = err.message || "Something went wrong. Please try again.";
        setError(errMsg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: errMsg, isError: true, isStreaming: false }
              : m
          )
        );
        setIsStreaming(false);
      }
>>>>>>> d2edd9f1d4444e8172e5ae18061a76c26fd07a48
    },
    [isStreaming, refreshSessions]
  );

  const stopStreaming = useCallback(() => {
<<<<<<< HEAD
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
=======
    if (abortRef.current?.abort) abortRef.current.abort();
>>>>>>> d2edd9f1d4444e8172e5ae18061a76c26fd07a48
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  }, []);

  return {
    sessions,
    activeSessionId,
    messages,
    isStreaming,
    error,
    loading,
    sendMessage,
    stopStreaming,
    loadSession,
    deleteSession,
    clearChat,
    clearError,
    refreshSessions,
  };
}