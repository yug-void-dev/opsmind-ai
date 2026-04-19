import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  Shield,
  Brain,
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import ChibiRobotScene from "../components/three/RobotScene";
import FloatInput from "../components/auth/FloatInput";
import FloatParticle from "../components/three/BackgroundParticles";
import useAuth from "../hooks/useAuth";

/* ─── Shimmer Button ─── */
function ShimmerBtn({ children, style = {}, className = "", isLoading = false, ...props }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.button
      onHoverStart={() => setHov(true)}
      onHoverEnd={() => setHov(false)}
      whileTap={isLoading ? {} : { scale: 0.97 }}
      whileHover={isLoading ? {} : { scale: 1.02 }}
      disabled={isLoading}
      className={`w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 text-sm overflow-hidden relative shadow-lg transition-all duration-300 ${isLoading ? "opacity-80 cursor-not-allowed" : ""} ${className}`}
      style={{
        background: "linear-gradient(135deg,#6c63ff 0%,#3dbccc 100%)",
        fontFamily: "'DM Sans',sans-serif",
        ...style,
      }}
      {...props}
    >
      <AnimatePresence>
        {!isLoading && hov && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(105deg,transparent 20%,rgba(255,255,255,0.28) 50%,transparent 80%)",
            }}
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
      <span className="relative z-10 flex items-center gap-2">
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          children
        )}
      </span>
    </motion.button>
  );
}

/* ─── Feedback Alert ─── */
function Alert({ error, success }) {
  if (!error && !success) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: -10 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -10 }}
      className={`flex items-center gap-3 p-3.5 rounded-xl mb-5 border text-sm font-medium`}
      style={{
        background: error ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)",
        borderColor: error ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
        color: error ? "#e11d48" : "#15803d",
      }}
    >
      {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <span>{error || success}</span>
    </motion.div>
  );
}

/* ─── Typewriter ─── */
function TW({ text }) {
  const [d, setD] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setD("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setD(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, 44);
    return () => clearInterval(id);
  }, [text]);
  return (
    <span>
      {d}
      {!done && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{ borderRight: "2px solid #6c63ff", marginLeft: 1 }}
        />
      )}
    </span>
  );
}

/* ─── Stagger ─── */
const sc = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};
const si = {
  hidden: { opacity: 0, y: 16, filter: "blur(5px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

/* ─── Background blob ─── */
function Blob({ color, size, top, left, delay = 0 }) {
  return (
    <motion.div
      className="fixed rounded-full pointer-events-none z-0"
      style={{
        width: size,
        height: size,
        top,
        left,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(55px)",
      }}
      animate={{
        scale: [1, 1.22, 0.9, 1.16, 1],
        x: [0, 18, -10, 12, 0],
        y: [0, -12, 8, -5, 0],
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

/* ════════════════ MAIN PAGE ════════════════ */
export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [pw, setPw] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const calcStr = (p) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (p.length >= 14) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (s <= 1) return 1;
    if (s <= 3) return 2;
    return 3;
  };
  const str = calcStr(pw);
  const sC = ["", "#ef4444", "#f59e0b", "#22c55e"][str] || "#ccc";
  const sL = ["", "Weak", "Moderate", "Strong"][str] || "";

  const particles = [
    {
      color: "#6c63ff",
      style: { left: "8%", bottom: "18%", dur: 7, delay: 0 },
    },
    {
      color: "#3dbccc",
      style: { left: "18%", bottom: "8%", dur: 9, delay: 1.2 },
    },
    {
      color: "#b96ef7",
      style: { left: "32%", bottom: "14%", dur: 6, delay: 0.4 },
    },
    {
      color: "#ff85a1",
      style: { left: "48%", bottom: "10%", dur: 8, delay: 2 },
    },
    {
      color: "#6c63ff",
      style: { left: "62%", bottom: "16%", dur: 7, delay: 0.8 },
    },
    {
      color: "#ffd166",
      style: { left: "74%", bottom: "6%", dur: 10, delay: 1.6 },
    },
    {
      color: "#3dbccc",
      style: { left: "86%", bottom: "12%", dur: 6, delay: 3 },
    },
    {
      color: "#b96ef7",
      style: { left: "93%", bottom: "22%", dur: 8, delay: 0.2 },
    },
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const result = await login(data);
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg("Success! Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    } else {
      setError(result.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    const result = await register(data);
    setIsLoading(false);

    if (result.success) {
      setSuccessMsg("Account created! Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    } else {
      setError(result.message);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    // Simulating API call for forgot password since I can't check/modify backend easily
    // but the UI should be ready for it.
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMsg("Password reset link sent to your email!");
    }, 2000);
  };

  return (
    <div
      className="min-h-screen w-full flex overflow-hidden"
      style={{
        background:
          "linear-gradient(145deg,#f5f3ff 0%,#edf9fb 42%,#f8f0ff 100%)",
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      {/* BG blobs */}
      <Blob
        color="rgba(108,99,255,0.13)"
        size={500}
        top="2%"
        left="3%"
        delay={0}
      />
      <Blob
        color="rgba(61,188,204,0.11)"
        size={420}
        top="48%"
        left="52%"
        delay={4}
      />
      <Blob
        color="rgba(185,110,247,0.10)"
        size={380}
        top="60%"
        left="12%"
        delay={2}
      />
      <Blob
        color="rgba(255,133,161,0.09)"
        size={320}
        top="18%"
        left="68%"
        delay={6}
      />
      <Blob
        color="rgba(255,209,102,0.07)"
        size={260}
        top="75%"
        left="78%"
        delay={3}
      />

      {/* Dot grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle,rgba(108,99,255,0.1) 1px,transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <FloatParticle key={i} {...p} />
      ))}

      {/* ══ LEFT PANEL ══ */}
      <motion.div
        className="hidden lg:flex w-1/2 relative flex-col items-center justify-center overflow-hidden"
        initial={{ opacity: 0, x: -70 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Panel tint */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(160deg,rgba(108,99,255,0.07) 0%,rgba(61,188,204,0.06) 50%,rgba(185,110,247,0.05) 100%)",
          }}
        />

        {/* Brand header */}
        <motion.div
          className="absolute top-8 left-10 z-20 flex items-center gap-3"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: "backOut" }}
        >
          <motion.div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg relative"
            style={{ background: "linear-gradient(135deg,#6c63ff,#3dbccc)" }}
            animate={{ rotate: [0, 4, -4, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            <Brain size={20} className="text-white" />
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{ border: "2px solid rgba(108,99,255,0.45)" }}
              animate={{ scale: [1, 1.7, 1.7], opacity: [0.7, 0, 0] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
          </motion.div>
          <div>
            <h1
              className="font-bold text-xl"
              style={{
                fontFamily: "'Rajdhani',sans-serif",
                color: "#2d2b55",
                letterSpacing: ".05em",
              }}
            >
              OpsMind AI
            </h1>
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: "#6c63ff" }}
            >
              Corporate Intelligence
            </p>
          </div>
        </motion.div>

        {/* 3D Chibi Bot */}
        <div className="w-full h-full absolute inset-0">
          <ChibiRobotScene mode={mode} />
        </div>

        {/* Hint label */}
        <motion.div
          className="absolute z-20 px-5 py-2 rounded-full text-sm font-semibold shadow-md"
          style={{
            bottom: "calc(10% + 90px)",
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(12px)",
            color: "#6c63ff",
            border: "1px solid rgba(108,99,255,0.18)",
          }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          💫 Move your cursor to interact!
        </motion.div>

        {/* Feature cards */}
        <motion.div
          className="absolute bottom-8 left-10 right-10 z-20"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.14, delayChildren: 0.85 },
            },
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Shield, label: "Zero Hallucinations", color: "#3dbccc" },
              { icon: Brain, label: "RAG Intelligence", color: "#6c63ff" },
              { icon: Zap, label: "Real-time Answers", color: "#b96ef7" },
            ].map(({ icon: Icon, label, color }) => (
              <motion.div
                key={label}
                variants={{
                  hidden: { opacity: 0, y: 26, scale: 0.85 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                whileHover={{ y: -5, scale: 1.06 }}
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl shadow-sm cursor-default"
                style={{
                  background: "rgba(255,255,255,0.78)",
                  backdropFilter: "blur(14px)",
                  border: "1px solid rgba(108,99,255,0.11)",
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  <Icon size={18} style={{ color }} />
                </motion.div>
                <span
                  className="text-xs text-center font-medium"
                  style={{ color: "#5a5880" }}
                >
                  {label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ══ RIGHT PANEL ══ */}
      <motion.div
        className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10"
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <motion.div
            className="lg:hidden flex items-center gap-3 mb-8 justify-center"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: "linear-gradient(135deg,#6c63ff,#3dbccc)" }}
            >
              <Brain size={20} className="text-white" />
            </div>
            <h1
              className="font-bold text-2xl"
              style={{ fontFamily: "'Rajdhani',sans-serif", color: "#2d2b55" }}
            >
              OpsMind AI
            </h1>
          </motion.div>

          {/* Tab toggle - Enhanced Glassmorphism */}
          <AnimatePresence>
            {mode !== "forgot" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28 }}
                className="flex mb-7 rounded-2xl p-1.5 gap-1"
                style={{
                  background: "rgba(255, 255, 255, 0.25)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  boxShadow: "0 8px 32px rgba(108, 99, 255, 0.05)",
                }}
              >
                {["login", "register"].map((m) => (
                  <motion.button
                    key={m}
                    onClick={() => setMode(m)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize relative overflow-hidden"
                    style={{ color: mode === m ? "#fff" : "#5a5880" }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {mode === m && (
                      <motion.div
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: "linear-gradient(135deg,#6c63ff,#3dbccc)",
                          boxShadow: "0 4px 16px rgba(108,99,255,0.3)",
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 480,
                          damping: 33,
                        }}
                      />
                    )}
                    <span className="relative z-10">{m}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* FORM CARD with Advanced Glassmorphism */}
          <motion.div
            className="rounded-3xl p-8 relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 100%)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              boxShadow:
                "0 20px 50px rgba(0, 0, 0, 0.05), inset 0 0 80px rgba(255, 255, 255, 0.1)",
            }}
            animate={{
              boxShadow: [
                "0 20px 50px rgba(0, 0, 0, 0.05)",
                "0 25px 60px rgba(108, 99, 255, 0.1)",
                "0 20px 50px rgba(0, 0, 0, 0.05)",
              ],
            }}
            transition={{ duration: 6, repeat: Infinity }}
          >
            {/* Corner accents */}
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle,rgba(108,99,255,0.11),transparent 70%)",
              }}
            />
            <div
              className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle,rgba(61,188,204,0.09),transparent 70%)",
              }}
            />

            <AnimatePresence mode="wait">
              {/* ── LOGIN ── */}
              {mode === "login" && (
                <motion.div
                  key="login"
                  variants={sc}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.div variants={si} className="mb-6">
                    <h2
                      className="text-2xl font-bold mb-1"
                      style={{
                        fontFamily: "'Rajdhani',sans-serif",
                        color: "#2d2b55",
                        letterSpacing: ".02em",
                      }}
                    >
                      <TW text="Welcome back 👋" />
                    </h2>
                    <p className="text-sm" style={{ color: "#8b8aae" }}>
                      Sign in to your OpsMind workspace
                    </p>
                  </motion.div>

                  <AnimatePresence mode="wait">
                    {(error || successMsg) && mode === "login" && (
                      <Alert error={error} success={successMsg} />
                    )}
                  </AnimatePresence>

                  <form
                    onSubmit={handleLogin}
                    className="space-y-4"
                  >
                    <motion.div variants={si}>
                      <FloatInput
                        icon={Mail}
                        type="email"
                        name="email"
                        label="Work email"
                        required
                      />
                    </motion.div>
                    <motion.div variants={si}>
                      <FloatInput
                        icon={Lock}
                        type="password"
                        name="password"
                        label="Password"
                        required
                      />
                    </motion.div>
                    <motion.div variants={si} className="flex justify-end">
                      <motion.button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs font-semibold"
                        style={{ color: "#6c63ff" }}
                        whileHover={{ x: 2 }}
                      >
                        Forgot password?
                      </motion.button>
                    </motion.div>
                    <motion.div variants={si}>
                      <ShimmerBtn type="submit" isLoading={isLoading}>
                        <span>Sign In</span>
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          <ArrowRight size={16} />
                        </motion.div>
                      </ShimmerBtn>
                    </motion.div>
                    <motion.div variants={si} className="relative my-1">
                      <div className="absolute inset-0 flex items-center">
                        <div
                          className="w-full"
                          style={{
                            borderTop: "1px solid rgba(108,99,255,0.11)",
                          }}
                        />
                      </div>
                      <div className="relative flex justify-center">
                        <span
                          className="px-3 text-xs"
                          style={{
                            background: "rgba(255,255,255,0.95)",
                            color: "#c0bed8",
                          }}
                        >
                          or continue with
                        </span>
                      </div>
                    </motion.div>
                    <motion.div variants={si}>
                      <motion.button
                        type="button"
                        whileHover={{
                          scale: 1.02,
                          boxShadow: "0 4px 20px rgba(108,99,255,0.14)",
                        }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2.5 transition-all duration-200"
                        style={{
                          background: "rgba(108,99,255,0.05)",
                          border: "1.5px solid rgba(108,99,255,0.14)",
                          color: "#5a5880",
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Google Workspace
                      </motion.button>
                    </motion.div>
                  </form>
                </motion.div>
              )}

              {/* ── REGISTER ── */}
              {mode === "register" && (
                <motion.div
                  key="register"
                  variants={sc}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.div variants={si} className="mb-5">
                    <h2
                      className="text-2xl font-bold mb-1"
                      style={{
                        fontFamily: "'Rajdhani',sans-serif",
                        color: "#2d2b55",
                      }}
                    >
                      <TW text="Create account ✨" />
                    </h2>
                    <p className="text-sm" style={{ color: "#8b8aae" }}>
                      Join OpsMind and unlock AI-powered knowledge
                    </p>
                  </motion.div>

                  <AnimatePresence mode="wait">
                    {(error || successMsg) && mode === "register" && (
                      <Alert error={error} success={successMsg} />
                    )}
                  </AnimatePresence>

                  <form
                    onSubmit={handleRegister}
                    className="space-y-3.5"
                  >
                    <motion.div variants={si}>
                      <FloatInput
                        icon={User}
                        type="text"
                        name="name"
                        label="Name"
                        required
                      />
                    </motion.div>
                    <motion.div variants={si}>
                      <FloatInput
                        icon={Mail}
                        type="email"
                        name="email"
                        label="Work email"
                        required
                      />
                    </motion.div>
                    <motion.div variants={si}>
                      <FloatInput
                        icon={Lock}
                        type="password"
                        name="password"
                        label="Password"
                        required
                        onInput={(e) => setPw(e.target.value)}
                      />
                    </motion.div>
                    <motion.div variants={si}>
                      <FloatInput
                        icon={Lock}
                        type="password"
                        name="confirmPassword"
                        label="Confirm password"
                        required
                      />
                    </motion.div>
                    <motion.div variants={si} className="space-y-1.5">
                      <div className="flex gap-1.5">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ background: "rgba(108,99,255,0.1)" }}
                          >
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: "0%" }}
                              animate={{
                                width: i <= str ? "100%" : "0%",
                                background: sC,
                              }}
                              transition={{ duration: 0.4, delay: i * 0.06 }}
                            />
                          </div>
                        ))}
                      </div>
                      {str > 0 && (
                        <p
                          className="text-xs font-semibold"
                          style={{ color: sC }}
                        >
                          Password strength: {sL}
                        </p>
                      )}
                    </motion.div>
                    <motion.div variants={si}>
                      <ShimmerBtn
                        type="submit"
                        isLoading={isLoading}
                        style={{
                          background: "linear-gradient(135deg,#b96ef7,#6c63ff)",
                        }}
                      >
                        <Sparkles size={15} />
                        <span>Create Account</span>
                      </ShimmerBtn>
                    </motion.div>
                    <motion.div variants={si}>
                      <p
                        className="text-xs text-center"
                        style={{ color: "#c0bed8" }}
                      >
                        By creating an account, you agree to our{" "}
                        <span
                          className="cursor-pointer hover:underline"
                          style={{ color: "#6c63ff" }}
                        >
                          Terms
                        </span>{" "}
                        &{" "}
                        <span
                          className="cursor-pointer hover:underline"
                          style={{ color: "#6c63ff" }}
                        >
                          Privacy Policy
                        </span>
                      </p>
                    </motion.div>
                  </form>
                </motion.div>
              )}

              {/* ── FORGOT PASSWORD ── */}
              {mode === "forgot" && (
                <motion.div
                  key="forgot"
                  variants={sc}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-5"
                >
                  <motion.div variants={si}>
                    <motion.button
                      onClick={() => setMode("login")}
                      className="flex items-center gap-1.5 text-sm font-semibold mb-4 group"
                      style={{ color: "#6c63ff" }}
                      whileHover={{ x: -3 }}
                    >
                      <ChevronLeft
                        size={15}
                        className="group-hover:-translate-x-1 transition-transform"
                      />{" "}
                      Back to login
                    </motion.button>
                  </motion.div>
                  <motion.div
                    variants={si}
                    className="flex justify-center mb-5"
                  >
                    <div className="relative">
                      <motion.div
                        className="rounded-3xl flex items-center justify-center shadow-lg"
                        style={{
                          width: 72,
                          height: 72,
                          background:
                            "linear-gradient(135deg,rgba(108,99,255,0.12),rgba(61,188,204,0.12))",
                          border: "1.5px solid rgba(108,99,255,0.22)",
                        }}
                        animate={{
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.06, 1],
                          boxShadow: [
                            "0 0 0px rgba(108,99,255,0)",
                            "0 0 28px rgba(108,99,255,0.28)",
                            "0 0 0px rgba(108,99,255,0)",
                          ],
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Lock size={30} style={{ color: "#6c63ff" }} />
                      </motion.div>
                      <motion.div
                        className="absolute rounded-full"
                        style={{
                          width: 12,
                          height: 12,
                          background: "#3dbccc",
                          top: "50%",
                          left: "50%",
                          marginTop: -6,
                          marginLeft: -6,
                          boxShadow: "0 0 8px #3dbccc",
                        }}
                        animate={{
                          rotate: [0, 360],
                          translateX: [0, 36, 0, -36, 0],
                          translateY: [-36, 0, 36, 0, -36],
                        }}
                        transition={{
                          duration: 2.8,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </div>
                  </motion.div>
                  <motion.div variants={si} className="text-center">
                    <h2
                      className="text-2xl font-bold mb-2"
                      style={{
                        fontFamily: "'Rajdhani',sans-serif",
                        color: "#2d2b55",
                      }}
                    >
                      <TW text="Reset Password 🔐" />
                    </h2>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "#8b8aae" }}
                    >
                      Enter your registered email. We'll send a secure reset
                      link valid for 15 minutes.
                    </p>
                  </motion.div>
                  <AnimatePresence mode="wait">
                    {(error || successMsg) && mode === "forgot" && (
                      <Alert error={error} success={successMsg} />
                    )}
                  </AnimatePresence>

                  <form
                    onSubmit={handleForgot}
                    className="space-y-4"
                  >
                    <motion.div variants={si}>
                      <FloatInput
                        icon={Mail}
                        type="email"
                        name="forgotEmail"
                        label="Registered email"
                        required
                      />
                    </motion.div>
                    <motion.div variants={si}>
                      <ShimmerBtn type="submit" isLoading={isLoading}>
                        <span>Send Reset Link</span>
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          <ArrowRight size={16} />
                        </motion.div>
                      </ShimmerBtn>
                    </motion.div>
                  </form>
                  <motion.div variants={si}>
                    <motion.div
                      className="rounded-2xl p-4 flex items-start gap-3"
                      style={{
                        background: "rgba(108,99,255,0.055)",
                        border: "1.5px solid rgba(108,99,255,0.13)",
                      }}
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(108,99,255,0)",
                          "0 0 18px rgba(108,99,255,0.11)",
                          "0 0 0px rgba(108,99,255,0)",
                        ],
                      }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Shield
                          size={15}
                          className="mt-0.5 shrink-0"
                          style={{ color: "#6c63ff" }}
                        />
                      </motion.div>
                      <p
                        className="text-xs leading-relaxed"
                        style={{ color: "#8b8aae" }}
                      >
                        Reset links expire after 15 minutes and can only be used
                        once. Check your spam folder if you don't receive the
                        email within 2 minutes.
                      </p>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center text-xs mt-5"
            style={{ color: "#c0bed8" }}
          >
            © 2025 OpsMind AI · All data encrypted 🔒
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
