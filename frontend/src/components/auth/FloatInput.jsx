import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";


export default function FloatInput({ icon: Icon, type, label, name, value, onChange, onInput, ...props }) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  const id = `fi-${name}`;
  return (
    <div className="relative group ">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
        <Icon size={15} style={{ color: "#b3b0d0", transition: "color .2s" }} className="group-focus-within:text-violet-500!" />
      </div>
      <input id={id} type={isPass ? (show ? "text" : "password") : type} name={name} placeholder=" " onInput={onInput} value={value} onChange={onChange} {...props}
        className="peer w-full rounded-xl px-4 pl-11 pt-6.5 pb-2 text-[13.5px] outline-none transition-all duration-300 placeholder-transparent"
        style={{ color: "#2d2b55", background: "rgba(108,99,255,0.04)", border: "1.5px solid rgba(108,99,255,0.12)", fontFamily: "'DM Sans',sans-serif" }}
        onFocus={e => { e.target.style.border = "1.5px solid rgba(108,99,255,0.4)"; e.target.style.background = "rgba(108,99,255,0.07)"; e.target.style.boxShadow = "0 0 0 4px rgba(108,99,255,0.05)"; }}
        onBlur={e => { e.target.style.border = "1.5px solid rgba(108,99,255,0.12)"; e.target.style.background = "rgba(108,99,255,0.04)"; e.target.style.boxShadow = "none"; }}
      />
      <label htmlFor={id} className="absolute left-11 top-1/2 -translate-y-1/2 text-sm pointer-events-none transition-all duration-200 peer-focus:top-3.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-bold peer-not-placeholder-shown:top-3.5 peer-not-placeholder-shown:-translate-y-0 peer-not-placeholder-shown:text-[11px] peer-not-placeholder-shown:font-bold" style={{ color: "#8b8aae", letterSpacing: "0.02em" }}>
        {label}
      </label>
      {isPass && <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: "#c0bedd" }}>{show ? <EyeOff size={14} /> : <Eye size={14} />}</button>}
      <style>{`#${id}:focus+label,#${id}:not(:placeholder-shown)+label{color:#6c63ff;}`}</style>
    </div>
  );
}
