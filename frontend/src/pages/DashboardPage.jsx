import React, { useEffect, useState } from "react";
import axios from "../api/axios.js";
import { useNavigate } from "react-router-dom";
import { 
  Upload, CheckCircle2, AlertTriangle, Activity, RotateCcw, FileText 
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const fetchSummary = async () => {
    setLoading(true);
    setError(false);
    try {
      const resp = await axios.get("/analytics/summary");
      setSummary(resp.data);
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="spinner"></div>
        <p className="text-white/50 mt-4">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass hover-lift p-8 text-center max-w-md">
          <AlertTriangle className="mx-auto text-red-500/60 mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Could not load dashboard data</h2>
          <p className="text-white/50 text-sm">Make sure the backend is running on port 8001</p>
          <button onClick={fetchSummary} className="btn-secondary mt-6">
            <RotateCcw size={16} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const statusColors = {
    uploaded: "#94a3b8",
    extracting: "#3b82f6",
    review_pending: "#f59e0b",
    reviewed: "#818cf8",
    approved: "#10b981"
  };

  const pieData = Object.entries(summary.status_breakdown || {})
    .filter(([_, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: "rgba(15, 12, 41, 0.95)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "12px",
          color: "white",
          padding: "10px"
        }}>
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: "4px" }}>{label || payload[0].name}</p>
          <p style={{ color: "white", fontWeight: "bold" }}>
            Count: {payload[0].value}
          </p>
          {payload[0].payload && payload[0].payload.avg_quantity !== undefined && (
            <p style={{ color: "white", fontSize: "12px" }}>
              Avg Qty: {payload[0].payload.avg_quantity}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const statusBadgeStyle = (status) => {
    const s = status || "";
    if (s === "approved") return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    if (s === "reviewed") return "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30";
    if (s === "review_pending" || s === "pending") return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
    if (s === "extracting") return "bg-blue-500/15 text-blue-400 border border-blue-500/30";
    if (s === "failed") return "bg-red-500/15 text-red-400 border border-red-500/30";
    return "bg-slate-500/15 text-slate-400 border border-slate-500/30"; // uploaded or default
  };

  return (
    <div className="p-8 pb-16 fade-in space-y-6">
      {/* SECTION 1 - Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-white font-bold text-3xl">Dashboard</h1>
          <p className="text-white/40 text-sm mt-1">Real-time operational overview</p>
        </div>
        <button onClick={fetchSummary} className="btn-secondary">
          <RotateCcw size={16} /> Refresh
        </button>
      </div>

      {/* SECTION 2 - 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass hover-lift p-6 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}>
              <Upload size={20} className="text-white" />
            </div>
            <span className="text-white/50 uppercase text-xs tracking-widest font-semibold">TOTAL UPLOADS</span>
          </div>
          <div className="text-3xl font-bold text-white mt-3">{summary.total_uploads}</div>
          <div className="text-white/40 text-xs mt-1">All time documents</div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg, #6366f1, transparent)" }}></div>
        </div>

        <div className="glass hover-lift p-6 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10b981, #34d399)" }}>
              <CheckCircle2 size={20} className="text-white" />
            </div>
            <span className="text-white/50 uppercase text-xs tracking-widest font-semibold">APPROVED</span>
          </div>
          <div className="text-3xl font-bold text-white mt-3">{summary.total_approved}</div>
          <div className="text-white/40 text-xs mt-1">Successfully processed</div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg, #10b981, transparent)" }}></div>
        </div>

        <div className="glass hover-lift p-6 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #fbbf24)" }}>
              <AlertTriangle size={20} className="text-white" />
            </div>
            <span className="text-white/50 uppercase text-xs tracking-widest font-semibold">NEED REVIEW</span>
          </div>
          <div className="text-3xl font-bold text-white mt-3">{summary.total_validation_failures}</div>
          <div className="text-white/40 text-xs mt-1">Validation issues found</div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg, #f59e0b, transparent)" }}></div>
        </div>

        <div className="glass hover-lift p-6 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #60a5fa)" }}>
              <Activity size={20} className="text-white" />
            </div>
            <span className="text-white/50 uppercase text-xs tracking-widest font-semibold">AVG CONFIDENCE</span>
          </div>
          <div className="text-3xl font-bold text-white mt-3">{(summary.avg_confidence * 100).toFixed(1)}%</div>
          <div className="text-white/40 text-xs mt-1">AI extraction accuracy</div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg, #3b82f6, transparent)" }}></div>
        </div>
      </div>

      {/* SECTION 3 - Quantity Summary */}
      <div className="glass hover-lift p-6">
        <h3 className="text-white/80 font-semibold text-sm uppercase tracking-widest mb-4">Quantity Overview</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 text-center">
            <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Total Produced</div>
            <div className="text-white text-xl font-bold">{summary.quantity_summary?.total_quantity_produced ?? "—"}</div>
          </div>
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 text-center">
            <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Avg Per Record</div>
            <div className="text-white text-xl font-bold">{summary.quantity_summary?.avg_quantity_per_record ?? "—"}</div>
          </div>
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 text-center">
            <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Highest</div>
            <div className="text-white text-xl font-bold">{summary.quantity_summary?.max_quantity ?? "—"}</div>
          </div>
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 text-center">
            <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Lowest</div>
            <div className="text-white text-xl font-bold">{summary.quantity_summary?.min_quantity ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* SECTION 4 - Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass hover-lift p-6">
          <h3 className="text-white font-semibold text-base mb-1">Production by Shift</h3>
          <p className="text-white/40 text-xs mb-6">Units produced per shift</p>
          <div className="h-[240px]">
            {summary.shift_summary && summary.shift_summary.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.shift_summary} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="shift" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/30 text-sm">No data yet</div>
            )}
          </div>
        </div>

        <div className="glass hover-lift p-6 relative">
          <h3 className="text-white font-semibold text-base mb-1">Upload Status</h3>
          <p className="text-white/40 text-xs mb-6">Document processing pipeline</p>
          <div className="h-[240px] relative">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={statusColors[entry.name] || "#6366f1"} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend 
                      iconType="circle" 
                      wrapperStyle={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }} 
                      formatter={(value) => value.replace("_", " ")}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "-10%" }}>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{summary.total_uploads}</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Total</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-white/30 text-sm">No data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 5 - Bottom Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass hover-lift overflow-hidden flex flex-col">
          <div className="p-5 pb-4">
            <h3 className="text-white font-semibold text-base mb-1">Top Machines by Output</h3>
            <p className="text-white/40 text-xs">Highest yielding equipment</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-5 py-3 border-b border-white/10 font-semibold">Machine</th>
                  <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-5 py-3 border-b border-white/10 font-semibold">Records</th>
                  <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-5 py-3 border-b border-white/10 font-semibold">Total Qty</th>
                </tr>
              </thead>
              <tbody>
                {summary.machine_summary && summary.machine_summary.length > 0 ? (
                  summary.machine_summary.map((m, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-white/75 text-sm font-mono">{m.machine_number}</td>
                      <td className="px-5 py-3 text-white/75 text-sm">{m.count}</td>
                      <td className="px-5 py-3 text-white/75 text-sm font-semibold text-emerald-400">{m.total_quantity}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-5 py-8 text-center text-white/30 text-sm">No machine data yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass hover-lift overflow-hidden flex flex-col">
          <div className="p-5 pb-4">
            <h3 className="text-white font-semibold text-base mb-1">Recent Activity</h3>
            <p className="text-white/40 text-xs">Latest uploads</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-5 py-3 border-b border-white/10 font-semibold">File</th>
                  <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-5 py-3 border-b border-white/10 font-semibold">Status</th>
                  <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-5 py-3 border-b border-white/10 font-semibold">Review</th>
                  <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-5 py-3 border-b border-white/10 font-semibold">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent_activity && summary.recent_activity.length > 0 ? (
                  summary.recent_activity.map((item, i) => (
                    <tr 
                      key={i} 
                      onClick={() => navigate(`/review/${item.upload_id}`)}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3 text-white/75 text-sm group-hover:text-indigo-400 transition-colors">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="opacity-50" />
                          <span className="truncate max-w-[120px] inline-block" title={item.filename}>
                            {item.filename.length > 22 ? item.filename.substring(0, 19) + '...' : item.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusBadgeStyle(item.status)}`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {item.review_status ? (
                          <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusBadgeStyle(item.review_status)}`}>
                            {item.review_status}
                          </span>
                        ) : (
                          <span className="text-white/30 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-white/50 text-xs">
                        {new Date(item.uploaded_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-5 py-8 text-center text-white/30 text-sm">No activity yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
