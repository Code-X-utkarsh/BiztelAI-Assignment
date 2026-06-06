import React from "react";
import { useLocation } from "react-router-dom";

const titles = {
  "/upload": "Upload Document",
  "/review": "Review",
  "/history": "History",
  "/dashboard": "Dashboard",
};

export default function Navbar() {
  const location = useLocation();
  const base = location.pathname.split("/")[1];
  const title = titles[`/${base}`] || "BiztelAI DocFlow";
  return (
    <header style={{
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        height: "60px"
      }} className="flex items-center justify-between px-6">
      <div className="text-white/80 font-semibold text-sm uppercase tracking-widest">{title}</div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400"></div>
        <span className="text-green-400 text-xs font-semibold px-2 py-1 bg-green-400/10 rounded-full border border-green-400/20">System Online</span>
      </div>
    </header>
  );
}
