import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

const STATUS_CONFIG = {
  // Upload / Document statuses
  Ready: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Processing: { bg: "rgba(52,212,224,0.12)", text: "#0891b2", border: "rgba(52,212,224,0.3)", dot: "#34d4e0", pulse: true },
  Failed: { bg: "rgba(239,68,68,0.12)", text: "#dc2626", border: "rgba(239,68,68,0.28)", dot: "#ef4444", pulse: false },
  Indexed: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Syncing: { bg: "rgba(52,212,224,0.12)", text: "#0891b2", border: "rgba(52,212,224,0.3)", dot: "#34d4e0", pulse: true },
  // Pipeline statuses
  Complete: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Running: { bg: "rgba(124,111,255,0.12)", text: "#6c63ff", border: "rgba(124,111,255,0.28)", dot: "#7c6fff", pulse: true },
  Queued: { bg: "rgba(245,158,11,0.12)", text: "#b45309", border: "rgba(245,158,11,0.28)", dot: "#f59e0b", pulse: false },
  // Chat log statuses
  Resolved: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Blocked: { bg: "rgba(239,68,68,0.12)", text: "#dc2626", border: "rgba(239,68,68,0.28)", dot: "#ef4444", pulse: false },
  Timeout: { bg: "rgba(245,158,11,0.12)", text: "#b45309", border: "rgba(245,158,11,0.28)", dot: "#f59e0b", pulse: false },
  // User statuses
  Active: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Pending: { bg: "rgba(245,158,11,0.12)", text: "#b45309", border: "rgba(245,158,11,0.28)", dot: "#f59e0b", pulse: true },
  Admin: { bg: "rgba(124,111,255,0.12)", text: "#6c63ff", border: "rgba(124,111,255,0.28)", dot: "#7c6fff", pulse: false },
  // Settings
  Connected: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Enabled: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Default: { bg: "rgba(124,111,255,0.12)", text: "#6c63ff", border: "rgba(124,111,255,0.28)", dot: "#7c6fff", pulse: false },
  Free: { bg: "rgba(245,158,11,0.12)", text: "#b45309", border: "rgba(245,158,11,0.28)", dot: "#f59e0b", pulse: false },
  // Analytics
  Healthy: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Low: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  "Top Doc": { bg: "rgba(124,111,255,0.12)", text: "#6c63ff", border: "rgba(124,111,255,0.28)", dot: "#7c6fff", pulse: false },
  "On Track": { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
};

export function StatusBadge({ badge, showRetry = false, onRetry }) {
  const cfg = STATUS_CONFIG[badge] || {
    bg: "rgba(124,111,255,0.12)", text: "#6c63ff",
    border: "rgba(124,111,255,0.28)", dot: "#7c6fff", pulse: false,
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <motion.span
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
        style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Dot indicator */}
        <span className="relative flex items-center justify-center w-1.5 h-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: cfg.dot }}
          />
          {cfg.pulse && (
            <motion.span
              className="absolute w-3 h-3 rounded-full"
              style={{ background: cfg.dot, opacity: 0.3 }}
              animate={{ scale: [1, 2.2, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
          )}
        </span>
        {badge}
      </motion.span>

      {/* Retry button — only for Failed */}
      {showRetry && badge === "Failed" && (
        <motion.button
          onClick={onRetry}
          whileHover={{ scale: 1.08, backgroundColor: "rgba(239,68,68,0.15)" }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors"
          style={{ background: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <RefreshCw size={10} />
          Retry
        </motion.button>
      )}
    </div>
  );
}
