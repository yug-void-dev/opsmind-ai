import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Brain, Sparkles, Ghost } from "lucide-react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ════════ THREE.JS VOID BACKGROUND ════════ */
function VoidBackground() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 1000);
    camera.position.z = 5;

    // Create floating particles
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 1500; i++) {
      vertices.push(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({
      color: 0x7c6fff,
      size: 0.02,
      transparent: true,
      opacity: 0.6
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Create a rotating torus for a "portal" feel
    const torusGeo = new THREE.TorusGeometry(2, 0.02, 16, 100);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0x34d4e0, transparent: true, opacity: 0.15 });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    scene.add(torus);

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      points.rotation.y += 0.001;
      points.rotation.x += 0.0005;
      torus.rotation.z += 0.005;
      torus.rotation.y += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nW = el.clientWidth, nH = el.clientHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} className="fixed inset-0 z-0 pointer-events-none opacity-60" />;
}

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 overflow-hidden relative" 
      style={{ background: "linear-gradient(145deg,#f5f3ff 0%,#edf9fb 42%,#f8f0ff 100%)" }}>
      
      <VoidBackground />

      {/* Decorative Blobs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 0.9, 1],
          x: [0, 50, -30, 0],
          y: [0, -40, 20, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle,#7c6fff 0%,transparent 70%)" }}
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1.2, 1],
          x: [0, -60, 40, 0],
          y: [0, 30, -50, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle,#34d4e0 0%,transparent 70%)" }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xl text-center"
      >
        {/* Floating 404 */}
        <div className="relative mb-8">
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="text-[12rem] font-black leading-none select-none"
            style={{ 
              fontFamily: "'Rajdhani',sans-serif",
              background: "linear-gradient(135deg,#7c6fff 0%,#34d4e0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 10px 20px rgba(124,111,255,0.2))"
            }}
          >
            404
          </motion.div>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Ghost size={80} className="text-[#2d2b55]/5 animate-pulse" />
          </motion.div>
        </div>

        {/* Content Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="rounded-[2.5rem] p-10 md:p-12 space-y-8"
          style={{ 
            background: "rgba(255,255,255,0.45)", 
            backdropFilter: "blur(20px)", 
            border: "1.5px solid rgba(255,255,255,0.7)",
            boxShadow: "0 20px 50px rgba(108,99,255,0.1)"
          }}
        >
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#7c6fff]"
              style={{ background: "rgba(124,111,255,0.1)", border: "1px solid rgba(124,111,255,0.2)" }}
            >
              <Sparkles size={14} />
              Lost in Transmission
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#2d2b55]" style={{ fontFamily: "'Rajdhani',sans-serif" }}>
              Knowledge Not Found
            </h1>
            <p className="text-[#5a5880] text-sm md:text-base max-w-sm mx-auto leading-relaxed">
              The SOP document or page you're looking for has drifted into another dimension. 
              Let's get you back to the system.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold transition-all"
              style={{ background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(124,111,255,0.2)", color: "#7c6fff" }}
            >
              <ArrowLeft size={18} /> Go Back
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2, boxShadow: "0 10px 25px rgba(124,111,255,0.3)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold text-white transition-all shadow-lg"
              style={{ background: "linear-gradient(135deg,#7c6fff,#34d4e0)" }}
            >
              <Home size={18} /> Return Home
            </motion.button>
          </div>
        </motion.div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.2 }}
          className="mt-8 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#5a5880]"
        >
          <Brain size={12} />
          <span>OpsMind AI Knowledge Node • Protocol 404</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
