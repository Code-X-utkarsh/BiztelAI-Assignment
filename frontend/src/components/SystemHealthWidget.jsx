import React, { useState, useEffect } from "react";
import api from "../api/axios";

export default function SystemHealthWidget() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchHealth = async () => {
    try {
      const response = await api.get("/debug/env");
      setHealth(response.data);
      setError(false);
    } catch (err) {
      console.error("System health check failed:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const isOk = !loading && !error && health?.system_ok === true;
  const isFailed = !loading && (error || health?.system_ok === false);

  // Status colors & labels
  const glowColor = loading
    ? "rgba(107, 114, 128, 0.3)"
    : isOk
    ? "rgba(16, 185, 129, 0.45)"
    : "rgba(239, 68, 68, 0.45)";

  const screenBg = loading
    ? "rgba(31, 41, 55, 0.6)"
    : isOk
    ? "rgba(16, 185, 129, 0.12)"
    : "rgba(239, 68, 68, 0.12)";

  const screenStroke = loading
    ? "#374151"
    : isOk
    ? "rgba(16, 185, 129, 0.6)"
    : "rgba(239, 68, 68, 0.6)";

  const robotStroke = loading ? "#4b5563" : isOk ? "#10b981" : "#ef4444";
  const accentColor = loading ? "#6b7280" : isOk ? "#34d399" : "#f87171";

  const statusText = loading
    ? "Checking..."
    : error
    ? "Backend Unreachable"
    : isOk
    ? "All Systems Go"
    : "Check API Keys";

  const geminiOk = !loading && !error && (health?.gemini_status === "ok" || health?.gemini_key_present === true);
  const nvidiaOk = !loading && !error && (health?.nvidia_status === "ok" || health?.nvidia_key_present === true);
  const backendOk = !loading && !error && health?.backend_status === "ok";

  return (
    <div
      className="rounded-xl p-2.5 border border-white/10 flex flex-col justify-between"
      style={{
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(12px)",
        maxHeight: "180px",
        boxShadow: `0 0 16px ${glowColor}`,
        transition: "box-shadow 0.4s ease, border-color 0.4s ease",
      }}
    >
      <style>{`
        @keyframes robotEyePulse {
          0%, 88%, 100% { opacity: 1; }
          93% { opacity: 0.15; }
        }
        .robot-eye-anim {
          animation: robotEyePulse 3.8s infinite ease-in-out;
        }
      `}</style>

      {/* Widget Header */}
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1">
        <span>System Status</span>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
            loading
              ? "text-gray-400 bg-gray-500/10"
              : isOk
              ? "text-emerald-400 bg-emerald-500/10"
              : "text-red-400 bg-red-500/10"
          }`}
        >
          {loading ? "CHECKING" : isOk ? "ONLINE" : "ATTENTION"}
        </span>
      </div>

      {/* Retro Monitor with Robot SVG */}
      <div className="flex justify-center my-0.5">
        <svg
          viewBox="0 0 100 62"
          className="w-24 h-14"
          style={{
            filter: `drop-shadow(0 0 7px ${glowColor})`,
            transition: "filter 0.4s ease",
          }}
        >
          {/* Monitor Stand Base */}
          <path d="M38 55 L62 55 L66 60 L34 60 Z" fill="#1e2436" stroke="#2d3748" strokeWidth="0.6" />
          {/* Monitor Stand Neck */}
          <rect x="46" y="48" width="8" height="7" fill="#252c3f" rx="1" />

          {/* Monitor Outer Shell */}
          <rect
            x="16"
            y="4"
            width="68"
            height="44"
            rx="6"
            ry="6"
            fill="#161b2b"
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* Monitor CRT Screen */}
          <rect
            x="21"
            y="8"
            width="58"
            height="34"
            rx="4"
            fill={screenBg}
            stroke={screenStroke}
            strokeWidth="1"
          />

          {/* Subtle Screen CRT Scanlines/Glare */}
          <line x1="23" y1="11" x2="42" y2="11" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeLinecap="round" />

          {/* Robot Antenna */}
          <line x1="50" y1="19" x2="50" y2="13" stroke={robotStroke} strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="50" cy="12" r="2" fill={accentColor} />

          {/* Robot Head */}
          <rect
            x="36"
            y="19"
            width="28"
            height="18"
            rx="3.5"
            fill="#090d16"
            stroke={robotStroke}
            strokeWidth="1"
          />

          {/* Robot Ears */}
          <rect x="34" y="24" width="2" height="6" rx="0.5" fill={robotStroke} />
          <rect x="64" y="24" width="2" height="6" rx="0.5" fill={robotStroke} />

          {/* Robot Eyes */}
          {loading ? (
            <>
              <circle cx="44" cy="26" r="2" fill="#6b7280" />
              <circle cx="56" cy="26" r="2" fill="#6b7280" />
            </>
          ) : isOk ? (
            <>
              <circle className="robot-eye-anim" cx="44" cy="26" r="2.3" fill="#10b981" />
              <circle className="robot-eye-anim" cx="56" cy="26" r="2.3" fill="#10b981" />
            </>
          ) : (
            <>
              {/* Left X */}
              <line className="robot-eye-anim" x1="42" y1="24" x2="46" y2="28" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
              <line className="robot-eye-anim" x1="46" y1="24" x2="42" y2="28" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
              {/* Right X */}
              <line className="robot-eye-anim" x1="54" y1="24" x2="58" y2="28" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
              <line className="robot-eye-anim" x1="58" y1="24" x2="54" y2="28" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
            </>
          )}

          {/* Robot Mouth */}
          {loading ? (
            <line x1="47" y1="33" x2="53" y2="33" stroke="#6b7280" strokeWidth="1" strokeLinecap="round" />
          ) : isOk ? (
            <path d="M 46 32 Q 50 35.5 54 32" fill="none" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
          ) : (
            <path d="M 46 34 Q 50 31.5 54 34" fill="none" stroke="#ef4444" strokeWidth="1.4" strokeLinecap="round" />
          )}
        </svg>
      </div>

      {/* Status Text Below Monitor */}
      <div className="text-center my-0.5">
        <span
          className={`text-[11px] font-semibold tracking-wide ${
            loading
              ? "text-gray-400"
              : isOk
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {statusText}
        </span>
      </div>

      {/* Service Status Indicator Dots */}
      <div className="flex items-center justify-between text-[10px] text-white/50 px-1 pt-1.5 border-t border-white/5 mt-1">
        <div className="flex items-center space-x-1" title={geminiOk ? "Gemini API OK" : "Gemini API Missing"}>
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
              geminiOk ? "bg-emerald-400 shadow-[0_0_5px_#10b981]" : "bg-red-400"
            }`}
          />
          <span>Gemini</span>
        </div>

        <div className="flex items-center space-x-1" title={nvidiaOk ? "NVIDIA API OK" : "NVIDIA API Missing"}>
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
              nvidiaOk ? "bg-emerald-400 shadow-[0_0_5px_#10b981]" : "bg-red-400"
            }`}
          />
          <span>NVIDIA</span>
        </div>

        <div className="flex items-center space-x-1" title={backendOk ? "Backend API OK" : "Backend Offline"}>
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
              backendOk ? "bg-emerald-400 shadow-[0_0_5px_#10b981]" : "bg-red-400"
            }`}
          />
          <span>Backend</span>
        </div>
      </div>
    </div>
  );
}
