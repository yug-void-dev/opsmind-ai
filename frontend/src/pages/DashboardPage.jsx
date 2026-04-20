import { LayoutDashboard, Brain, TrendingUp, Zap, LogOut } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#f5f3ff] p-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <header className="mb-10 flex justify-between items-start">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold text-[#2d2b55]"
          >
            Welcome back, {user?.name || "User"} 👋
          </motion.h1>
          <p className="text-[#5a5880] mt-2">Here is what is happening with your OpsMind AI today.</p>
        </div>

        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.05, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-rose-500 transition-colors"
          style={{ border: "1.5px solid rgba(239, 68, 68, 0.2)" }}
        >
          <LogOut size={18} />
          Logout
        </motion.button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Brain, label: "AI Insights", value: "12 New", color: "#6c63ff" },
          { icon: Zap, label: "Efficiency", value: "94%", color: "#3dbccc" },
          { icon: TrendingUp, label: "Knowledge Growth", value: "+18%", color: "#b96ef7" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-white/50 backdrop-blur-xl"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.7)" }}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5a5880]">{stat.label}</p>
                <p className="text-2xl font-bold text-[#2d2b55]">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-12 bg-white rounded-3xl p-12 text-center border border-white/50 backdrop-blur-xl"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.7)" }}
      >
        <div className="w-16 h-16 bg-[#6c63ff15] text-[#6c63ff] rounded-full flex items-center justify-center mx-auto mb-6">
          <LayoutDashboard size={32} />
        </div>
        <h2 className="text-2xl font-bold text-[#2d2b55] mb-2">User Dashboard</h2>
        <p className="text-[#5a5880] max-w-md mx-auto">
          Your personalized workspace is being prepared. You will soon be able to manage your AI models and personal knowledge base from here.
        </p>
      </motion.div>
    </div>
  );
}
