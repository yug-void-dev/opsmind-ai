import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Trash2, Brain, ChevronRight, Search, LogOut } from "lucide-react";
import useAuth from "../../hooks/useAuth";

export default function ChatSidebar({ sessions = [], activeSessionId, onNewChat, onLoadSession, onDeleteSession, collapsed, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  // Force-collapse on small screens using matchMedia (fires reliably at exact breakpoint)
  const [isMobileSize, setIsMobileSize] = useState(
    typeof window !== "undefined" && window.innerWidth < 900
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const handler = (e) => setIsMobileSize(e.matches);
    mq.addEventListener("change", handler);
    setIsMobileSize(mq.matches); // sync immediately on mount
    return () => mq.removeEventListener("change", handler);
  }, []);

  // On mobile (<900px): always icon-only collapsed.
  // On desktop (>900px): follow the user's toggle state.
  const eff = isMobileSize ? true : collapsed;

  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const filtered = safeSessions.filter((s) => s.title?.toLowerCase().includes(searchQuery.toLowerCase()));

  const grouped = filtered.reduce((acc, session) => {
    if (!session || !session._id) return acc;
    const dateStr = session.updatedAt || session.createdAt || new Date();
    const date = new Date(dateStr);
    const timestamp = isNaN(date.getTime()) ? Date.now() : date.getTime();
    const diff = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    const group = diff < 1 ? "Today" : diff < 7 ? "This Week" : "Older";
    if (!acc[group]) acc[group] = [];
    acc[group].push(session);
    return acc;
  }, {});

  return (
    <div className="relative h-full flex-shrink-0">
      <motion.aside
        animate={{ width: eff ? 72 : 260 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="h-full flex flex-col overflow-hidden rounded-3xl relative"
        style={{
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(24px)",
          border: "1.5px solid rgba(255,255,255,0.8)",
          boxShadow: "0 8px 32px rgba(108,99,255,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center px-4 flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            minHeight: eff ? 64 : 88,
            paddingTop: eff ? "0.75rem" : "2rem",
            paddingBottom: eff ? "0.75rem" : "1.5rem",
            justifyContent: eff ? "center" : "flex-start",
          }}
        >
          <motion.div
            className="flex items-center gap-2.5 flex-1 min-w-0"
            style={{ justifyContent: eff ? "center" : "flex-start" }}
          >
            <motion.div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7c6fff,#34d4e0)", boxShadow: "0 4px 12px rgba(124,111,255,0.25)" }}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Brain size={16} className="text-white" />
            </motion.div>
            <AnimatePresence initial={false}>
              {!eff && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <p className="font-bold text-sm leading-tight" style={{ fontFamily: "'Rajdhani',sans-serif", color: "#2d2b55", letterSpacing: "0.05em" }}>OpsMind AI</p>
                  <p className="text-xs" style={{ color: "#5a5880" }}>Chat Assistant</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={onNewChat}
            className={`w-full flex items-center gap-2.5 rounded-xl py-2.5 text-sm font-bold transition-all text-white ${eff ? "justify-center px-2" : "px-3"}`}
            style={{
              background: "linear-gradient(135deg,#7c6fff 0%,#34d4e0 100%)",
              boxShadow: "0 4px 12px rgba(124,111,255,0.25)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 20px rgba(124,111,255,0.35)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(124,111,255,0.25)"; }}
          >
            <Plus size={16} strokeWidth={2.5} />
            {!eff && <span>New Chat</span>}
          </button>
        </div>

        {/* Search — only in expanded mode */}
        {!eff && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 pb-2">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{
                background: "rgba(255,255,255,0.5)",
                border: "1.5px solid rgba(124,111,255,0.1)",
              }}
            >
              <Search size={13} style={{ color: "#3d3b56" }} />
              <input
                type="text"
                placeholder="Search chats…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs outline-none w-full"
                style={{ color: "#2d2b55" }}
              />
            </div>
          </motion.div>
        )}

        {/* Session List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-4 no-scrollbar">
          {/* Expanded: show full session titles grouped by date */}
          {!eff && safeSessions.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center opacity-30 px-6">
              <MessageSquare size={32} className="mb-3" />
              <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">No recent chats yet</p>
            </div>
          )}

          {!eff && Object.entries(grouped).map(([group, groupSessions]) => (
            <div key={group} className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] px-3 mb-1 pt-2" style={{ color: "#9ca3af", fontFamily: "'Rajdhani', sans-serif" }}>{group}</p>
              <AnimatePresence>
                {groupSessions.map((session) => (
                  <motion.div
                    key={session._id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="relative group/item"
                    onMouseEnter={() => setHoveredId(session._id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <button
                      onClick={() => onLoadSession(session._id)}
                      className="w-full text-left flex items-start gap-2.5 rounded-xl px-3 py-2.5 mb-1 transition-all text-[13px] font-medium"
                      style={
                        activeSessionId === session._id
                          ? { background: "rgba(124,111,255,0.08)", border: "1px solid rgba(124,111,255,0.15)", color: "#6c63ff", boxShadow: "0 4px 12px rgba(124,111,255,0.08)" }
                          : { background: "transparent", border: "1px solid transparent", color: "#5a5880" }
                      }
                    >
                      <MessageSquare size={14} className={`mt-0.5 shrink-0 ${activeSessionId === session._id ? "text-[#7c6fff]" : "opacity-40"}`} />
                      <span className="truncate leading-relaxed flex-1">{session.title}</span>
                    </button>
                    {hoveredId === session._id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteSession(session._id); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all opacity-0 group-hover/item:opacity-100"
                        style={{ color: "#9ca3af" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "#f472b6"; e.currentTarget.style.background = "rgba(244,114,182,0.1)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.background = "transparent"; }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ))}

          {/* Collapsed: show icon-only session buttons */}
          {eff && (
            <div className="flex flex-col items-center gap-2 pt-4">
              {safeSessions.slice(0, 8).map((session) => (
                <button
                  key={session._id}
                  onClick={() => onLoadSession(session._id)}
                  title={session.title}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm"
                  style={
                    activeSessionId === session._id
                      ? { background: "rgba(124,111,255,0.15)", color: "#7c6fff", border: "1px solid rgba(124,111,255,0.2)" }
                      : { background: "rgba(255,255,255,0.6)", color: "#9ca3af", border: "1px solid rgba(0,0,0,0.03)" }
                  }
                >
                  <MessageSquare size={16} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Logout Footer */}
        <div className="flex-shrink-0 px-2 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          <AnimatePresence initial={false}>
            {!eff && (
              <motion.div
                key="user-name"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-3 pb-2"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest truncate" style={{ color: "#9ca3af", fontFamily: "'Rajdhani', sans-serif" }}>
                  {user?.name || user?.email || "User"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            onClick={() => logout()}
            whileHover={{ x: eff ? 0 : 4, backgroundColor: "rgba(244,114,182,0.08)" }}
            whileTap={{ scale: 0.97 }}
            className="w-full h-11 flex items-center gap-3 px-3 rounded-xl transition-all duration-200"
            style={{ color: "#f472b6", justifyContent: eff ? "center" : "flex-start" }}
            title="Log out"
          >
            <LogOut size={18} className="flex-shrink-0" />
            <AnimatePresence initial={false}>
              {!eff && (
                <motion.span
                  key="logout-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-semibold whitespace-nowrap overflow-hidden"
                >
                  Log out
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.aside>

      {/* Collapse toggle button — only shown on desktop (>900px) */}
      {!isMobileSize && (
        <motion.button
          onClick={onToggleCollapse}
          whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,1)", boxShadow: "0 8px 24px rgba(108,99,255,0.2)" }}
          whileTap={{ scale: 0.9 }}
          className="absolute -right-4 top-10 w-8 h-8 rounded-full flex items-center justify-center z-50"
          style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(8px)",
            border: "1.5px solid rgba(108,99,255,0.2)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            color: "#7c6fff",
          }}
        >
          <motion.div animate={{ rotate: eff ? 0 : 180 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <ChevronRight size={18} strokeWidth={2.5} />
          </motion.div>
        </motion.button>
      )}
    </div>
  );
}
