import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f3ff]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center px-8"
      >
        <div className="w-20 h-20 bg-violet-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={36} className="text-violet-500" />
        </div>
        <h1 className="text-6xl font-bold text-[#2d2b55] mb-3" style={{ fontFamily: "'Rajdhani',sans-serif" }}>404</h1>
        <p className="text-xl font-semibold text-[#5a5880] mb-2">Page not found</p>
        <p className="text-sm text-[#9ca3af] mb-8 max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#7c6fff,#34d4e0)" }}
        >
          <Home size={16} /> Go Home
        </motion.button>
      </motion.div>
    </div>
  );
}
