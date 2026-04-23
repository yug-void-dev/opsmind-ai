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
    <div className="px-4 pb-6 pt-2">
      <div
        className="relative flex items-end gap-2 rounded-2xl transition-all duration-300"
        style={{
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: canSend
            ? "1.5px solid rgba(124,111,255,0.4)"
            : "1.5px solid rgba(255,255,255,0.8)",
          boxShadow: canSend
            ? "0 8px 32px rgba(124,111,255,0.12)"
            : "0 4px 16px rgba(0,0,0,0.02)",
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
          className="flex-1 resize-none bg-transparent text-sm px-5 py-4 outline-none max-h-[180px] leading-relaxed custom-scrollbar font-medium"
          style={{ color: "#2d2b55", caretColor: "#7c6fff" }}
        />

        <div className="flex items-center gap-2 pr-3 pb-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={canSend ? { scale: 1.05 } : {}}
            onClick={handleSubmit}
            disabled={!canSend}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md"
            style={
              isStreaming
                ? {
                    background: "linear-gradient(135deg,#f472b6 0%,#e11d48 100%)",
                    color: "#fff",
                  }
                : canSend
                ? {
                    background: "linear-gradient(135deg,#7c6fff 0%,#34d4e0 100%)",
                    color: "#fff",
                  }
                : {
                    background: "rgba(0,0,0,0.03)",
                    color: "#9ca3af",
                    cursor: "not-allowed",
                    boxShadow: "none",
                  }
            }
          >
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div key="stop" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                  <Square size={14} fill="currentColor" />
                </motion.div>
              ) : (
                <motion.div key="send" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                  <Send size={15} strokeWidth={2.5} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 mt-3 opacity-40">
         <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#5a5880", fontFamily: "'Rajdhani', sans-serif" }}>
           Press <span className="text-[#7c6fff]">Enter</span> to send
         </p>
         <div className="w-1 h-1 rounded-full bg-[#5a5880]" />
         <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#5a5880", fontFamily: "'Rajdhani', sans-serif" }}>
           <span className="text-[#7c6fff]">Shift + Enter</span> for new line
         </p>
      </div>
    </div>
  );
}