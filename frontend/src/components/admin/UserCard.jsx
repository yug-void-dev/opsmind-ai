import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Users, MessageSquare, Clock,
  Activity, ChevronDown, 
  Search, Crown
} from "lucide-react";

/* ── Status config ── */
const STATUS_CFG = {
  active: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", border: "rgba(34,197,94,0.28)", dot: "#22c55e", label: "Active", pulse: false },
  pending: { bg: "rgba(245,158,11,0.12)", text: "#b45309", border: "rgba(245,158,11,0.3)", dot: "#f59e0b", label: "Pending", pulse: true },
  inactive: { bg: "rgba(239,68,68,0.12)", text: "#dc2626", border: "rgba(239,68,68,0.28)", dot: "#ef4444", label: "Inactive", pulse: false },
};

/* ── Role config ── */
const ROLE_CFG = {
  admin: { bg: "rgba(124,111,255,0.12)", text: "#6c63ff", border: "rgba(124,111,255,0.3)", icon: Crown, label: "Admin" },
  employee: { bg: "rgba(52,212,224,0.12)", text: "#0891b2", border: "rgba(52,212,224,0.3)", icon: Users, label: "Employee" },
};

/* ── Helpers ── */
function getAvatarGradient(name = "") {
  const gradients = [
    ["#7c6fff", "#34d4e0"],
    ["#c084fc", "#f472b6"],
    ["#34d4e0", "#7c6fff"],
    ["#f472b6", "#c084fc"],
    ["#7c6fff", "#c084fc"],
  ];
  const idx = (name.charCodeAt(0) || 0) % gradients.length;
  return gradients[idx];
}

function getInitials(name = "") {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";
}

export default function UserCard({ user, delay = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);

  const sc = STATUS_CFG[user.status] || STATUS_CFG.active;
  const rc = ROLE_CFG[user.role] || ROLE_CFG.employee;
  const RoleIcon = rc.icon;
  const [gradFrom, gradTo] = getAvatarGradient(user.name);
  const initials = getInitials(user.name);

  const queryBar = Math.min((user.queries || 0) / 100, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative rounded-3xl cursor-default select-none overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(24px)",
        border: "1.5px solid rgba(255,255,255,0.85)",
        boxShadow: hovered ? "0 20px 50px rgba(0,0,0,0.1)" : "0 8px 32px rgba(0,0,0,0.05)",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg,${gradFrom},${gradTo},${gradFrom})` }} />

      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg" 
            style={{ background: user.avatar ? "transparent" : `linear-gradient(135deg,${gradFrom},${gradTo})` }}>
            {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-2xl" /> : initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-base font-bold truncate" style={{ color: "#2d2b55" }}>{user.name}</h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: rc.bg, color: rc.text }}>
                <RoleIcon size={9} /> {rc.label}
              </span>
            </div>
            <p className="text-xs truncate" style={{ color: "#5a5880" }}>{user.email}</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: sc.bg, color: sc.text }}>
              {sc.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatPill icon={MessageSquare} label="Queries" value={user.queries ?? 0} color="#7c6fff" />
          <StatPill icon={Clock} label="Last Active" value={user.lastActive ?? "—"} color="#34d4e0" />
          <StatPill icon={Activity} label="Joined" value={formatDate(user.joinedAt)} color="#c084fc" />
        </div>

        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9ca3af" }}>
            <span>Query Activity</span>
            <span>{user.queries ?? 0} total</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.05)" }}>
            <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.max(queryBar * 100, 3)}%` }} 
              style={{ background: `linear-gradient(90deg,${gradFrom},${gradTo})` }} />
          </div>
        </div>

        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold" 
          style={{ border: "1px dashed rgba(0,0,0,0.1)", color: "#9ca3af" }}>
          {expanded ? "Show less" : "More details"} <ChevronDown size={12} style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-4 space-y-3">
              <DetailRow label="User ID" value={user.id} />
              <DetailRow label="Joined" value={formatDate(user.joinedAt, true)} />
              <DetailRow label="Status" value={sc.label} />
              <DetailRow label="Last Active" value={user.lastActive ?? "Never"} />
              <DetailRow label="Email" value={user.email} />
              <DetailRow label="Role" value={rc.label} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(0,0,0,0.05)" }}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#9ca3af" }}>
        <Icon size={11} style={{ color }} /> {label}
      </div>
      <p className="text-sm font-bold truncate w-full" style={{ color: "#2d2b55" }}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="font-bold uppercase tracking-wider" style={{ color: "#9ca3af" }}>{label}</span>
      <span className="font-semibold text-[#2d2b55] truncate">{value}</span>
    </div>
  );
}

function formatDate(iso, long = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: long ? "numeric" : "2-digit" });
}

export function UserCardGrid({ users = [], searchQuery = "" }) {
  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  if (filteredUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 rounded-3xl border-2 border-dashed border-gray-200">
        <Search size={32} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-bold text-gray-500">No users found</h3>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
      {filteredUsers.map((u, i) => (
        <UserCard
          key={u.id}
          user={u}
          delay={i * 0.05}
        />
      ))}
    </div>
  );
}
