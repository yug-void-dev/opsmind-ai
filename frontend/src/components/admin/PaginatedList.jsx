import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pagination } from "./Pagination";
import { StatusBadge } from "../ui/Badge";

export function PaginatedList({ title, icon: Icon, color, description, items, perPage = 4 }) {
  const [page, setPage] = useState(1);
  const [retried, setRetried] = useState({});

  const totalItems = items.length;
  const start = (page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);

  const handleRetry = (index) => {
    setRetried(prev => ({ ...prev, [start + index]: true }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl p-6 mb-5 relative overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(20px)",
          border: "1.5px solid rgba(255,255,255,0.7)",
          boxShadow: "0 8px 32px rgba(108,99,255,0.08)",
        }}
      >
        <div className="absolute top-0 left-6 right-6 h-px"
          style={{ background: `linear-gradient(90deg,transparent,${color}60,transparent)` }} />
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle,${color}18,transparent 70%)` }} />
        <div className="flex items-center gap-4">
          <motion.div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: `${color}18`, border: `1.5px solid ${color}35` }}
            animate={{ boxShadow: [`0 0 0px ${color}00`, `0 0 20px ${color}45`, `0 0 0px ${color}00`] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Icon size={26} style={{ color }} />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold"
              style={{ fontFamily: "'Rajdhani',sans-serif", color: "#2d2b55", letterSpacing: "0.03em" }}>{title}</h2>
            <p className="text-sm mt-0.5 max-w-lg" style={{ color: "#5a5880" }}>{description}</p>
          </div>
        </div>
      </motion.div>

      {/* Items list */}
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-3"
          >
            {pageItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="flex flex-col items-center justify-center py-16 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.5)", border: "1.5px dashed rgba(0,0,0,0.1)" }}
              >
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Icon size={36} style={{ color: `${color}80` }} />
                </motion.div>
                <p className="mt-3 text-sm font-medium" style={{ color: "#5a5880" }}>No data yet</p>
              </motion.div>
            ) : (
              pageItems.map((item, i) => {
                const globalIndex = start + i;
                const isRetried = retried[globalIndex];
                const displayBadge = isRetried ? "Processing" : item.badge;

                return (
                  <motion.div
                    key={globalIndex}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ x: 3 }}
                    className="flex items-center gap-4 p-4 rounded-xl transition-all duration-200 cursor-default group"
                    style={{
                      background: "rgba(255,255,255,0.55)",
                      border: "1.5px solid rgba(255,255,255,0.7)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                    }}
                  >
                    {/* Icon */}
                    <motion.div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}10`, border: `1px solid ${color}22` }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <item.icon size={16} style={{ color }} />
                    </motion.div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "#2d2b55" }}>{item.title}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "#5a5880" }}>{item.sub}</p>
                    </div>

                    {/* Status badge + retry */}
                    <StatusBadge
                      badge={displayBadge}
                      showRetry={item.badge === "Failed" && !isRetried}
                      onRetry={() => handleRetry(i)}
                    />
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </AnimatePresence>

        {/* Pagination */}
        <Pagination
          total={totalItems}
          perPage={perPage}
          current={page}
          onChange={(p) => setPage(p)}
        />
      </div>
    </motion.div>
  );
}
