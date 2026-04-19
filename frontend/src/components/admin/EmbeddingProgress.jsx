import { motion } from "framer-motion";
import { StatusBadge } from "../ui/Badge";

export function EmbeddingProgress({ 
  badge, 
  progress = 0, 
  fileName,
  onRetry 
}) {
  const isProcessing = badge === "Processing" || badge === "Running" || badge === "Syncing";
  const isFailed = badge === "Failed";

  return (
    <div className="w-full space-y-3 p-4 rounded-2xl transition-all"
      style={{ 
        background: "rgba(255,255,255,0.4)", 
        border: "1px solid rgba(124,111,255,0.1)",
        boxShadow: isProcessing ? "0 4px 20px rgba(108,99,255,0.05)" : "none"
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge badge={badge} showRetry={isFailed} onRetry={onRetry} />
          {fileName && (
            <span className="text-sm font-semibold truncate" style={{ color: "#2d2b55" }}>
              {fileName}
            </span>
          )}
        </div>
        
        {isProcessing && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs font-bold" 
            style={{ color: "#7c6fff" }}
          >
            {Math.round(progress)}%
          </motion.span>
        )}
      </div>

      {(isProcessing || progress > 0) && (
        <div className="relative h-2 w-full rounded-full overflow-hidden" 
          style={{ background: "rgba(0,0,0,0.04)" }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ 
              background: "linear-gradient(90deg, #7c6fff, #34d4e0)",
              boxShadow: "0 0 10px rgba(124,111,255,0.3)"
            }}
          />
          
          {isProcessing && (
            <motion.div 
              className="absolute inset-0 w-full h-full"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                transform: "skewX(-20deg)"
              }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>
      )}

      {isProcessing && (
        <p className="text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center gap-1.5"
          style={{ color: "#5a5880" }}>
          <span className="w-1 h-1 rounded-full bg-[#34d4e0] animate-pulse" />
          Analyzing & Generating Embeddings...
        </p>
      )}
    </div>
  );
}
