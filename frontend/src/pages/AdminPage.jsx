import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";

import {
  LayoutDashboard, FileUp, Files, MessageSquare,
  Users, Settings, LogOut, Brain, Bell, Search,
  TrendingUp, Database, Zap, Shield, ChevronDown,
  Menu, X, Activity, CheckCircle2, Clock, AlertCircle,
  Upload, Eye, RefreshCw, ChevronRight, ChevronLeft,
} from "lucide-react";
import * as THREE from "three";
import { PaginatedList } from "../components/admin/PaginatedList";
import { UploadDropzone } from "../components/admin/UploadDropzone";
import { DocumentList } from "../components/admin/DocumentList";
import { DeleteConfirmModal } from "../components/admin/DeleteConfirmModal";
import { EmbeddingProgress } from "../components/admin/EmbeddingProgress";
import showToast from "../components/ui/Toast";
import useAuth from "../hooks/useAuth";
import axios from "axios";

/* ══════════════════════════════════════════════════
   LIGHT THEME PALETTE
   bg:      #f5f3ff → #edf9fb → #f8f0ff
   surface: rgba(255,255,255,0.7)
   accent1: #7c6fff (violet)
   accent2: #34d4e0 (teal)
   accent3: #c084fc (lilac)
   warm:    #f472b6 (pink)
   text:    #2d2b55
   muted:   #5a5880
══════════════════════════════════════════════════ */

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin", end: true },
  { icon: FileUp, label: "Upload PDFs", path: "/admin/upload" },
  { icon: Files, label: "Documents", path: "/admin/documents" },
  { icon: MessageSquare, label: "Chat Logs", path: "/admin/chatlogs" },
  { icon: Activity, label: "Pipeline Status", path: "/admin/pipeline" },
  { icon: TrendingUp, label: "Analytics", path: "/admin/analytics" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

/* ════════ STATUS BADGE CONFIG ════════ */
const STATUS_CONFIG = {
  // Upload / Document statuses
  Ready: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Processing: { bg: "rgba(52,212,224,0.12)", text: "#0891b2", border: "rgba(52,212,224,0.3)", dot: "#34d4e0", pulse: true },
  Failed: { bg: "rgba(239,68,68,0.12)", text: "#dc2626", border: "rgba(239,68,68,0.28)", dot: "#ef4444", pulse: false },
  Indexed: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Syncing: { bg: "rgba(52,212,224,0.12)", text: "#0891b2", border: "rgba(52,212,224,0.3)", dot: "#34d4e0", pulse: true },
  // Pipeline statuses
  Complete: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Running: { bg: "rgba(124,111,255,0.12)", text: "#6c63ff", border: "rgba(124,111,255,0.28)", dot: "#7c6fff", pulse: true },
  Queued: { bg: "rgba(245,158,11,0.12)", text: "#b45309", border: "rgba(245,158,11,0.28)", dot: "#f59e0b", pulse: false },
  // Chat log statuses
  Resolved: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Blocked: { bg: "rgba(239,68,68,0.12)", text: "#dc2626", border: "rgba(239,68,68,0.28)", dot: "#ef4444", pulse: false },
  Timeout: { bg: "rgba(245,158,11,0.12)", text: "#b45309", border: "rgba(245,158,11,0.28)", dot: "#f59e0b", pulse: false },
  // User statuses
  Active: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Pending: { bg: "rgba(245,158,11,0.12)", text: "#b45309", border: "rgba(245,158,11,0.28)", dot: "#f59e0b", pulse: true },
  Admin: { bg: "rgba(124,111,255,0.12)", text: "#6c63ff", border: "rgba(124,111,255,0.28)", dot: "#7c6fff", pulse: false },
  // Settings
  Connected: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Enabled: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Default: { bg: "rgba(124,111,255,0.12)", text: "#6c63ff", border: "rgba(124,111,255,0.28)", dot: "#7c6fff", pulse: false },
  Free: { bg: "rgba(245,158,11,0.12)", text: "#b45309", border: "rgba(245,158,11,0.28)", dot: "#f59e0b", pulse: false },
  // Analytics
  Healthy: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  Low: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
  "Top Doc": { bg: "rgba(124,111,255,0.12)", text: "#6c63ff", border: "rgba(124,111,255,0.28)", dot: "#7c6fff", pulse: false },
  "On Track": { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.25)", dot: "#22c55e", pulse: false },
};


/* ════════ THREE.JS BACKGROUND ════════ */
function MeshBackground() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    camera.position.z = 6;

    const geo = new THREE.BufferGeometry();
    const count = 180;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const dotMat = new THREE.PointsMaterial({ color: 0x7c6fff, size: 0.055, transparent: true, opacity: 0.5 });
    const dots = new THREE.Points(geo, dotMat);
    scene.add(dots);

    const linePts = [];
    for (let i = 0; i < 22; i++) {
      linePts.push(new THREE.Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 4));
      linePts.push(new THREE.Vector3((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 4));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x34d4e0, transparent: true, opacity: 0.07 });
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    let t = 0, raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.003;
      dots.rotation.y = t * 0.06;
      dots.rotation.x = t * 0.03;
      dotMat.opacity = 0.28 + Math.sin(t) * 0.07;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nW = el.clientWidth, nH = el.clientHeight;
      camera.aspect = nW / nH; camera.updateProjectionMatrix(); renderer.setSize(nW, nH);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);
  return <div ref={ref} className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }} />;
}

/* ════════ COUNTER ════════ */
function Counter({ value, duration = 1.4 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const end = parseFloat(value.toString().replace(/,/g, ""));
    let start = 0;
    const step = end / (duration * 60);
    const id = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(id); }
      else setDisplay(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(id);
  }, [value, duration]);
  return <span>{typeof value === "string" && value.includes(",") ? display.toLocaleString() : display}</span>;
}

/* ════════ STAT CARD ════════ */
function StatCard({ icon: Icon, label, value, delta, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
      className="relative rounded-3xl p-6 overflow-hidden flex flex-col items-start gap-4"
      style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(24px)",
        border: "1.5px solid rgba(255,255,255,0.8)",
        boxShadow: "0 8px 32px rgba(108,99,255,0.08)",
      }}
    >
      <div className="flex items-center gap-4 w-full">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15`, border: `1.5px solid ${color}25` }}>
          <Icon size={22} style={{ color }} />
        </div>
        <div className="flex flex-col min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
            style={{ color: "#5a5880", fontFamily: "'Rajdhani',sans-serif" }}>{label}</p>
          <p className="text-2xl font-bold truncate"
            style={{ color: "#2d2b55", fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.02em" }}>
            <Counter value={value} />
          </p>
        </div>
      </div>
      {delta && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold"
          style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
          <TrendingUp size={10} />
          <span>{delta} this month</span>
        </div>
      )}
    </motion.div>
  );
}

/* ════════ ACTION CARD ════════ */
function ActionCard({ icon: Icon, title, desc, onClick, delay = 0 }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.9)", y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="flex items-center gap-4 p-5 rounded-3xl text-left relative group transition-all"
      style={{
        background: "rgba(255,255,255,0.5)",
        border: "1.5px solid rgba(255,255,255,0.7)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.02)",
      }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.15)", color: "#7c6fff" }}>
        <Icon size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold truncate" style={{ color: "#2d2b55" }}>{title}</h3>
        <p className="text-xs mt-0.5 truncate" style={{ color: "#5a5880" }}>{desc}</p>
      </div>
      <ChevronRight size={18} className="text-[#9ca3af] group-hover:text-[#7c6fff] transform group-hover:translate-x-1 transition-all" />
    </motion.button>
  );
}

/* ════════ SECTION HEADER ════════ */
const SectionHeader = ({ title, color = "#7c6fff" }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="flex items-center gap-2">
      <div className="w-1 h-5 rounded-full" style={{ background: color }} />
      <h2 className="text-sm font-bold uppercase tracking-[0.1em]"
        style={{ color: "#2d2b55", fontFamily: "'Rajdhani',sans-serif" }}>{title}</h2>
    </div>
    <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,rgba(0,0,0,0.05) 0%,transparent 100%)" }} />
  </div>
);

/* ════════ ACTIVITY ROW ════════ */
function ActivityRow({ icon: Icon, color, title, sub, time, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ x: 4, backgroundColor: "rgba(124,111,255,0.06)" }}
      className="flex items-center gap-4 py-4 px-3 rounded-2xl cursor-default transition-all duration-200"
      style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}
    >
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "#2d2b55" }}>{title}</p>
        <p className="text-xs truncate mt-0.5" style={{ color: "#5a5880" }}>{sub}</p>
      </div>
      <span className="text-[11px] font-bold flex-shrink-0 uppercase" style={{ color: "#9ca3af" }}>{time}</span>
    </motion.div>
  );
}

/* ════════ ADMIN OVERVIEW ════════ */
function AdminOverview() {
  const navigate = useNavigate();
  const [sysStats, setSysStats] = useState(null);

  useEffect(() => {
    axios.get("/api/admin/stats")
      .then(res => setSysStats(res.data.data))
      .catch(console.error);
  }, []);

  const stats = [
    { icon: Files, label: "Documents indexed", value: sysStats?.documents || 0, delta: "", color: "#7c6fff", delay: 0 },
    { icon: Database, label: "Vector chunks", value: sysStats?.chunks?.toLocaleString() || 0, delta: "", color: "#34d4e0", delay: 0.08 },
    { icon: MessageSquare, label: "Queries today", value: sysStats?.totalQueries?.toLocaleString() || 0, delta: "", color: "#c084fc", delay: 0.16 },
    { icon: Users, label: "Active users", value: sysStats?.users || 0, delta: "", color: "#f472b6", delay: 0.24 },
  ];
  const quickActions = [
    { icon: FileUp, title: "Upload SOP", desc: "Process new documents", path: "/admin/upload" },
    { icon: MessageSquare, title: "View Logs", desc: "Audit AI responses", path: "/admin/chatlogs" },
    { icon: Activity, title: "Pipeline Status", desc: "Monitor ingestion", path: "/admin/pipeline" },
    { icon: Settings, title: "System Settings", desc: "Configure guardrails", path: "/admin/settings" },
  ];
  const activity = [
    { icon: FileUp, color: "#7c6fff", title: "HR_Policy_2025.pdf uploaded", sub: "48 chunks · 2.3 MB", time: "2 min ago" },
    { icon: MessageSquare, color: "#34d4e0", title: "New query by priya@zaalima.com", sub: '"How do I apply for leave?"', time: "15 min ago" },
    { icon: Shield, color: "#c084fc", title: "Embedding pipeline completed", sub: "Refund_Policy.pdf — ready", time: "1 hour ago" },
    { icon: Users, color: "#f472b6", title: "New user registered", sub: "arjun@zaalima.com joined", time: "2 hours ago" },
    { icon: Zap, color: "#7c6fff", title: "RAG retrieval success", sub: "Query resolved in 1.2s", time: "3 hours ago" },
  ];
  const health = [
    { label: "MongoDB Atlas", pct: 98, color: "#7c6fff" },
    { label: "Gemini Embedding", pct: 100, color: "#34d4e0" },
    { label: "RAG Pipeline", pct: 95, color: "#c084fc" },
    { label: "Vector Search Index", pct: 100, color: "#f472b6" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-10">
    <div>
        <motion.h1 initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-3xl font-bold mb-1.5"
          style={{ fontFamily: "'Rajdhani',sans-serif", color: "#2d2b55", letterSpacing: "0.03em" }}>
          Good morning, {useAuth().user?.name || "Admin"} 👋
        </motion.h1>
        <motion.p className="text-sm" style={{ color: "#5a5880" }}>Here's what's happening with OpsMind AI today.</motion.p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div>
        <SectionHeader title="Quick Actions" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {quickActions.map((a, i) => (
            <ActionCard key={i} {...a} delay={0.1 + i * 0.05} onClick={() => navigate(a.path)} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2">
          <SectionHeader title="Recent Activity" />
          <div className="rounded-3xl p-2 space-y-1"
            style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(255,255,255,0.6)" }}>
            {activity.map((a, i) => <ActivityRow key={i} {...a} delay={0.2 + i * 0.05} />)}
          </div>
        </div>
        <div>
          <SectionHeader title="System Health" color="#34d4e0" />
          <div className="rounded-3xl p-6 space-y-6"
            style={{ background: "rgba(255,255,255,0.35)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(255,255,255,0.6)" }}>
            {health.map(({ label, pct, color }, i) => (
              <div key={label}>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "#6b6987", fontFamily: "'Rajdhani',sans-serif" }}>{label}</span>
                  <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.04)" }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, delay: 0.3 + i * 0.1 }}
                    style={{ background: `linear-gradient(90deg,${color},${color}88)`, boxShadow: `0 0 8px ${color}60` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}



/* ════════════════════════════════════════════
   MAIN ADMIN PAGE
════════════════════════════════════════════ */
export default function AdminPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const { user, logout: authLogout } = useAuth();

  const handleLogout = () => {
    authLogout();
    navigate("/login");
  };

  useEffect(() => {
    const h = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      body { overflow: hidden; margin: 0; padding: 0; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const currentNav = NAV_ITEMS.find(n => n.end ? location.pathname === n.path : location.pathname.startsWith(n.path));
  const pageTitle = currentNav?.label || "Dashboard";

  const notifications = [
    { title: "New PDF indexed", sub: "HR_Policy_2025.pdf is ready", time: "2m", dot: "#7c6fff" },
    { title: "Embedding complete", sub: "Refund_Policy.pdf — 48 chunks", time: "12m", dot: "#34d4e0" },
    { title: "New user registered", sub: "arjun@zaalima.com joined", time: "1h", dot: "#c084fc" },
  ];

  /* ── Hamburger ── */
  const HamburgerIcon = ({ open }) => (
    <div className="flex flex-col justify-center items-center w-5 h-5 gap-1.5">
      <motion.span animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }} className="block h-0.5 w-5 rounded-full" style={{ background: "#7c6fff" }} />
      <motion.span animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }} transition={{ duration: 0.2 }} className="block h-0.5 w-5 rounded-full" style={{ background: "#7c6fff" }} />
      <motion.span animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }} transition={{ duration: 0.25 }} className="block h-0.5 w-5 rounded-full" style={{ background: "#7c6fff" }} />
    </div>
  );

  /* ── Sidebar floating toggle ── */
  const SidebarToggle = () => (
    <motion.button
      onClick={() => setCollapsed(c => !c)}
      whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,1)", boxShadow: "0 8px 24px rgba(108,99,255,0.2)" }}
      whileTap={{ scale: 0.9 }}
      className="absolute -right-4 top-10 w-8 h-8 rounded-full flex items-center justify-center z-50"
      style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", border: "1.5px solid rgba(108,99,255,0.2)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", color: "#7c6fff" }}
    >
      <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
        <ChevronRight size={18} strokeWidth={2.5} />
      </motion.div>
    </motion.button>
  );

  /* ── Sidebar content ── */
  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full" style={{ fontFamily: "'DM Sans',sans-serif" }}>
      <div className="flex items-center px-4 pt-8 pb-6 flex-shrink-0" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", minHeight: 88 }}>
        <motion.div className="flex items-center gap-2.5 flex-1 min-w-0">
          <motion.div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c6fff,#34d4e0)", boxShadow: "0 4px 12px rgba(124,111,255,0.25)" }}
            animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Brain size={16} className="text-white" />
          </motion.div>
          <AnimatePresence initial={false}>
            {(!collapsed || isMobile) && (
              <motion.div key="logo-text"
                initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.22 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <p className="font-bold text-sm leading-tight" style={{ fontFamily: "'Rajdhani',sans-serif", color: "#2d2b55", letterSpacing: "0.05em" }}>OpsMind AI</p>
                <p className="text-xs" style={{ color: "#5a5880" }}>Admin Panel</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        {isMobile && <button onClick={() => setMobileOpen(false)} style={{ color: "#5a5880" }}><X size={18} /></button>}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-1 no-scrollbar">
        {NAV_ITEMS.map(({ icon: Icon, label, path, end }) => (
          <NavLink key={path} to={path} end={end} className="block">
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: (!collapsed || isMobile) ? 4 : 0 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group"
                style={{
                  background: isActive ? "rgba(124,111,255,0.08)" : "transparent",
                  border: isActive ? "1px solid rgba(124,111,255,0.15)" : "1px solid transparent",
                  color: isActive ? "#6c63ff" : "#5a5880",
                  justifyContent: (collapsed && !isMobile) ? "center" : "flex-start",
                  boxShadow: isActive ? "0 4px 12px rgba(124,111,255,0.08)" : "none",
                }}
              >
                {isActive && (
                  <motion.div layoutId="nav-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
                    style={{ background: "linear-gradient(180deg,#7c6fff,#34d4e0)", boxShadow: "0 0 8px rgba(124,111,255,0.6)" }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <motion.div whileHover={{ scale: 1.15 }} transition={{ duration: 0.15 }}>
                  <Icon size={17} className="flex-shrink-0" />
                </motion.div>
                <AnimatePresence initial={false}>
                  {(!collapsed || isMobile) && (
                    <motion.span key="nav-label"
                      initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >{label}</motion.span>
                  )}
                </AnimatePresence>
                {(collapsed && !isMobile) && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 rounded-xl text-xs font-medium pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50"
                    style={{ background: "#fff", color: "#2d2b55", border: "1px solid rgba(0,0,0,0.05)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                    {label}
                  </div>
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex-shrink-0 px-2 py-4" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <motion.button onClick={handleLogout}
          whileHover={{ x: (!collapsed || isMobile) ? 4 : 0, backgroundColor: "rgba(244,114,182,0.08)" }}
          whileTap={{ scale: 0.97 }}
          className="w-full h-11 flex items-center gap-3 px-3 rounded-xl transition-all duration-200"
          style={{ color: "#f472b6", justifyContent: (collapsed && !isMobile) ? "center" : "flex-start" }}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <AnimatePresence initial={false}>
            {(!collapsed || isMobile) && (
              <motion.span key="logout"
                initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }}
                className="text-sm font-semibold whitespace-nowrap overflow-hidden"
              >Log out</motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );

  /* ════════ RENDER ════════ */
  return (
    <div className="h-screen w-screen flex p-3 sm:p-4 gap-3 sm:gap-4 overflow-hidden"
      style={{ background: "linear-gradient(145deg,#f5f3ff 0%,#edf9fb 42%,#f8f0ff 100%)", fontFamily: "'DM Sans',sans-serif" }}>

      <MeshBackground />

      {[
        { color: "rgba(124,111,255,0.12)", size: 500, top: "0%", left: "5%", delay: 0 },
        { color: "rgba(52,212,224,0.10)", size: 420, top: "55%", left: "55%", delay: 5 },
        { color: "rgba(192,132,252,0.10)", size: 360, top: "70%", left: "10%", delay: 3 },
      ].map((b, i) => (
        <motion.div key={i} className="fixed rounded-full pointer-events-none"
          style={{ width: b.size, height: b.size, top: b.top, left: b.left, background: `radial-gradient(circle,${b.color} 0%,transparent 70%)`, filter: "blur(70px)", zIndex: 0 }}
          animate={{ scale: [1, 1.16, 0.93, 1], x: [0, 14, -7, 0], y: [0, -8, 5, 0] }}
          transition={{ duration: 14, repeat: Infinity, delay: b.delay }}
        />
      ))}

      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle,rgba(124,111,255,0.08) 1px,transparent 1px)", backgroundSize: "38px 38px", zIndex: 0 }} />

      {/* Desktop sidebar */}
      <div className="hidden lg:block relative z-20">
        <motion.aside
          animate={{ width: collapsed ? 72 : 240 }}
          transition={{ type: "spring", stiffness: 350, damping: 28, mass: 1 }}
          className="flex flex-col h-full overflow-hidden rounded-3xl no-scrollbar"
          style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(24px)", border: "1.5px solid rgba(255,255,255,0.8)", boxShadow: "0 8px 32px rgba(108,99,255,0.08)" }}
        >
          <SidebarContent />
        </motion.aside>
        <SidebarToggle />
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 lg:hidden" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
              onClick={() => setMobileOpen(false)} />
            <motion.aside key="mobile-sidebar" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-0 top-0 bottom-0 w-64 z-40 lg:hidden flex flex-col"
              style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", borderRight: "1.5px solid rgba(255,255,255,0.9)", boxShadow: "8px 0 40px rgba(0,0,0,0.1)" }}>
              <SidebarContent isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 rounded-3xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(18px)", border: "1.5px solid rgba(255,255,255,0.7)", boxShadow: "0 8px 32px rgba(108,99,255,0.04)" }}>

        {/* Topbar */}
        <motion.header initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 px-4 sm:px-6 py-3.5 flex-shrink-0 sticky top-0 z-20"
          style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(10px)", borderBottom: "1.5px solid rgba(255,255,255,0.6)" }}>

          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(108,99,255,0.2),transparent)" }} />

          <motion.button className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124,111,255,0.1)", border: "1px solid rgba(124,111,255,0.2)" }}
            whileTap={{ scale: 0.93 }} onClick={() => setMobileOpen(o => !o)}>
            <HamburgerIcon open={mobileOpen} />
          </motion.button>

          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.h1 key={pageTitle} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="text-lg font-bold truncate"
                style={{ fontFamily: "'Rajdhani',sans-serif", color: "#2d2b55", letterSpacing: "0.04em" }}>
                {pageTitle}
              </motion.h1>
            </AnimatePresence>
          </div>

          <motion.div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300"
            style={{ background: "rgba(255,255,255,0.5)", border: "1.5px solid rgba(108,99,255,0.1)", width: 220 }}>
            <Search size={13} style={{ color: "#3d3b56" }} />
            <input value={searchVal} onChange={e => setSearchVal(e.target.value)} placeholder="Search..."
              className="bg-transparent outline-none text-sm flex-1" style={{ color: "#2d2b55", fontFamily: "'DM Sans',sans-serif" }} />
          </motion.div>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.93 }}
              onClick={() => setNotifOpen(o => !o)}
              className="w-9 h-9 rounded-xl flex items-center justify-center relative"
              style={{ background: "rgba(108,99,255,0.07)", border: "1.5px solid rgba(108,99,255,0.12)", color: "#7c6fff" }}>
              <motion.div animate={{ rotate: notifOpen ? [0, -12, 12, -8, 8, 0] : 0 }} transition={{ duration: 0.5 }}>
                <Bell size={15} />
              </motion.div>
              <motion.span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white flex items-center justify-center"
                style={{ background: "#f472b6", fontSize: 9, fontWeight: 700 }}
                animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>3</motion.span>
            </motion.button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.94 }} transition={{ duration: 0.2 }}
                  className="absolute right-0 top-12 w-72 rounded-2xl p-3 z-50"
                  style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", border: "1.5px solid rgba(255,255,255,0.9)", boxShadow: "0 16px 50px rgba(0,0,0,0.1)" }}>
                  <div className="absolute top-0 left-4 right-4 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(108,99,255,0.25),transparent)" }} />
                  <p className="text-xs font-bold px-2 mb-3" style={{ color: "#7c6fff", fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.08em" }}>NOTIFICATIONS</p>
                  {notifications.map((n, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }} whileHover={{ backgroundColor: "rgba(124,111,255,0.07)" }}
                      className="flex items-start gap-2.5 px-2.5 py-2.5 rounded-xl transition-colors cursor-pointer">
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: n.dot, boxShadow: `0 0 6px ${n.dot}` }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: "#2d2b55" }}>{n.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#5a5880" }}>{n.sub}</p>
                      </div>
                      <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: "#9ca3af" }}>{n.time}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setProfileOpen(o => !o)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
              style={{ background: "rgba(108,99,255,0.07)", border: "1.5px solid rgba(108,99,255,0.12)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "linear-gradient(135deg,#7c6fff,#34d4e0)", boxShadow: "0 0 10px rgba(124,111,255,0.4)" }}>
                {(user?.name || "A").charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold leading-tight" style={{ color: "#2d2b55" }}>{user?.name || "Admin"}</p>
                <p className="text-xs leading-tight" style={{ color: "#5a5880" }}>Admin</p>
              </div>
              <motion.div animate={{ rotate: profileOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                <ChevronDown size={12} style={{ color: "#3d3b56" }} />
              </motion.div>
            </motion.button>
            <AnimatePresence>
              {profileOpen && (
                <motion.div initial={{ opacity: 0, y: 10, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.94 }} transition={{ duration: 0.2 }}
                  className="absolute right-0 top-12 w-48 rounded-2xl p-2 z-50"
                  style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", border: "1.5px solid rgba(255,255,255,0.9)", boxShadow: "0 16px 50px rgba(0,0,0,0.1)" }}>
                  <div className="absolute top-0 left-4 right-4 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(108,99,255,0.25),transparent)" }} />
                  {[
                    { label: "My profile", icon: Users, path: "/admin/settings" },
                    { label: "Settings", icon: Settings, path: "/admin/settings" },
                  ].map(({ label, icon: Icon, path }) => (
                    <motion.button key={label} onClick={() => { navigate(path); setProfileOpen(false); }}
                      whileHover={{ backgroundColor: "rgba(124,111,255,0.08)", x: 3 }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left" style={{ color: "#6b6987" }}>
                      <Icon size={14} style={{ color: "#7c6fff" }} />
                      {label}
                    </motion.button>
                  ))}
                  <div style={{ borderTop: "1px solid rgba(0,0,0,0.05)", margin: "4px 0" }} />
                  <motion.button onClick={handleLogout}
                    whileHover={{ backgroundColor: "rgba(244,114,182,0.08)", x: 3 }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left" style={{ color: "#f472b6" }}>
                    <LogOut size={14} />
                    Log out
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname}
              initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   SUB-PAGE EXPORTS
════════════════════════════════════════════ */
export { AdminOverview };

const mapDocumentToItem = (doc) => {
  let icon = Files;
  let badge = "Indexed";

  if (doc.status === "processing") {
    icon = Database;
    badge = "Processing";
  } else if (doc.status === "failed") {
    icon = AlertCircle;
    badge = "Failed";
  } else if (doc.status === "ready") {
    icon = Files;
    badge = "Ready";
  } else if (doc.status === "reindexing") {
    icon = RefreshCw;
    badge = "Syncing";
  }

  const mb = doc.fileSize ? (doc.fileSize / (1024 * 1024)).toFixed(2) + " MB" : "";
  const sub = doc.status === "failed"
    ? (doc.processingError || "Processing failed")
    : `${doc.chunkCount || 0} chunks ${mb ? `· ${mb}` : ""}`;

  return {
    id: doc._id,
    icon,
    title: doc.name || doc.originalName,
    sub,
    badge,
    rawStatus: doc.status
  };
};

export function AdminUpload() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialFetch = useRef(true);

  const fetchRecent = async () => {
    // Only show the loading spinner on the very first fetch
    if (initialFetch.current) setLoading(true);
    try {
      const res = await axios.get("/api/documents?limit=100");
      const docsArray = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.documents || []);
      const mapped = docsArray.map(mapDocumentToItem);
      setItems(mapped);
    } catch (err) {
      if (err.response?.status !== 429) console.error(err);
    } finally {
      if (initialFetch.current) {
        setLoading(false);
        initialFetch.current = false;
      }
    }
  };

  useEffect(() => { fetchRecent(); }, []);

  // Always poll — documents can take minutes to embed
  useEffect(() => {
    const hasProcessing = items.some(i => i.rawStatus === "processing" || i.rawStatus === "reindexing");
    // Poll faster when something is processing, slower otherwise for background refresh
    const interval = setInterval(fetchRecent, hasProcessing ? 5000 : 30000);
    return () => clearInterval(interval);
  }, [items]);

  const handleFiles = async (files) => {
    if (!files || !files.length) return;

    for (let f of files) {
      const toastId = showToast.loading(`Uploading ${f.name}...`);
      const fd = new FormData();
      fd.append("file", f);
      try {
        await axios.post("/api/documents/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        showToast.updateSuccess(toastId, `${f.name} uploaded — embedding in progress...`);
        await fetchRecent();
      } catch (err) {
        console.error(err);
        const errMsg = err.response?.data?.message || `Failed to upload ${f.name}`;
        showToast.updateError(toastId, errMsg);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <UploadDropzone onFilesSelected={handleFiles} />

      {loading ? (
        <div className="flex justify-center p-8"><Activity className="animate-spin text-[#7c6fff]" /></div>
      ) : (
        <DocumentList
          title="Uploaded Documents"
          icon={FileUp}
          color="#7c6fff"
          description="Monitor your uploaded documents. These files are processed through the RAG pipeline automatically."
          items={items}
          perPage={5}
        />
      )}
    </motion.div>
  );
}

export function AdminDocuments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const initialFetch = useRef(true);

  const fetchDocs = async () => {
    // Only block UI with spinner on the first load; background refreshes are silent
    if (initialFetch.current) setLoading(true);
    try {
      const res = await axios.get("/api/documents?limit=100");
      const docsArray = Array.isArray(res.data.data) ? res.data.data : (res.data.data?.documents || []);
      setItems(docsArray.map(mapDocumentToItem));
    } catch (err) {
      if (err.response?.status !== 429) {
        console.error(err);
        if (initialFetch.current) showToast.error("Failed to load documents");
      }
    } finally {
      if (initialFetch.current) {
        setLoading(false);
        initialFetch.current = false;
      }
    }
  };

  useEffect(() => { fetchDocs(); }, []);

  // Auto-poll: fast when processing, slow otherwise for background auto-update
  useEffect(() => {
    const hasProcessing = items.some(i => i.rawStatus === "processing" || i.rawStatus === "reindexing");
    const interval = setInterval(fetchDocs, hasProcessing ? 5000 : 30000);
    return () => clearInterval(interval);
  }, [items]);

  const handleDelete = (item) => {
    setDeleteModal({ open: true, item });
  };

  const confirmDelete = async () => {
    const doc = deleteModal.item;
    setDeleteModal({ open: false, item: null });
    if (!doc.id) return;

    try {
      await axios.delete(`/api/documents/${doc.id}`);
      showToast.success(`${doc.title} deleted successfully`);
      fetchDocs();
    } catch (err) {
      console.error(err);
      showToast.error(`Failed to delete ${doc.title}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <motion.button onClick={fetchDocs} disabled={loading}
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold bg-white border border-gray-200 shadow-sm text-gray-700"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </motion.button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Activity className="animate-spin text-[#34d4e0] w-8 h-8" /></div>
      ) : (
        <DocumentList
          title="Document Library"
          icon={Files}
          color="#34d4e0"
          description="Browse all indexed SOP documents. Manage your vector search index settings and document lifecycle here."
          items={items}
          perPage={5}
          onDelete={handleDelete}
        />
      )}

      <DeleteConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onConfirm={confirmDelete}
        itemName={deleteModal.item?.title}
      />
    </div>
  );
}

export function AdminChatLogs() {
  const items = [
    { icon: MessageSquare, title: "priya@zaalima.com", sub: '"How do I apply for leave?" — answered in 1.4s', badge: "Resolved" },
    { icon: MessageSquare, title: "arjun@zaalima.com", sub: '"What is the refund window?" — 3 sources cited', badge: "Resolved" },
    { icon: AlertCircle, title: "ravi@zaalima.com", sub: '"What is the CEO salary?" — hallucination blocked', badge: "Blocked" },
    { icon: MessageSquare, title: "meena@zaalima.com", sub: '"How to reset password?" — answered in 0.9s', badge: "Resolved" },
    { icon: Clock, title: "dev@zaalima.com", sub: '"List all IT policies" — streaming timeout', badge: "Timeout" },
    { icon: MessageSquare, title: "sanjay@zaalima.com", sub: '"Refund process steps?" — answered in 1.1s', badge: "Resolved" },
    { icon: MessageSquare, title: "anita@zaalima.com", sub: '"Leave balance query?" — answered in 0.7s', badge: "Resolved" },
  ];
  return <PaginatedList title="Chat Logs" icon={MessageSquare} color="#c084fc"
    description="Review all employee queries, AI responses, retrieved SOP source chunks, and hallucination guard activations. Export logs for compliance audits."
    items={items} perPage={5} />;
}

export function AdminPipeline() {
  const items = [
    { icon: CheckCircle2, title: "HR_Policy_2025.pdf", sub: "48 chunks embedded · Gemini text-embedding-004", badge: "Complete", progress: 100 },
    { icon: CheckCircle2, title: "Refund_Policy_v3.pdf", sub: "62 chunks embedded · 1.8s pipeline time", badge: "Complete", progress: 100 },
    { icon: RefreshCw, title: "Onboarding_Handbook.pdf", sub: "Processing chunk 14 / 55…", badge: "Running", progress: 45 },
    { icon: Clock, title: "IT_Security_Guidelines.pdf", sub: "Queued — starts after current job", badge: "Queued", progress: 0 },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Pipeline Real-time Status" color="#34d4e0" />
      <div className="grid gap-4">
        {items.map((item, i) => (
          <EmbeddingProgress
            key={i}
            badge={item.badge}
            progress={item.progress}
            fileName={item.title}
          />
        ))}
      </div>

      <div className="mt-10">
        <PaginatedList title="Job History" icon={Activity} color="#c084fc"
          description="Detailed log of all historical embedding jobs and pipeline performance metrics."
          items={items} perPage={4} />
      </div>
    </div>
  );
}

export function AdminAnalytics() {
  const items = [
    { icon: TrendingUp, title: "Total queries this week", sub: "2,148 queries across 28 users", badge: "+18%" },
    { icon: CheckCircle2, title: "Avg RAG response time", sub: "1.24s median · 3.1s p99", badge: "Healthy" },
    { icon: Shield, title: "Hallucination guard trips", sub: "3 blocked this week (0.14%)", badge: "Low" },
    { icon: Database, title: "Most queried document", sub: "HR_Policy_2025.pdf — 412 hits", badge: "Top Doc" },
    { icon: Zap, title: "Token usage (Gemini Flash)", sub: "1.2M tokens · within free tier limit", badge: "On Track" },
  ];
  return <PaginatedList title="Analytics" icon={TrendingUp} color="#f472b6"
    description="Query volume, RAG response latency, hallucination guard activations, top documents, and token usage metrics for the OpsMind AI pipeline."
    items={items} perPage={4} />;
}

export function AdminUsers() {
  const items = [
    { icon: Users, title: "priya@zaalima.com", sub: "Employee · 48 queries this week", badge: "Active" },
    { icon: Users, title: "arjun@zaalima.com", sub: "Employee · 22 queries this week", badge: "Active" },
    { icon: Users, title: "ravi@zaalima.com", sub: "Employee · 5 queries this week", badge: "Active" },
    { icon: Users, title: "meena@zaalima.com", sub: "Employee · 0 queries — invited", badge: "Pending" },
    { icon: Shield, title: "admin@opsmind.ai", sub: "Admin · Full system access", badge: "Admin" },
    { icon: Users, title: "sanjay@zaalima.com", sub: "Employee · 12 queries this week", badge: "Active" },
    { icon: Users, title: "anita@zaalima.com", sub: "Employee · 8 queries this week", badge: "Active" },
  ];
  return <PaginatedList title="User Management" icon={Users} color="#f472b6"
    description="Manage employee accounts, assign roles (Employee / Admin), invite new users, revoke access, and monitor per-user query activity."
    items={items} perPage={4} />;
}

export function AdminSettings() {
  const items = [
    { icon: Database, title: "MongoDB Atlas", sub: "Vector Search · Cluster M0 Free Tier", badge: "Connected" },
    { icon: Brain, title: "Gemini 1.5 Flash", sub: "LLM · text-embedding-004 · Google AI Studio", badge: "Active" },
    { icon: Zap, title: "RAG Chunk Size", sub: "1000 chars · 100 overlap · cosine similarity", badge: "Default" },
    { icon: Shield, title: "Hallucination Guard", sub: "Enabled · Strict mode · No-answer fallback", badge: "Enabled" },
    { icon: Settings, title: "Stripe Subscription", sub: "Free tier · Upgrade for advanced features", badge: "Free" },
  ];
  return <PaginatedList title="Settings" icon={Settings} color="#7c6fff"
    description="Configure RAG pipeline parameters, chunk size & overlap, embedding model, hallucination guard, Stripe subscription, and system preferences."
    items={items} perPage={4} />;
}
