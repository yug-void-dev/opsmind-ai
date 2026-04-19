import { motion } from "framer-motion";
import { Upload } from "lucide-react";

export function UploadDropzone({ onFilesSelected }) {
  const handleFileClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".pdf,.docx";
    input.onchange = (e) => {
      if (e.target.files && onFilesSelected) {
        onFilesSelected(Array.from(e.target.files));
      }
    };
    input.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ borderColor: "rgba(124,111,255,0.55)", backgroundColor: "rgba(124,111,255,0.04)" }}
      className="rounded-3xl p-12 mb-8 flex flex-col items-center justify-center gap-4 text-center cursor-pointer transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.4)",
        backdropFilter: "blur(12px)",
        border: "2px dashed rgba(124,111,255,0.25)",
        boxShadow: "0 8px 32px rgba(108,99,255,0.04)",
      }}
      onClick={handleFileClick}
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
        style={{ background: "rgba(124,111,255,0.1)", color: "#7c6fff" }}
      >
        <Upload size={32} />
      </motion.div>
      
      <div>
        <p className="font-bold text-lg mb-1" style={{ color: "#2d2b55", fontFamily: "'Rajdhani',sans-serif" }}>
          Drag & drop SOP PDFs here
        </p>
        <p className="text-sm" style={{ color: "#5a5880" }}>
          or <span className="text-[#7c6fff] font-semibold underline decoration-2 underline-offset-4 cursor-pointer">browse your files</span>
        </p>
        <p className="text-xs mt-4 px-4 py-1.5 rounded-full inline-block" style={{ background: "rgba(108,99,255,0.08)", color: "#7c6fff", border: "1px solid rgba(108,99,255,0.15)" }}>
          PDF, DOCX · Max 50MB each
        </p>
      </div>

      <motion.button
        className="mt-6 px-8 py-3 rounded-2xl text-sm font-bold text-white shadow-lg"
        style={{
          background: "linear-gradient(135deg,#7c6fff,#34d4e0)",
          boxShadow: "0 8px 20px rgba(124,111,255,0.3)",
        }}
        whileHover={{ scale: 1.05, boxShadow: "0 12px 28px rgba(124,111,255,0.45)" }}
        whileTap={{ scale: 0.96 }}
      >
        Select Documents
      </motion.button>
    </motion.div>
  );
}
