import { motion } from "framer-motion";
import { User, Bot, AlertCircle, ExternalLink } from "lucide-react";
import { formatMessageWithCitations, extractCitations } from "../../utils/streamParser";

function StreamingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
      className="inline-block w-0.5 h-4 bg-[#7c6fff] ml-0.5 align-middle"
    />
  );
}

function CitationBadge({ number, onClick }) {
  return (
    <button
      onClick={() => onClick(number)}
      className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full mx-0.5 align-middle transition-all"
      style={{
        background: "rgba(124,111,255,0.15)",
        border: "1px solid rgba(124,111,255,0.3)",
        color: "#7c6fff",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,111,255,0.3)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(124,111,255,0.15)"; }}
    >
      {number}
    </button>
  );
}

function renderContent(text, onCitationClick) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (match) return <CitationBadge key={i} number={parseInt(match[1])} onClick={onCitationClick} />;
    return (
      <span key={i}>
        {part.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((chunk, j) => {
          if (chunk.startsWith("**") && chunk.endsWith("**")) return <strong key={j} className="font-bold" style={{ color: "#2d2b55" }}>{chunk.slice(2, -2)}</strong>;
          if (chunk.startsWith("*") && chunk.endsWith("*")) return <em key={j} className="italic" style={{ color: "#5a5880" }}>{chunk.slice(1, -1)}</em>;
          return chunk;
        })}
      </span>
    );
  });
}

export default function ChatMessage({ message, onCitationClick }) {
  const isUser = message.role === "user";
  const isError = message.isError;
  const isHallucinationBlocked = message.answered === false;
  const displayText = isUser ? message.content : formatMessageWithCitations(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"} group w-full`}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-2xl flex-shrink-0 flex items-center justify-center mt-1 shadow-sm"
        style={
          isUser
            ? {
                background: "rgba(255,255,255,0.8)",
                border: "1.5px solid rgba(0,0,0,0.04)",
              }
            : isHallucinationBlocked
            ? {
                background: "rgba(245,158,11,0.15)",
                border: "1.5px solid rgba(245,158,11,0.25)",
              }
            : isError
            ? {
                background: "rgba(239,68,68,0.1)",
                border: "1.5px solid rgba(239,68,68,0.2)",
              }
            : {
                background: "linear-gradient(135deg,#7c6fff,#34d4e0)",
                border: "1px solid rgba(255,255,255,0.2)",
              }
        }
      >
        {isUser ? (
          <User size={16} style={{ color: "#5a5880" }} />
        ) : isHallucinationBlocked ? (
          <AlertCircle size={16} className="text-amber-500" />
        ) : isError ? (
          <AlertCircle size={16} className="text-rose-500" />
        ) : (
          <Bot size={16} className="text-white" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <div
          className="rounded-3xl px-5 py-3.5 text-sm leading-relaxed shadow-sm"
          style={
            isUser
              ? {
                  background: "linear-gradient(135deg,#7c6fff 0%,#6366f1 100%)",
                  border: "1.5px solid rgba(124,111,255,0.2)",
                  borderTopRightRadius: "6px",
                  color: "#fff",
                  boxShadow: "0 4px 16px rgba(124,111,255,0.2)",
                }
              : isHallucinationBlocked
              ? {
                  background: "rgba(245,158,11,0.08)",
                  backdropFilter: "blur(20px)",
                  border: "1.5px solid rgba(245,158,11,0.22)",
                  borderTopLeftRadius: "6px",
                  color: "#92400e",
                }
              : isError
              ? {
                  background: "rgba(239,68,68,0.08)",
                  backdropFilter: "blur(20px)",
                  border: "1.5px solid rgba(239,68,68,0.18)",
                  borderTopLeftRadius: "6px",
                  color: "#991b1b",
                }
              : {
                  background: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1.5px solid rgba(255,255,255,0.8)",
                  borderTopLeftRadius: "6px",
                  color: "#2d2b55",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                }
          }
        >
          {isUser ? (
            <p className="font-medium">{message.content}</p>
          ) : (
            <div>
              {isHallucinationBlocked && (
                <div className="flex items-center gap-1.5 mb-2 opacity-70">
                  <AlertCircle size={12} className="text-amber-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Security Guard</span>
                </div>
              )}
              {isError ? (
                <div className="flex items-start gap-2 py-1 text-rose-600 font-medium">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <p>{message.content || "An error occurred. Please try again."}</p>
                </div>
              ) : message.content ? (
                <div className="space-y-1 whitespace-pre-wrap">
                  {renderContent(displayText, onCitationClick)}
                  {message.isStreaming && <StreamingCursor />}
                </div>
              ) : (
                <div className="flex items-center gap-2 py-1">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay }}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "#7c6fff" }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source chips */}
        {!isUser && message.sources?.length > 0 && !message.isStreaming && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 px-1">
            {message.sources.map((source, i) => (
              <button
                key={i}
                onClick={() => onCitationClick(i + 1, source, message.sources)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-sm"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  border: "1.5px solid rgba(124,111,255,0.1)",
                  color: "#5a5880",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(124,111,255,0.1)";
                  e.currentTarget.style.borderColor = "rgba(124,111,255,0.3)";
                  e.currentTarget.style.color = "#7c6fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.8)";
                  e.currentTarget.style.borderColor = "rgba(124,111,255,0.1)";
                  e.currentTarget.style.color = "#5a5880";
                }}
              >
                <ExternalLink size={10} />
                <span className="truncate max-w-[140px] uppercase tracking-wider" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{source.filename}</span>
                {source.page && <span className="opacity-40">p.{source.page}</span>}
              </button>
            ))}
          </motion.div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] font-bold px-2 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider" style={{ color: "#9ca3af", fontFamily: "'Rajdhani', sans-serif" }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}