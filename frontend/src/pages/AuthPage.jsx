import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
} from "lucide-react";
import RobotScene from "../components/three/RobotScene";
import FloatInput from "../components/auth/FloatInput";

/* ─── Particle component ─── */
function Particle({ style }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={style}
      animate={{
        y: [0, -120, 0],
        x: [0, style.driftX ?? 30, 0],
        opacity: [0, 0.7, 0],
        scale: [0.5, 1.2, 0.5],
      }}
      transition={{
        duration: style.duration ?? 6,
        repeat: Infinity,
        delay: style.delay ?? 0,
        ease: "easeInOut",
      }}
    />
  );
}

/* ─── Floating particle field ─── */
function ParticleField() {
  const particles = [
    { left: "8%",  bottom: "10%", width: 4, height: 4, background: "#00d4ff", driftX: 20,  duration: 7,  delay: 0   },
    { left: "18%", bottom: "5%",  width: 3, height: 3, background: "#7b2fff", driftX: -15, duration: 9,  delay: 1.2 },
    { left: "30%", bottom: "15%", width: 5, height: 5, background: "#00ffcc", driftX: 25,  duration: 6,  delay: 0.4 },
    { left: "45%", bottom: "8%",  width: 3, height: 3, background: "#00d4ff", driftX: -20, duration: 8,  delay: 2   },
    { left: "60%", bottom: "12%", width: 4, height: 4, background: "#7b2fff", driftX: 18,  duration: 7,  delay: 0.8 },
    { left: "72%", bottom: "6%",  width: 3, height: 3, background: "#00ffcc", driftX: -12, duration: 10, delay: 1.6 },
    { left: "85%", bottom: "9%",  width: 5, height: 5, background: "#00d4ff", driftX: 22,  duration: 6,  delay: 3   },
    { left: "92%", bottom: "20%", width: 3, height: 3, background: "#7b2fff", driftX: -18, duration: 8,  delay: 0.2 },
    { left: "5%",  bottom: "35%", width: 2, height: 2, background: "#00ffcc", driftX: 10,  duration: 11, delay: 2.5 },
    { left: "50%", bottom: "40%", width: 2, height: 2, background: "#00d4ff", driftX: -8,  duration: 9,  delay: 1   },
  ];
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p, i) => (
        <Particle key={i} style={p} />
      ))}
    </div>
  );
}

/* ─── Scanning line for left panel ─── */
function ScanLine() {
  return (
    <motion.div
      className="absolute inset-x-0 pointer-events-none z-10"
      style={{
        height: "2px",
        background:
          "linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.6) 40%, rgba(0,212,255,0.9) 50%, rgba(0,212,255,0.6) 60%, transparent 100%)",
        boxShadow: "0 0 20px rgba(0,212,255,0.5)",
      }}
      animate={{ top: ["0%", "100%", "0%"] }}
      transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ─── Morphing orb ─── */
function MorphOrb({ color, size, style }) {
  return (
    <motion.div
      className="fixed rounded-full pointer-events-none z-0"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(60px)",
        ...style,
      }}
      animate={{
        scale: [1, 1.25, 0.9, 1.15, 1],
        opacity: [0.7, 1, 0.6, 0.9, 0.7],
        x: [0, 20, -10, 15, 0],
        y: [0, -15, 10, -5, 0],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut",
        delay: style?.animDelay ?? 0,
      }}
    />
  );
}

/* ─── Form card — clean glow via box-shadow only, no overlay divs ─── */
function GlowCard({ children, className = "", style = {} }) {
  return (
    <motion.div
      className={`rounded-2xl ${className}`}
      style={{
        background: "rgba(8,4,24,0.90)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.09)",
        ...style,
      }}
      animate={{
        boxShadow: [
          "0 0 30px rgba(0,212,255,0.06), 0 0 0px rgba(123,47,255,0)",
          "0 0 50px rgba(0,212,255,0.12), 0 0 30px rgba(123,47,255,0.08)",
          "0 0 30px rgba(0,212,255,0.06), 0 0 0px rgba(123,47,255,0)",
        ],
      }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Stagger container variants ─── */
// NOTE: exit has NO stagger — stagger on exit holds pointer-events:none
// on the parent which blocks sibling elements (e.g. the tab buttons).
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.18 },
  },
};

const staggerChild = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
    transition: { duration: 0.15 },
  },
};

/* ─── Typewriter heading ─── */
function TypewriterText({ text, className = "", style = {} }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        setDone(true);
      }
    }, 40);
    return () => clearInterval(id);
  }, [text]);

  return (
    <span className={className} style={style}>
      {displayed}
      {!done && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{ borderRight: "2px solid #00d4ff", marginLeft: 2 }}
        />
      )}
    </span>
  );
}

/* ─── Shimmer button ─── */
function ShimmerButton({ children, style = {}, className = "", ...props }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.button
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      className={`w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 text-sm overflow-hidden relative ${className}`}
      style={{
        background: "linear-gradient(135deg, #00d4ff, #7b2fff)",
        boxShadow: hovered
          ? "0 0 40px rgba(0,212,255,0.5), 0 0 80px rgba(123,47,255,0.25)"
          : "0 0 20px rgba(0,212,255,0.2)",
        transition: "box-shadow 0.3s ease",
        ...style,
      }}
      {...props}
    >
      {/* Shimmer sweep */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.25) 50%, transparent 80%)",
            }}
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            exit={{ x: "200%", opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

/* ─── Auth Page ─── */
export default function AuthPage() {
  const [mode, setMode] = useState("login");

  // Only track password value locally so the strength bar can update live.
  // All other form data is collected via FormData on submit (uncontrolled inputs).
  const [passwordValue, setPasswordValue] = useState("");


  //* Login handler
  const loginHandler = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData.entries())
    console.log(data)
  }

  //* Register handler
  const registerHandler = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData.entries())
    console.log(data)
  }

  const calculatePasswordStrength = (pass) => {
    if (!pass || pass.length === 0) return 0;
    let score = 0;
    if (pass.length >= 4) score++;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (score <= 1) return 1;
    if (score <= 3) return 2;
    if (score <= 5) return 3;
  };

  const strengthScore = calculatePasswordStrength(passwordValue);

  const getStrengthLabel = (score) => {
    if (score === 0) return "none";
    if (score === 1) return "Weak";
    if (score === 2) return "Moderate";
    if (score === 3) return "Strong";
    return "Very Strong";
  };

  const getStrengthColor = (score) => {
    if (score === 0) return "rgba(255,255,255,0.3)";
    if (score === 1) return "#ef4444";
    if (score === 2) return "#eab308";
    if (score === 3) return "#00d4ff";
    return "#22c55e";
  };

  return (
    <div
      className="min-h-screen w-full flex overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #020818 0%, #050d2a 40%, #0a0520 100%)",
      }}
    >
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          transition: background-color 5000s ease-in-out 0s;
          -webkit-text-fill-color: white !important;
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* ── Animated background grid ── */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── Morphing glow orbs ── */}
      <MorphOrb
        color="rgba(123,47,255,0.14)"
        size={420}
        style={{ top: "10%", left: "10%", animDelay: 0 }}
      />
      <MorphOrb
        color="rgba(0,212,255,0.12)"
        size={350}
        style={{ bottom: "15%", right: "25%", animDelay: 3 }}
      />
      <MorphOrb
        color="rgba(0,255,204,0.08)"
        size={280}
        style={{ top: "50%", left: "45%", animDelay: 1.5 }}
      />

      {/* ── Floating particles ── */}
      <ParticleField />

      {/* ── Left Panel: 3D Robot ── */}
      <motion.div
        className="hidden lg:flex w-1/2 relative flex-col items-center justify-center overflow-hidden"
        initial={{ opacity: 0, x: -80 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Scanning line on left panel */}
        <ScanLine />

        {/* Brand header */}
        <motion.div
          className="absolute top-8 left-10 z-20 flex items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: "backOut" }}
        >
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center relative"
            style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Brain size={20} className="text-white" />
            {/* Ping ring */}
            <motion.div
              className="absolute inset-0 rounded-xl"
              style={{ border: "2px solid rgba(0,212,255,0.6)" }}
              animate={{ scale: [1, 1.6, 1.6], opacity: [0.8, 0, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
          <div>
            <h1
              className="text-white font-bold text-xl tracking-tight"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                letterSpacing: "0.05em",
              }}
            >
              OpsMind AI
            </h1>
            <p className="text-cyan-400/60 text-xs tracking-widest uppercase">
              Corporate Intelligence
            </p>
          </div>
        </motion.div>

        {/* 3D Scene */}
        <div className="w-full h-full absolute inset-0">
          <RobotScene mode={mode} />
        </div>

        {/* Bottom info cards with stagger */}
        <motion.div
          className="absolute bottom-10 left-10 right-10 z-20"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15, delayChildren: 0.9 } },
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Shield, label: "Zero Hallucinations", color: "#00d4ff" },
              { icon: Brain,  label: "RAG Intelligence",   color: "#7b2fff" },
              { icon: Zap,    label: "Real-time Answers",  color: "#00ffcc" },
            ].map(({ icon: Icon, label, color }) => (
              <motion.div
                key={label}
                variants={{
                  hidden: { opacity: 0, y: 30, scale: 0.85 },
                  visible: {
                    opacity: 1, y: 0, scale: 1,
                    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                whileHover={{ y: -5, scale: 1.05 }}
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl cursor-default"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Icon size={18} style={{ color }} />
                </motion.div>
                <span className="text-white/60 text-xs text-center font-medium">
                  {label}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Right Panel: Forms ── */}
      <motion.div
        className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10"
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <motion.div
            className="lg:hidden flex items-center gap-3 mb-8 justify-center"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #00d4ff, #7b2fff)" }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Brain size={20} className="text-white" />
            </motion.div>
            <h1
              className="text-white font-bold text-2xl"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              OpsMind AI
            </h1>
          </motion.div>

          {/* Mode toggle */}
          <AnimatePresence>
            {mode !== "forgot" && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex mb-8 rounded-xl p-1 gap-1"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {["login", "register"].map((m) => (
                  <motion.button
                    key={m}
                    onClick={() => setMode(m)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium capitalize relative overflow-hidden"
                    style={{ color: mode === m ? "#fff" : "rgba(255,255,255,0.4)" }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {mode === m && (
                      <motion.div
                        layoutId="tab-bg"
                        className="absolute inset-0 rounded-lg"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(0,212,255,0.22), rgba(123,47,255,0.22))",
                          border: "1px solid rgba(0,212,255,0.35)",
                          boxShadow: "0 0 18px rgba(0,212,255,0.15)",
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">{m}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form container — Glow card */}
          <GlowCard className="p-8">
            {/* Decorative corner gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-2xl overflow-hidden pointer-events-none">
              <motion.div
                className="w-full h-full"
                style={{
                  background:
                    "radial-gradient(circle at top right, rgba(0,212,255,0.15), transparent 70%)",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>

            <AnimatePresence mode="wait">
              {/* ── Login ── */}
              {mode === "login" && (
                <motion.div
                  key="login"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.div variants={staggerChild} className="mb-6">
                    <h2
                      className="text-2xl font-bold text-white mb-1"
                      style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        letterSpacing: "0.03em",
                      }}
                    >
                      <TypewriterText text="Welcome back" />
                    </h2>
                    <p className="text-white/40 text-sm">
                      Sign in to your OpsMind workspace
                    </p>
                  </motion.div>

                  <form
                    onSubmit={loginHandler}
                    className="space-y-5"
                  >
                    <motion.div variants={staggerChild}>
                      <FloatInput
                        icon={Mail}
                        type="email"
                        name="email"
                        label="Work email"
                      />
                    </motion.div>

                    <motion.div variants={staggerChild}>
                      <FloatInput
                        icon={Lock}
                        type="password"
                        name="password"
                        label="Password"
                      />
                    </motion.div>

                    <motion.div variants={staggerChild} className="flex justify-end">
                      <motion.button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-cyan-400/70 hover:text-cyan-400 text-xs transition-colors duration-200"
                        whileHover={{ x: 2 }}
                      >
                        Forgot password?
                      </motion.button>
                    </motion.div>

                    <motion.div variants={staggerChild}>
                      <ShimmerButton type="submit">
                        <span>Sign In</span>
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          <ArrowRight size={16} />
                        </motion.div>
                      </ShimmerButton>
                    </motion.div>

                    <motion.div variants={staggerChild} className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/8" />
                      </div>
                      <div className="relative flex justify-center">
                        <span
                          className="px-3 text-white/30 text-xs"
                          style={{ background: "transparent" }}
                        >
                          OR CONTINUE WITH
                        </span>
                      </div>
                    </motion.div>

                    <motion.div variants={staggerChild}>
                      <motion.button
                        type="button"
                        whileHover={{
                          scale: 1.02,
                          background: "rgba(255,255,255,0.08)",
                          borderColor: "rgba(0,212,255,0.3)",
                        }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-3 rounded-xl text-sm text-white/70 font-medium flex items-center justify-center gap-2.5 transition-all duration-200"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Google Workspace</span>
                      </motion.button>
                    </motion.div>
                  </form>
                </motion.div>
              )}

              {/* ── Register ── */}
              {mode === "register" && (
                <motion.div
                  key="register"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <motion.div variants={staggerChild} className="mb-5">
                    <h2
                      className="text-2xl font-bold text-white mb-1"
                      style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        letterSpacing: "0.03em",
                      }}
                    >
                      <TypewriterText text="Create account" />
                    </h2>
                    <p className="text-white/40 text-sm">
                      Join OpsMind and unlock AI-powered knowledge
                    </p>
                  </motion.div>

                  <form
                    onSubmit={registerHandler}
                    className="space-y-4"
                  >
                    <motion.div variants={staggerChild}>
                      <div className="grid grid-cols-2 gap-3">
                        <FloatInput
                          icon={User}
                          type="text"
                          name="firstName"
                          label="First name"
                        />
                        <FloatInput
                          icon={User}
                          type="text"
                          name="lastName"
                          label="Last name"
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={staggerChild}>
                      <FloatInput
                        icon={Mail}
                        type="email"
                        name="email"
                        label="Work email"
                      />
                    </motion.div>

                    <motion.div variants={staggerChild}>
                      <FloatInput
                        icon={Lock}
                        type="password"
                        name="password"
                        label="Password"
                        onInput={(e) => setPasswordValue(e.target.value)}
                      />
                    </motion.div>

                    <motion.div variants={staggerChild}>
                      <FloatInput
                        icon={Lock}
                        type="password"
                        name="confirmPassword"
                        label="Confirm password"
                      />
                    </motion.div>

                    {/* Password strength animated bars */}
                    <motion.div variants={staggerChild} className="space-y-1.5">
                      <div className="flex gap-1.5">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="flex-1 h-1.5 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          >
                            <motion.div
                              className="h-full rounded-full"
                              initial={{ width: "0%" }}
                              animate={{
                                width: i <= strengthScore ? "100%" : "0%",
                                background: getStrengthColor(strengthScore),
                              }}
                              transition={{
                                duration: 0.4,
                                ease: [0.22, 1, 0.36, 1],
                                delay: i * 0.06,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <motion.p
                        className="text-xs font-medium"
                        animate={{ color: getStrengthColor(strengthScore) }}
                        transition={{ duration: 0.3 }}
                      >
                        {strengthScore > 0
                          ? `Password strength: ${getStrengthLabel(strengthScore)}`
                          : "Enter a password"}
                      </motion.p>
                    </motion.div>

                    <motion.div variants={staggerChild}>
                      <ShimmerButton
                        type="submit"
                        style={{
                          background: "linear-gradient(135deg, #7b2fff, #00d4ff)",
                        }}
                      >
                        <Sparkles size={16} />
                        <span>Create Account</span>
                      </ShimmerButton>
                    </motion.div>

                    <motion.div variants={staggerChild}>
                      <p className="text-white/25 text-xs text-center">
                        By creating an account, you agree to our{" "}
                        <span className="text-cyan-400/50 cursor-pointer hover:text-cyan-400 transition-colors">
                          Terms of Service
                        </span>{" "}
                        &{" "}
                        <span className="text-cyan-400/50 cursor-pointer hover:text-cyan-400 transition-colors">
                          Privacy Policy
                        </span>
                      </p>
                    </motion.div>
                  </form>
                </motion.div>
              )}

              {/* ── Forgot Password ── */}
              {mode === "forgot" && (
                <motion.div
                  key="forgot"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="space-y-5"
                >
                  <motion.div variants={staggerChild}>
                    <motion.button
                      onClick={() => setMode("login")}
                      className="flex items-center gap-2 text-cyan-400/60 hover:text-cyan-400 text-sm mb-4 transition-colors duration-200 group"
                      whileHover={{ x: -3 }}
                    >
                      <ChevronLeft
                        size={16}
                        className="group-hover:-translate-x-1 transition-transform duration-200"
                      />
                      Back to login
                    </motion.button>
                  </motion.div>

                  <motion.div variants={staggerChild} className="flex justify-center mb-6">
                    <div className="relative">
                      <motion.div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center relative"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(123,47,255,0.2))",
                          border: "1px solid rgba(0,212,255,0.3)",
                        }}
                        animate={{
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.05, 1],
                          boxShadow: [
                            "0 0 0px rgba(0,212,255,0)",
                            "0 0 30px rgba(0,212,255,0.4)",
                            "0 0 0px rgba(0,212,255,0)",
                          ],
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Lock size={28} className="text-cyan-400" />
                      </motion.div>
                      {/* Orbiting dot */}
                      <motion.div
                        className="absolute w-2.5 h-2.5 rounded-full"
                        style={{
                          background: "#00d4ff",
                          top: "50%",
                          left: "50%",
                          marginTop: -5,
                          marginLeft: -5,
                          boxShadow: "0 0 8px #00d4ff",
                        }}
                        animate={{
                          rotate: [0, 360],
                          translateX: [0, 34, 0, -34, 0],
                          translateY: [-34, 0, 34, 0, -34],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={staggerChild} className="text-center mb-6">
                    <h2
                      className="text-2xl font-bold text-white mb-2"
                      style={{ fontFamily: "'Rajdhani', sans-serif" }}
                    >
                      <TypewriterText text="Reset Password" />
                    </h2>
                    <p className="text-white/40 text-sm leading-relaxed">
                      Enter your registered email address. We'll send you a
                      secure reset link valid for 15 minutes.
                    </p>
                  </motion.div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const data = new FormData(e.target);
                      const payload = Object.fromEntries(data.entries());
                      console.log("Forgot password payload:", payload);
                      // TODO: call your forgot-password API with payload
                    }}
                    className="space-y-4"
                  >
                    <motion.div variants={staggerChild}>
                      <FloatInput
                        icon={Mail}
                        type="email"
                        name="forgotEmail"
                        label="Registered email"
                      />
                    </motion.div>

                    <motion.div variants={staggerChild}>
                      <ShimmerButton type="submit">
                        <span>Send Reset Link</span>
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          <ArrowRight size={16} />
                        </motion.div>
                      </ShimmerButton>
                    </motion.div>
                  </form>

                  <motion.div variants={staggerChild}>
                    <motion.div
                      className="rounded-xl p-4 flex items-start gap-3"
                      style={{
                        background: "rgba(0,212,255,0.05)",
                        border: "1px solid rgba(0,212,255,0.15)",
                      }}
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(0,212,255,0)",
                          "0 0 16px rgba(0,212,255,0.12)",
                          "0 0 0px rgba(0,212,255,0)",
                        ],
                      }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Shield size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                      </motion.div>
                      <p className="text-white/50 text-xs leading-relaxed">
                        For security, reset links expire after 15 minutes and can
                        only be used once. Check your spam folder if you don't
                        receive the email within 2 minutes.
                      </p>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlowCard>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="text-center text-white/20 text-xs mt-6"
          >
            © 2025 Zaalima Development · OpsMind AI · All data encrypted
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
