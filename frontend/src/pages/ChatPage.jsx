import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, BookOpen, Sparkles, AlertTriangle, X } from "lucide-react";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import SourcesPanel from "../components/chat/SourcesPanel"; 
import { useChat } from "../hooks/useChat";
import { useDocuments } from "../hooks/useDocuments";
import useAuth from "../hooks/useAuth";
import * as THREE from "three";

const DEFAULT_PROMPTS = [
  { icon: "📋", text: "How do I process a customer refund?" },
  { icon: "🔒", text: "What is the data security policy for remote work?" },
  { icon: "🧾", text: "Walk me through the employee onboarding checklist." },
  { icon: "🚨", text: "What are the incident response procedures?" },
];

function EmptyState({ onPrompt, documents = [], loading = false }) {
  const prompts = useMemo(() => {
    if (loading) return DEFAULT_PROMPTS; // Keep defaults while loading to avoid flicker
    if (documents && documents.length > 0) {
      const icons = ["📊", "🔍", "💡", "🛡️"];
      return documents.slice(0, 4).map((doc, i) => {
        const name = doc.name || doc.originalName || "Document";
        return {
          icon: icons[i % icons.length],
          text: `Tell me about ${name}`,
          fullQuery: `Can you give me a summary and key points from the document "${name}"?`
        };
      });
    }
    return DEFAULT_PROMPTS;
  }, [documents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full px-8 text-center"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-3xl bg-[#7c6fff]/20 blur-2xl scale-150" />
        <div
          className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
          style={{
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(124,111,255,0.25)",
          }}
        >
          <Brain size={34} className="text-[#7c6fff]" />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2 tracking-tight" style={{ color: "#2d2b55" }}>OpsMind AI</h2>
      <p className="text-sm max-w-sm leading-relaxed mb-10" style={{ color: "#5a5880" }}>
        Your context-aware corporate knowledge brain. Ask anything — I'll cite the exact SOP source.
      </p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {prompts.map((p, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPrompt(p.fullQuery || p.text)}
            className="flex items-start gap-2.5 p-3.5 rounded-xl text-left text-xs transition-all shadow-sm"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(124,111,255,0.15)",
              color: "#5a5880",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(124,111,255,0.08)";
              e.currentTarget.style.borderColor = "rgba(124,111,255,0.3)";
              e.currentTarget.style.color = "#7c6fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.7)";
              e.currentTarget.style.borderColor = "rgba(124,111,255,0.15)";
              e.currentTarget.style.color = "#5a5880";
            }}
          >
            <span className="text-base">{p.icon}</span>
            <span className="leading-relaxed">{p.text}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* ── ENHANCED THREE.JS BACKGROUND ── */
function MeshBackground() {
  const ref = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    camera.position.z = 8;

    // Particles
    const geo = new THREE.BufferGeometry();
    const count = 200;
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 25;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      sizes[i] = Math.random();
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Custom Sprite for Glow
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.2, "rgba(124,111,255,0.8)");
    grad.addColorStop(0.5, "rgba(124,111,255,0.2)");
    grad.addColorStop(1, "rgba(124,111,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);

    const dotMat = new THREE.PointsMaterial({
      size: 0.15,
      map: tex,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dots = new THREE.Points(geo, dotMat);
    scene.add(dots);

    // Connecting Lines
    const linePts = [];
    for (let i = 0; i < 20; i++) {
      linePts.push(new THREE.Vector3((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 5));
      linePts.push(new THREE.Vector3((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 5));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x34d4e0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    const onMouseMove = (e) => {
      mouse.current.x = (e.clientX / W - 0.5) * 2;
      mouse.current.y = -(e.clientY / H - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    let t = 0, raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.005;
      
      dots.rotation.y = t * 0.05;
      dots.rotation.x = t * 0.02;
      
      // Parallax
      dots.position.x += (mouse.current.x * 0.5 - dots.position.x) * 0.05;
      dots.position.y += (mouse.current.y * 0.5 - dots.position.y) * 0.05;
      
      lines.rotation.y = t * 0.03;
      lines.position.x += (mouse.current.x * 0.3 - lines.position.x) * 0.05;
      
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
      window.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} className="fixed inset-0 pointer-events-none" style={{ zIndex: 40 }} />;
}

export default function ChatPage() {
  const { 
    sessions, 
    activeSessionId, 
    messages, 
    isStreaming, 
    error, 
    loading,
    sendMessage: hookSendMessage, 
    stopStreaming, 
    loadSession, 
    deleteSession, 
    clearChat,
    clearError
  } = useChat();
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [activeSources, setActiveSources] = useState([]);
  const [activeCitation, setActiveCitation] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  useEffect(() => {
    const fetchStarterDocs = async () => {
      setDocsLoading(true);
      try {
        // Fetch most recent documents to generate suggestions
        const res = await api.get("/api/documents?limit=8");
        const documents = Array.isArray(res) ? res : (res?.documents || []);
        setDocs(documents.filter(d => d.status === 'ready' || d.status === 'indexed'));
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      } finally {
        setDocsLoading(false);
      }
    };
    fetchStarterDocs();
  }, []);

  // Track sources from the LAST assistant message (always the current one)
  useEffect(() => {
    if (messages.length === 0) return;
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const sources = lastAssistant.sources || [];
    setActiveSources(sources);

    if (sources.length > 0) {
      setShowSources(true); // Auto-open when sources exist
    } else {
      // Auto-close panel when the latest answer has no sources
      // This happens when AI says "I don't know" (no relevant docs found)
      setShowSources(false);
    }
  }, [messages]);

  const handleCitationClick = (n, source, allSources) => {
    // Set panel to show ALL sources from that message, then expand the clicked one
    if (allSources?.length > 0) {
      setActiveSources(allSources);
    } else if (source) {
      setActiveSources([source]);
    }
    setActiveCitation(n);
    setShowSources(true);
  };

  // Wrap sendMessage to clear sources when a new message is sent
  const sendMessage = (text) => {
    setActiveSources([]);
    setActiveCitation(null);
    hookSendMessage(text);
  };

  const handleNewChat = () => {
    clearChat();
    setActiveSources([]);
    setShowSources(false);
    setActiveCitation(null);
  };

  return (
    <div
      className="flex h-screen overflow-hidden relative"
      style={{ background: "linear-gradient(145deg,#f5f3ff 0%,#edf9fb 42%,#f8f0ff 100%)", fontFamily: "'DM Sans', sans-serif" }}
    >
      <MeshBackground />

      {/* Ambient orbs */}
      {[
        { color: "rgba(124,111,255,0.15)", size: 600, top: "-10%", left: "-5%", delay: 0 },
        { color: "rgba(52,212,224,0.12)", size: 500, top: "45%", left: "55%", delay: 5 },
        { color: "rgba(192,132,252,0.12)", size: 450, top: "70%", left: "10%", delay: 3 },
      ].map((b, i) => (
        <motion.div key={i} className="fixed rounded-full pointer-events-none"
          style={{ width: b.size, height: b.size, top: b.top, left: b.left, background: `radial-gradient(circle,${b.color} 0%,transparent 70%)`, filter: "blur(80px)", zIndex: 0 }}
          animate={{ scale: [1, 1.1, 0.9, 1], x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
          transition={{ duration: 20, repeat: Infinity, delay: b.delay }}
        />
      ))}

      <div className="fixed inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle,rgba(124,111,255,0.08) 1px,transparent 1px)", backgroundSize: "40px 40px", zIndex: 0 }} />

      <div className="relative z-10 flex w-full h-full p-3 sm:p-4 gap-3 sm:gap-4">
        <ChatSidebar 
          sessions={sessions} 
          activeSessionId={activeSessionId} 
          onNewChat={handleNewChat} 
          onLoadSession={loadSession} 
          onDeleteSession={deleteSession} 
          collapsed={sidebarCollapsed} 
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)} 
        />

        <div className="flex-1 flex flex-col min-w-0 rounded-3xl overflow-hidden shadow-sm"
          style={{ background: "rgba(255,255,255,0.45)", backdropFilter: "blur(20px)", border: "1.5px solid rgba(255,255,255,0.7)" }}>
          
          {/* Top bar */}
          <header
            className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-20"
            style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)", borderColor: "rgba(0,0,0,0.03)" }}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles size={16} className="text-[#7c6fff]" />
              <span className="text-sm font-bold tracking-tight" style={{ color: "#2d2b55", fontFamily: "'Rajdhani', sans-serif", fontSize: "16px" }}>
                {activeSessionId ? sessions.find((s) => s._id === activeSessionId)?.title || "Chat Session" : "New Chat"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSources((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm"
                style={showSources
                  ? { background: "rgba(124,111,255,0.15)", border: "1.5px solid rgba(124,111,255,0.3)", color: "#7c6fff" }
                  : { background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(124,111,255,0.1)", color: "#5a5880" }}
              >
                <BookOpen size={14} />Sources
                {activeSources.length > 0 && <span className="ml-1 w-4 h-4 bg-[#7c6fff] rounded-full text-[9px] flex items-center justify-center text-white">{activeSources.length}</span>}
              </button>
            </div>
          </header>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="flex items-center gap-2.5 px-6 py-3 text-rose-500 text-xs border-b"
                style={{ background: "rgba(251,113,133,0.08)", borderColor: "rgba(251,113,133,0.15)", backdropFilter: "blur(12px)" }}
              >
                <AlertTriangle size={14} /><span className="flex-1 font-bold uppercase tracking-wider">{error}</span>
                <button onClick={clearError} className="p-1 hover:bg-rose-100 rounded-lg transition-colors"><X size={14} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-8 h-8 border-4 border-[#7c6fff] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest text-[#9ca3af]">Loading Messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <EmptyState onPrompt={(text) => sendMessage(text)} documents={docs} loading={docsLoading} />
            ) : (
              <>{messages.map((msg) => <ChatMessage key={msg.id} message={msg} onCitationClick={handleCitationClick} />)}<div ref={messagesEndRef} /></>
            )}
          </div>

          <ChatInput onSend={sendMessage} onStop={stopStreaming} isStreaming={isStreaming} disabled={false} />
        </div>

        <AnimatePresence>
          {showSources && <SourcesPanel sources={activeSources} activeCitation={activeCitation} onClose={() => setShowSources(false)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}