import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pagination } from "./Pagination";
import { StatusBadge } from "../ui/Badge";
import { Info, Trash2, FileText, ExternalLink } from "lucide-react";

export function DocumentList({ 
  title, 
  icon: Icon = FileText, 
  color = "#7c6fff", 
  description, 
  items = [], 
  perPage = 5,
  searchQuery = "",
  onDelete,
  onView
}) {
  const [page, setPage] = useState(1);
  
  // Filter items based on searchQuery
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.sub?.toLowerCase().includes(q) ||
      item.badge?.toLowerCase().includes(q)
    );
  });

  const totalItems = filteredItems.length;
  const start = (page - 1) * perPage;
  const pageItems = filteredItems.slice(start, start + perPage);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-5 sm:p-8 mb-6 relative overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(20px)",
          border: "1.5px solid rgba(255,255,255,0.8)",
          boxShadow: "0 12px 40px rgba(108,99,255,0.06)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-1" 
          style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
        
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner"
            style={{ background: `${color}15`, border: `1.5px solid ${color}30` }}>
            <Icon size={28} style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold mb-1" 
              style={{ fontFamily: "'Rajdhani',sans-serif", color: "#2d2b55", letterSpacing: "0.02em" }}>
              {title}
            </h2>
            <p className="text-sm opacity-80 max-w-2xl" style={{ color: "#5a5880" }}>
              {description}
            </p>
          </div>
        </div>
      </motion.div>

      {/* List Content */}
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="grid gap-3"
          >
            {pageItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-3xl"
                style={{ background: "rgba(255,255,255,0.3)", border: "2px dashed rgba(0,0,0,0.05)" }}>
                <Info size={40} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No documents found</p>
              </div>
            ) : (
              pageItems.map((item, i) => (
                <motion.div
                  key={item.id || i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl group transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.5)",
                    border: "1.5px solid rgba(255,255,255,0.6)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.01)",
                  }}
                  whileHover={{ 
                    x: 4, 
                    backgroundColor: "rgba(255,255,255,0.9)",
                    boxShadow: "0 10px 30px rgba(108,99,255,0.08)" 
                  }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ background: `${color}10`, color }}>
                    <item.icon size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold truncate mb-0.5" style={{ color: "#2d2b55" }}>
                      {item.title}
                    </h4>
                    <p className="text-xs truncate opacity-70" style={{ color: "#5a5880" }}>
                      {item.sub}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <StatusBadge badge={item.badge} />
                    
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onView && (
                        <button 
                          onClick={() => onView(item)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                          title="View Chunks"
                        >
                          <ExternalLink size={16} />
                        </button>
                      )}
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(item)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        {/* Pagination Controls */}
        <div className="mt-8">
          <Pagination
            total={totalItems}
            perPage={perPage}
            current={page}
            onChange={setPage}
          />
        </div>
      </div>
    </motion.div>
  );
}
