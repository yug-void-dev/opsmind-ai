import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

function SourceCard({ source, index, isExpanded, onToggle }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 text-left transition-all"
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            background: "linear-gradient(135deg,rgba(139,92,246,0.25) 0%,rgba(99,102,241,0.2) 100%)",
            border: "1px solid rgba(139,92,246,0.22)",
          }}
        >
          <FileText size={14} className="text-violet-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "rgba(255,255,255,0.8)" }}>
            {source.filename}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {source.page && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}
              >
                Page {source.page}
              </span>
            )}
            {source.section && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}
              >
                §{source.section}
              </span>
            )}
          </div>
        </div>

        <div style={{ color: "rgba(255,255,255,0.25)" }}>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && source.snippet && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              <div className="pl-3" style={{ borderLeft: "2px solid rgba(139,92,246,0.4)" }}>
                <p className="text-[11px] italic leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {source.snippet}
                </p>
              </div>
              {source.score && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>Relevance</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-20 h-1 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${source.score * 100}%`,
                          background: "linear-gradient(90deg,rgba(139,92,246,0.8) 0%,rgba(99,102,241,0.7) 100%)",
                        }}
                      />
                    </div>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
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
  const [expandedId, setExpandedId] = useState(activeCitation);

  return (
    <motion.aside
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-72 h-full flex flex-col border-l flex-shrink-0"
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
        <div className="flex items-center gap-2">
          <BookOpen size={15} className="text-violet-400" />
          <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>Sources</span>
          {sources.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: "rgba(139,92,246,0.18)",
                border: "1px solid rgba(139,92,246,0.28)",
                color: "rgba(196,181,253,0.9)",
              }}
            >
              {sources.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.3)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {sources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <FileText size={28} className="mb-3" style={{ color: "rgba(255,255,255,0.12)" }} />
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
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
      <div className="p-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-[10px] text-center leading-relaxed" style={{ color: "rgba(255,255,255,0.18)" }}>
          Sources retrieved via semantic search from your SOP documents.
        </p>
      </div>
    </motion.aside>
  );
}