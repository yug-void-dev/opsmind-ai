import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square } from "lucide-react";

export default function ChatInput({ onSend, onStop, isStreaming, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [value]);

  const handleSubmit = () => {
    if (isStreaming) { onStop(); return; }
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const canSend = value.trim().length > 0 || isStreaming;

  return (
    <div className="px-4 pb-5 pt-3">
      <div
        className="relative flex items-end gap-2 rounded-2xl transition-all duration-200"
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: canSend
            ? "1px solid rgba(139,92,246,0.45)"
            : "1px solid rgba(255,255,255,0.08)",
          boxShadow: canSend
            ? "0 0 0 3px rgba(139,92,246,0.08), 0 8px 32px rgba(0,0,0,0.3)"
            : "0 4px 24px rgba(0,0,0,0.2)",
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your SOPs…"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm px-4 py-3.5 outline-none max-h-[180px] leading-relaxed custom-scrollbar"
          style={{ color: "rgba(255,255,255,0.85)", caretColor: "rgba(139,92,246,0.9)" }}
        />

        <div className="flex items-center gap-1 pr-2 pb-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleSubmit}
            disabled={!canSend}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={
              isStreaming
                ? {
                    background: "linear-gradient(135deg,rgba(239,68,68,0.7) 0%,rgba(220,38,38,0.65) 100%)",
                    border: "1px solid rgba(239,68,68,0.4)",
                    color: "#fff",
                  }
                : canSend
                ? {
                    background: "linear-gradient(135deg,rgba(139,92,246,0.8) 0%,rgba(99,102,241,0.75) 100%)",
                    border: "1px solid rgba(139,92,246,0.5)",
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.2)",
                    cursor: "not-allowed",
                  }
            }
          >
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div key="stop" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                  <Square size={13} fill="currentColor" />
                </motion.div>
              ) : (
                <motion.div key="send" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                  <Send size={13} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      <p className="text-center text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.18)" }}>
        Press <kbd className="font-mono" style={{ color: "rgba(255,255,255,0.28)" }}>Enter</kbd> to send ·{" "}
        <kbd className="font-mono" style={{ color: "rgba(255,255,255,0.28)" }}>Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}