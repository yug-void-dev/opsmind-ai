import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, BookOpen, ChevronDown, ChevronUp, Info, ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";

function SourceCard({ source, index, isExpanded, onToggle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl overflow-hidden transition-all shadow-sm mb-3"
      style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1.5px solid rgba(255,255,255,0.8)",
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left transition-all"
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,111,255,0.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            background: "rgba(124,111,255,0.1)",
            border: "1.5px solid rgba(124,111,255,0.15)",
          }}
        >
          <FileText size={16} className="text-[#7c6fff]" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate uppercase tracking-wider" style={{ color: "#2d2b55", fontFamily: "'Rajdhani', sans-serif" }}>
            {source.filename}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {source.page && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg uppercase tracking-widest"
                style={{ background: "rgba(124,111,255,0.08)", color: "#7c6fff", fontFamily: "'Rajdhani', sans-serif" }}
              >
                Page {source.page}
              </span>
            )}
            {source.section && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg uppercase tracking-widest"
                style={{ background: "rgba(52,212,224,0.08)", color: "#34d4e0", fontFamily: "'Rajdhani', sans-serif" }}
              >
                §{source.section}
              </span>
            )}
          </div>
        </div>

        <div style={{ color: "#9ca3af" }} className="mt-1">
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && source.snippet && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1">
              <div className="pl-4 py-2" style={{ borderLeft: "3px solid rgba(124,111,255,0.3)" }}>
                <p className="text-[12px] italic leading-relaxed font-medium" style={{ color: "#5a5880" }}>
                  "{source.snippet}"
                </p>
              </div>
              {source.score && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#9ca3af", fontFamily: "'Rajdhani', sans-serif" }}>Confidence</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-24 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(0,0,0,0.04)" }}
                    >
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${source.score * 100}%` }}
                        className="h-full rounded-full"
                        style={{
                          background: "linear-gradient(90deg,#7c6fff 0%,#34d4e0 100%)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: "#7c6fff" }}>
                      {Math.round(source.score * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SourcesPanel({ sources = [], activeCitation, onClose }) {
  const [expandedId, setExpandedId] = useState(null);

  // Sync expanded card with whichever citation was clicked from the chat
  useEffect(() => {
    if (activeCitation !== undefined && activeCitation !== null) {
      setExpandedId(activeCitation);
    }
  }, [activeCitation]);

  return (
    <motion.aside
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="w-80 h-full flex flex-col overflow-hidden rounded-[32px] relative flex-shrink-0"
      style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(24px)",
        border: "1.5px solid rgba(255,255,255,0.8)",
        boxShadow: "-8px 0 32px rgba(108,99,255,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 border-b"
        style={{ borderColor: "rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center gap-2.5">
          <BookOpen size={16} className="text-[#7c6fff]" />
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: "#2d2b55", fontFamily: "'Rajdhani', sans-serif" }}>Sources</span>
          {sources.length > 0 && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm"
              style={{
                background: "linear-gradient(135deg,#7c6fff,#34d4e0)",
                color: "white",
              }}
            >
              {sources.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl transition-colors hover:bg-rose-50 hover:text-rose-500"
          style={{ color: "#9ca3af" }}
        >
          <X size={15} strokeWidth={2.5} />
        </button>
      </div>

      {/* Educational Card */}
      <div className="p-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
             <ShieldCheck size={80} className="text-[#7c6fff]" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Info size={14} className="text-[#7c6fff]" />
            <h4 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7c6fff]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Why Sources?</h4>
          </div>
          <p className="text-[11px] leading-relaxed text-indigo-900/70 font-medium">
            Sources are the official documents (SOPs, manuals) the AI used to generate this answer. This ensures **zero hallucination** and total transparency.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar no-scrollbar">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center opacity-40">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FileText size={32} style={{ color: "#9ca3af" }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest px-8 leading-relaxed" style={{ color: "#5a5880", fontFamily: "'Rajdhani', sans-serif" }}>
              Sources will appear here after the AI responds
            </p>
          </div>
        ) : (
          sources.map((source, i) => (
            <SourceCard
              key={i}
              source={source}
              index={i}
              isExpanded={expandedId === i + 1}
              onToggle={() => setExpandedId(expandedId === i + 1 ? null : i + 1)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-5 border-t" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
        <p className="text-[10px] text-center leading-relaxed font-bold uppercase tracking-widest" style={{ color: "#9ca3af", fontFamily: "'Rajdhani', sans-serif" }}>
          Contextual AI Grounding · OpsMind RAG
        </p>
      </div>
    </motion.aside>
  );
}