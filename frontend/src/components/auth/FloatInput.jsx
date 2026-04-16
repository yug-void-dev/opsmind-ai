import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";


export default function FloatInput({ icon: Icon, type, label, name, error, ...rest }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
        <Icon
          size={16}
          className="text-cyan-400/60 group-focus-within:text-cyan-400 transition-colors duration-200"
        />
      </div>
      <input
        type={isPassword ? (show ? "text" : "password") : type}
        name={name}
        placeholder=" "
        className={`peer w-full bg-white/5 border ${error ? "border-red-500/60" : "border-white/10"} rounded-xl px-4 pl-11 pt-6 pb-2 text-white text-sm outline-none focus:border-cyan-400/60 focus:bg-white/8 transition-all duration-300 placeholder-transparent`}
        style={{ backdropFilter: "blur(4px)" }}
        {...rest}
      />
      <label className="absolute left-11 top-1/2 -translate-y-1/2 text-white/40 text-sm pointer-events-none transition-all duration-200 peer-focus:-translate-y-4 peer-focus:text-xs peer-focus:text-cyan-400 peer-not-placeholder-shown:-translate-y-4 peer-not-placeholder-shown:text-xs">
        {label}
      </label>
      {isPassword && (
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-cyan-400 transition-colors duration-200"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      )}
      {error && <p className="text-red-400 text-xs mt-1 ml-1">{error}</p>}
    </div>
  );
}