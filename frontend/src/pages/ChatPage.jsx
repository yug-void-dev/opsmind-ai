import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, BookOpen, Sparkles, Settings, AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import SourcesPanel from "../components/chat/SourcesPanel";
import { useChat } from "../hooks/useChat";

const STARTER_PROMPTS = [
  { icon: "📋", text: "How do I process a customer refund?" },
  { icon: "🔒", text: "What is the data security policy for remote work?" },
  { icon: "🧾", text: "Walk me through the employee onboarding checklist." },
  { icon: "🚨", text: "What are the incident response procedures?" },
];

function EmptyState({ onPrompt }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full px-8 text-center"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-3xl bg-violet-500/25 blur-2xl scale-150" />
        <div
          className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg,rgba(139,92,246,0.35) 0%,rgba(59,130,246,0.25) 100%)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <Brain size={34} className="text-violet-300" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">OpsMind AI</h2>
      <p className="text-sm max-w-sm leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.42)" }}>
        Your context-aware corporate knowledge brain. Ask anything — I'll cite the exact SOP source.
      </p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {STARTER_PROMPTS.map((p, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPrompt(p.text)}
            className="flex items-start gap-2.5 p-3.5 rounded-xl text-left text-xs transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(139,92,246,0.14)";
              e.currentTarget.style.border = "1px solid rgba(139,92,246,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)";
            }}
          >
            <span className="text-base">{p.icon}</span>
            <span className="leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{p.text}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

export default function ChatPage() {
  const navigate = useNavigate();
  const { sessions, activeSessionId, messages, isStreaming, error, sendMessage, stopStreaming, loadSession, deleteSession, clearChat } = useChat();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [activeSources, setActiveSources] = useState([]);
  const [activeCitation, setActiveCitation] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant" && m.sources?.length > 0);
    if (last?.sources) { setActiveSources(last.sources); setShowSources(true); }
  }, [messages]);

  const handleCitationClick = (n, source) => {
    if (source) setActiveSources((p) => p.find((s) => s.filename === source.filename) ? p : [...p, source]);
    setActiveCitation(n);
    setShowSources(true);
  };

  const handleNewChat = () => { clearChat(); setActiveSources([]); setShowSources(false); };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg,#0f0c29 0%,#1a1040 25%,#0d1b3e 55%,#0a192f 80%,#0f0c29 100%)" }}
    >
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle,rgba(139,92,246,0.18) 0%,transparent 70%)" }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle,rgba(59,130,246,0.14) 0%,transparent 70%)" }} />
        <div className="absolute top-[40%] left-[35%] w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle,rgba(99,102,241,0.08) 0%,transparent 70%)" }} />
      </div>

      <div className="relative z-10 flex w-full h-full">
        <ChatSidebar sessions={sessions} activeSessionId={activeSessionId} onNewChat={handleNewChat} onLoadSession={loadSession} onDeleteSession={deleteSession} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((v) => !v)} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-violet-400" />
              <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
                {activeSessionId ? sessions.find((s) => s.id === activeSessionId)?.title || "New Chat" : "New Chat"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSources((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={showSources
                  ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "rgba(196,181,253,1)" }
                  : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
              >
                <BookOpen size={13} />Sources
                {activeSources.length > 0 && <span className="ml-0.5 w-4 h-4 bg-violet-600 rounded-full text-[9px] flex items-center justify-center text-white">{activeSources.length}</span>}
              </button>
              <button onClick={() => navigate("/admin/settings")} className="p-2 rounded-lg" style={{ color: "rgba(255,255,255,0.3)" }}>
                <Settings size={15} />
              </button>
            </div>
          </header>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="flex items-center gap-2.5 px-5 py-2.5 text-red-400 text-xs border-b"
                style={{ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.18)", backdropFilter: "blur(12px)" }}
              >
                <AlertTriangle size={13} /><span className="flex-1">{error}</span>
                <button><X size={13} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 custom-scrollbar">
            {messages.length === 0 ? (
              <EmptyState onPrompt={(text) => sendMessage(text)} />
            ) : (
              <>{messages.map((msg) => <ChatMessage key={msg.id} message={msg} onCitationClick={handleCitationClick} />)}<div ref={messagesEndRef} /></>
            )}
          </div>

          <ChatInput onSend={sendMessage} onStop={stopStreaming} isStreaming={isStreaming} disabled={false} />
        </div>

        <AnimatePresence>
          {showSources && <SourcesPanel sources={activeSources} activeCitation={activeCitation} onClose={() => setShowSources(false)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}