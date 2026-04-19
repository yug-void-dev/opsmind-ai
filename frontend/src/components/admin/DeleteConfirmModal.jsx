import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

export function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  itemName = "this item",
  title = "Delete Confirmation" 
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] p-8 shadow-2xl"
            style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(40px)",
              border: "1.5px solid rgba(255, 255, 255, 0.8)",
            }}
          >
            {/* Header / Icon */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 shadow-inner"
                style={{ background: "rgba(239, 68, 68, 0.1)", border: "1.5px solid rgba(239, 68, 68, 0.2)" }}>
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              
              <h3 className="text-2xl font-bold" 
                style={{ fontFamily: "'Rajdhani',sans-serif", color: "#2d2b55", letterSpacing: "0.02em" }}>
                {title}
              </h3>
              
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "#5a5880" }}>
                Are you sure you want to delete <span className="font-bold text-[#2d2b55]">"{itemName}"</span>? 
                This action is permanent and cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="flex-1 px-6 py-3.5 rounded-2xl text-sm font-bold transition-colors"
                style={{ 
                  background: "rgba(0, 0, 0, 0.04)", 
                  color: "#5a5880",
                  border: "1px solid rgba(0, 0, 0, 0.05)"
                }}
              >
                Cancel
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 8px 24px rgba(239, 68, 68, 0.25)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 px-6 py-3.5 rounded-2xl text-sm font-bold text-white shadow-lg"
                style={{ 
                  background: "linear-gradient(135deg, #ef4444, #f87171)",
                }}
              >
                Confirm Delete
              </motion.button>
            </div>

            {/* Close Button */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400"
            >
              <X size={18} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
