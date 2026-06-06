import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Upload, Clock, BarChart2 } from "lucide-react";

const links = [
  { to: "/upload", label: "Upload Document", icon: <Upload size={20} /> },
  { to: "/history", label: "History", icon: <Clock size={20} /> },
  { to: "/dashboard", label: "Dashboard", icon: <BarChart2 size={20} /> },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside style={{
        background: "rgba(255, 255, 255, 0.04)",
        backdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        width: "240px"
      }} className="text-white flex flex-col p-4">
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold" style={{
          background: "linear-gradient(135deg, #6366f1, #06b6d4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>BiztelAI</h2>
        <div className="text-white/40 text-sm">DocFlow</div>
      </div>
      
      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const isActive = location.pathname.startsWith(link.to);
          return (
            <NavLink
              key={link.to}
              to={link.to}
              style={isActive ? {
                background: "rgba(99, 102, 241, 0.2)",
                color: "#818cf8",
                border: "1px solid rgba(99, 102, 241, 0.3)"
              } : {}}
              className={`flex items-center p-2 mx-1 rounded-[10px] text-[14px] font-medium transition-all duration-150 ${
                isActive ? "" : "text-white/50 hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.icon}
              <span className="ml-3">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
      
      <div className="text-white/20 text-[11px] mt-auto">AI Document Engine</div>
    </aside>
  );
}
