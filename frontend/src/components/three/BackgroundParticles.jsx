import { motion } from "framer-motion";

export default function FloatParticle({ color, style }) {
  return <motion.div className="fixed rounded-full pointer-events-none z-0" style={{ width: 4, height: 4, background: color, ...style }} animate={{ y: [0, -100, 0], opacity: [0, .75, 0], scale: [.5, 1.3, .5] }} transition={{ duration: style.dur ?? 7, repeat: Infinity, delay: style.delay ?? 0, ease: "easeInOut" }} />;
}