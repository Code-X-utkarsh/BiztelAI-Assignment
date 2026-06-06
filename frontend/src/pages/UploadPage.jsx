import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FileUploadCard from "../components/FileUploadCard.jsx";
import axios from "../api/axios.js";
import { FileText } from "lucide-react";

export default function UploadPage() {
  const [uploads, setUploads] = useState([]);
  const navigate = useNavigate();

  const fetchUploads = async () => {
    try {
      const resp = await axios.get("/uploads/");
      setUploads(resp.data.slice(0, 5));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleSuccess = (data) => {
    fetchUploads();
    setTimeout(() => {
      navigate(`/review/${data.id}`);
    }, 1500);
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
    <div className="p-8 pb-16 fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Upload Document</h1>
        <p className="text-white/40 text-sm mt-1">Process handwritten manufacturing documents with AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN: 60% */}
        <div className="lg:col-span-3 glass hover-lift p-6">
          <FileUploadCard onUploadSuccess={handleSuccess} />
        </div>

        {/* RIGHT COLUMN: 40% */}
        <div className="lg:col-span-2 glass hover-lift p-6 flex flex-col h-full">
          <h2 className="text-white/80 font-semibold text-sm uppercase tracking-widest mb-4">Recent Uploads</h2>
          
          <div className="flex-1 flex flex-col">
            {uploads.length > 0 ? (
              <div className="space-y-1">
                {uploads.map((u) => (
                  <div 
                    key={u.id} 
                    onClick={() => navigate(`/review/${u.id}`)}
                    className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer rounded -mx-2 px-2 group"
                  >
                    <div className="w-10 h-10 rounded bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                      <FileText className="text-indigo-400" size={18} />
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                      <div className="text-white/80 font-medium text-sm truncate group-hover:text-indigo-400 transition-colors">
                        {u.filename}
                      </div>
                      <div className="text-white/40 text-xs mt-0.5">
                        {new Date(u.uploaded_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    <div>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase ${statusBadgeStyle(u.status)}`}>
                        {u.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
                No uploads yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
