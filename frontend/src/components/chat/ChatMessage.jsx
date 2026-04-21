import { motion } from "framer-motion";
import { User, Bot, AlertCircle, ExternalLink } from "lucide-react";
import { formatMessageWithCitations, extractCitations } from "../../utils/streamParser";

function StreamingCursor() {
  return (
    <motion.span
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
      className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 align-middle"
    />
  );
}

function CitationBadge({ number, onClick }) {
  return (
    <button
      onClick={() => onClick(number)}
      className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full mx-0.5 align-middle transition-all"
      style={{
        background: "rgba(139,92,246,0.2)",
        border: "1px solid rgba(139,92,246,0.4)",
        color: "rgba(196,181,253,1)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(139,92,246,0.4)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(139,92,246,0.2)"; }}
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
          if (chunk.startsWith("**") && chunk.endsWith("**")) return <strong key={j} className="font-semibold text-white">{chunk.slice(2, -2)}</strong>;
          if (chunk.startsWith("*") && chunk.endsWith("*")) return <em key={j} className="italic" style={{ color: "rgba(255,255,255,0.75)" }}>{chunk.slice(1, -1)}</em>;
          return chunk;
        })}
      </span>
    );
  });
}

export default function ChatMessage({ message, onCitationClick }) {
  const isUser = message.role === "user";
  const isError = message.isError;
  const displayText = isUser ? message.content : formatMessageWithCitations(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} group`}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-1"
        style={
          isUser
            ? {
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.12)",
              }
            : isError
            ? {
                background: "rgba(239,68,68,0.1)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(239,68,68,0.2)",
              }
            : {
                background: "linear-gradient(135deg,rgba(139,92,246,0.3) 0%,rgba(99,102,241,0.25) 100%)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(139,92,246,0.25)",
              }
        }
      >
        {isUser ? (
          <User size={15} style={{ color: "rgba(255,255,255,0.65)" }} />
        ) : isError ? (
          <AlertCircle size={15} className="text-red-400" />
        ) : (
          <Bot size={15} className="text-violet-300" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
          style={
            isUser
              ? {
                  background: "linear-gradient(135deg,rgba(139,92,246,0.55) 0%,rgba(99,102,241,0.5) 100%)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(139,92,246,0.35)",
                  borderTopRightRadius: "4px",
                  color: "rgba(255,255,255,0.92)",
                  boxShadow: "0 4px 24px rgba(139,92,246,0.15)",
                }
              : isError
              ? {
                  background: "rgba(239,68,68,0.08)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(239,68,68,0.18)",
                  borderTopLeftRadius: "4px",
                  color: "rgba(252,165,165,0.9)",
                }
              : {
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderTopLeftRadius: "4px",
                  color: "rgba(255,255,255,0.8)",
                }
          }
        >
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div>
              {message.content ? (
                <p className="whitespace-pre-wrap">
                  {renderContent(displayText, onCitationClick)}
                  {message.isStreaming && <StreamingCursor />}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay }}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "rgba(139,92,246,0.7)" }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source chips */}
        {!isUser && message.sources?.length > 0 && !message.isStreaming && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-1.5 px-1">
            {message.sources.map((source, i) => (
              <button
                key={i}
                onClick={() => onCitationClick(i + 1, source)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.45)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(139,92,246,0.12)";
                  e.currentTarget.style.border = "1px solid rgba(139,92,246,0.28)";
                  e.currentTarget.style.color = "rgba(196,181,253,0.9)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.border = "1px solid rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                }}
              >
                <ExternalLink size={10} />
                <span className="truncate max-w-[160px]">{source.filename}</span>
                {source.page && <span style={{ color: "rgba(255,255,255,0.25)" }}>p.{source.page}</span>}
              </button>
            ))}
          </motion.div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] px-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "rgba(255,255,255,0.2)" }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}