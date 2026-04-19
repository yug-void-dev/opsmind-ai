import { motion } from "framer-motion";
import {ChevronLeft, ChevronRight} from "lucide-react";
export function Pagination({ total, perPage, current, onChange }) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Show max 5 page buttons
  let visiblePages = pages;
  if (totalPages > 5) {
    if (current <= 3) visiblePages = [1, 2, 3, 4, 5];
    else if (current >= totalPages - 2) visiblePages = pages.slice(totalPages - 5);
    else visiblePages = [current - 2, current - 1, current, current + 1, current + 2];
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex items-center justify-between mt-5 pt-4"
      style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
    >
      {/* Info */}
      <p className="text-xs font-medium" style={{ color: "#9ca3af" }}>
        Showing{" "}
        <span style={{ color: "#7c6fff", fontWeight: 700 }}>
          {Math.min((current - 1) * perPage + 1, total)}–{Math.min(current * perPage, total)}
        </span>{" "}
        of <span style={{ color: "#2d2b55", fontWeight: 700 }}>{total}</span> results
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1.5">
        {/* Prev */}
        <motion.button
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          whileHover={current !== 1 ? { scale: 1.08 } : {}}
          whileTap={current !== 1 ? { scale: 0.95 } : {}}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all"
          style={{
            background: current === 1 ? "rgba(0,0,0,0.03)" : "rgba(124,111,255,0.08)",
            border: `1px solid ${current === 1 ? "rgba(0,0,0,0.06)" : "rgba(124,111,255,0.18)"}`,
            color: current === 1 ? "#c4c2d4" : "#7c6fff",
            cursor: current === 1 ? "not-allowed" : "pointer",
          }}
        >
          <ChevronLeft size={14} />
        </motion.button>

        {/* Page numbers */}
        {visiblePages.map((page) => (
          <motion.button
            key={page}
            onClick={() => onChange(page)}
            whileHover={page !== current ? { scale: 1.08 } : {}}
            whileTap={page !== current ? { scale: 0.95 } : {}}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all"
            style={{
              background: page === current
                ? "linear-gradient(135deg,#7c6fff,#34d4e0)"
                : "rgba(255,255,255,0.5)",
              border: page === current
                ? "none"
                : "1px solid rgba(0,0,0,0.07)",
              color: page === current ? "#fff" : "#5a5880",
              boxShadow: page === current ? "0 4px 12px rgba(124,111,255,0.35)" : "none",
            }}
            animate={page === current ? { scale: 1 } : { scale: 1 }}
          >
            {page}
          </motion.button>
        ))}

        {/* Next */}
        <motion.button
          onClick={() => onChange(current + 1)}
          disabled={current === totalPages}
          whileHover={current !== totalPages ? { scale: 1.08 } : {}}
          whileTap={current !== totalPages ? { scale: 0.95 } : {}}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all"
          style={{
            background: current === totalPages ? "rgba(0,0,0,0.03)" : "rgba(124,111,255,0.08)",
            border: `1px solid ${current === totalPages ? "rgba(0,0,0,0.06)" : "rgba(124,111,255,0.18)"}`,
            color: current === totalPages ? "#c4c2d4" : "#7c6fff",
            cursor: current === totalPages ? "not-allowed" : "pointer",
          }}
        >
          <ChevronRight size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}
