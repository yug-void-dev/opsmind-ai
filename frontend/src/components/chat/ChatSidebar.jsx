import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Trash2, Brain, ChevronLeft, ChevronRight, Search } from "lucide-react";

export default function ChatSidebar({ sessions = [], activeSessionId, onNewChat, onLoadSession, onDeleteSession, collapsed, onToggleCollapse }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  const filtered = sessions.filter((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const grouped = filtered.reduce((acc, session) => {
    const diff = (Date.now() - new Date(session.createdAt)) / (1000 * 60 * 60 * 24);
    const group = diff < 1 ? "Today" : diff < 7 ? "This Week" : "Older";
    if (!acc[group]) acc[group] = [];
    acc[group].push(session);
    return acc;
  }, {});

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 260 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="h-full flex flex-col border-r overflow-hidden relative flex-shrink-0"
      style={{
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg,rgba(139,92,246,0.7) 0%,rgba(99,102,241,0.7) 100%)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <Brain size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-wide" style={{ color: "rgba(255,255,255,0.85)" }}>OpsMind AI</span>
          </motion.div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg transition-colors ml-auto"
          style={{ color: "rgba(255,255,255,0.35)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* New Chat */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-2.5 rounded-xl py-2.5 px-3 text-sm font-medium transition-all text-white ${collapsed ? "justify-center px-0" : ""}`}
          style={{
            background: "linear-gradient(135deg,rgba(139,92,246,0.7) 0%,rgba(99,102,241,0.65) 100%)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(139,92,246,0.4)",
            boxShadow: "0 4px 16px rgba(139,92,246,0.2)",
          }}
        >
          <Plus size={16} />
          {!collapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 pb-2">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <Search size={13} style={{ color: "rgba(255,255,255,0.25)" }} />
            <input
              type="text"
              placeholder="Search chats…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs outline-none w-full"
              style={{ color: "rgba(255,255,255,0.65)", "::placeholder": { color: "rgba(255,255,255,0.2)" } }}
            />
          </div>
        </motion.div>
      )}

      {/* Session list */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 custom-scrollbar">
        {!collapsed && Object.entries(grouped).map(([group, groupSessions]) => (
          <div key={group} className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-1 pt-2" style={{ color: "rgba(255,255,255,0.2)" }}>{group}</p>
            <AnimatePresence>
              {groupSessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="relative"
                  onMouseEnter={() => setHoveredId(session.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    onClick={() => onLoadSession(session.id)}
                    className="w-full text-left flex items-start gap-2.5 rounded-lg px-3 py-2.5 mb-0.5 transition-all text-xs"
                    style={
                      activeSessionId === session.id
                        ? {
                            background: "rgba(139,92,246,0.18)",
                            border: "1px solid rgba(139,92,246,0.28)",
                            color: "rgba(196,181,253,1)",
                            backdropFilter: "blur(8px)",
                          }
                        : {
                            background: "transparent",
                            border: "1px solid transparent",
                            color: "rgba(255,255,255,0.4)",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (activeSessionId !== session.id) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                        e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeSessionId !== session.id) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                      }
                    }}
                  >
                    <MessageSquare size={13} className="mt-0.5 shrink-0 opacity-70" />
                    <span className="truncate leading-relaxed">{session.title}</span>
                  </button>
                  {hoveredId === session.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(248,113,113,0.9)"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.25)"; e.currentTarget.style.background = "transparent"; }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}

        {collapsed && (
          <div className="flex flex-col items-center gap-1 pt-2">
            {sessions.slice(0, 8).map((session) => (
              <button
                key={session.id}
                onClick={() => onLoadSession(session.id)}
                title={session.title}
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                style={
                  activeSessionId === session.id
                    ? { background: "rgba(139,92,246,0.25)", color: "rgba(196,181,253,1)" }
                    : { color: "rgba(255,255,255,0.25)" }
                }
              >
                <MessageSquare size={14} />
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  );
}