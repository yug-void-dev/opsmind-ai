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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useChat() {
  const [sessions, setSessions] = useState(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // ── Session helpers ──────────────────────────────────────────────────────
  const createSession = useCallback((firstMessage) => {
    const id = generateId();
    const title =
      firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "…" : "");
    const session = { id, title, createdAt: new Date().toISOString(), messageCount: 0 };
    setSessions((prev) => {
      const updated = [session, ...prev];
      saveSessions(updated);
      return updated;
    });
    return id;
  }, []);

  const loadSession = useCallback(
    (sessionId) => {
      setActiveSessionId(sessionId);
      const stored = loadSessions();
      const session = stored.find((s) => s.id === sessionId);
      setMessages(session?.messages || []);
    },
    []
  );

  const deleteSession = useCallback((sessionId) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
    }
  }, [activeSessionId]);

  const persistMessages = useCallback((sessionId, msgs) => {
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === sessionId
          ? { ...s, messages: msgs, messageCount: msgs.length }
          : s
      );
      saveSessions(updated);
      return updated;
    });
  }, []);

  // ── Sending a message ────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text) => {
      if (!text.trim() || isStreaming) return;
      setError(null);

      let sessionId = activeSessionId;
      if (!sessionId) {
        sessionId = createSession(text);
        setActiveSessionId(sessionId);
      }

      const userMsg = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };

      const assistantMsg = {
        id: generateId(),
        role: "assistant",
        content: "",
        citations: [],
        isStreaming: true,
        timestamp: new Date().toISOString(),
      };

      const nextMessages = [...messages, userMsg, assistantMsg];
      setMessages(nextMessages);
      setIsStreaming(true);

      try {
        abortRef.current = new AbortController();

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
    },
    [activeSessionId, createSession, isStreaming, messages, persistMessages]
  );

  const stopStreaming = useCallback(() => {
    if (abortRef.current?.abort) abortRef.current.abort();
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setActiveSessionId(null);
    setError(null);
  }, []);

  return {
    sessions,
    activeSessionId,
    messages,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    loadSession,
    deleteSession,
    clearChat,
    createSession,
    setActiveSessionId,
  };
}