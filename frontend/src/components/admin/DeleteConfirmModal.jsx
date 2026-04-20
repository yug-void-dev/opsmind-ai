import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, AlertTriangle } from "lucide-react";

export function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName = "this item",
  title = "Delete Document?" 
}) {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          {/* Backdrop with a slightly deeper blur and darker tint for focus */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#2d2b55]/30 backdrop-blur-xl transition-all"
          />

          {/* Modal Container — Premium UI */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="relative w-full max-w-[420px] rounded-[2.5rem] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
              backdropFilter: "blur(40px)",
              border: "1px solid rgba(255,255,255,0.8)",
            }}
          >
            {/* Soft decorative gradient behind the icon */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none" />

            {/* Header / Icon */}
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner relative"
                style={{ 
                  background: "linear-gradient(135deg, rgba(244,114,182,0.1) 0%, rgba(2ef,68,68,0.15) 100%)", 
                  border: "1px solid rgba(239,68,68,0.2)" 
                }}>
                <div className="absolute inset-0 rounded-[1.5rem] bg-white opacity-20" />
                <Trash2 size={36} className="text-red-500 relative z-10" />
              </div>
              
              <h3 className="text-2xl font-bold mb-3" 
                style={{ fontFamily: "'Rajdhani',sans-serif", color: "#2d2b55", letterSpacing: "0.02em" }}>
                {title}
              </h3>
              
              <p className="text-[15px] leading-relaxed" style={{ color: "#5a5880" }}>
                Are you sure you want to permanently delete
                <br />
                <span className="font-bold text-[#7c6fff]">"{itemName}"</span>?
                 <br />
                 This action cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8 relative z-10">
              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: "rgba(0,0,0,0.06)" }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="flex-1 px-5 py-3.5 rounded-2xl text-[15px] font-bold transition-colors"
                style={{ 
                  background: "rgba(0, 0, 0, 0.03)", 
                  color: "#5a5880",
                }}
              >
                Cancel
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(239,68,68,0.3)" }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 px-5 py-3.5 rounded-2xl text-[15px] font-bold text-white shadow-lg flex justify-center items-center gap-2"
                style={{ 
                  background: "linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)",
                }}
              >
                Delete Now
              </motion.button>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full transition-colors hidden sm:block"
              style={{ color: "#5a5880", background: "rgba(0,0,0,0.03)" }}
            >
              <X size={18} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}

