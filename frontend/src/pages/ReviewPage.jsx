import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../api/axios.js";
import { ArrowLeft, RefreshCw, CheckCircle, AlertCircle, Bot } from "lucide-react";


const FieldRow = ({ label, name, value, onChange, score, error }) => {
  let badgeColor = "bg-white/5 text-white/40";
  let badgeText = "Not extracted";
  
  if (score > 0.8) {
    badgeColor = "bg-emerald-500/15 text-emerald-400";
    badgeText = `High ${Math.round(score * 100)}%`;
  } else if (score >= 0.5) {
    badgeColor = "bg-amber-500/15 text-amber-400";
    badgeText = `Med ${Math.round(score * 100)}%`;
  } else if (score > 0) {
    badgeColor = "bg-red-500/15 text-red-400";
    badgeText = `Low ${Math.round(score * 100)}%`;
  }

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <label className="label-glass mb-0">{label}</label>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${badgeColor}`}>
          {badgeText}
        </span>
      </div>
      {name === "shift" ? (
        <select
          name={name}
          value={value || ""}
          onChange={onChange}
          className={`input-glass ${error ? "!border-red-500/50 focus:!border-red-500 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.2)]" : ""}`}
        >
          <option value="">-- Select Shift --</option>
          <option value="Morning">Morning</option>
          <option value="Evening">Evening</option>
          <option value="Night">Night</option>
        </select>
      ) : (
        <input
          type={name === "quantity_produced" || name === "time_taken" ? "number" : "text"}
          name={name}
          value={value || ""}
          onChange={onChange}
          className={`input-glass ${error ? "!border-red-500/50 focus:!border-red-500 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.2)]" : ""}`}
        />
      )}
      {error && (
        <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};

export default function ReviewPage() {
  const { uploadId } = useParams();
  const navigate = useNavigate();
  const [upload, setUpload] = useState(null);
  const [record, setRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [confidenceScores, setConfidenceScores] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState("idle");
  const [activeProvider, setActiveProvider] = useState("gemini");

  const pollInterval = useRef(null);

  // Fetch active provider on page load
  useEffect(() => {
    const fetchEnv = async () => {
      try {
        const resp = await axios.get("/debug/env");
        const prov = resp.data?.active_provider || resp.data?.primary_provider || "gemini";
        setActiveProvider(prov);
      } catch (e) {
        console.warn("Failed to fetch debug env:", e);
      }
    };
    fetchEnv();
  }, []);

  const getModelInfo = (provider) => {
    let p = provider;
    if (!p && record?.provider_used) p = record.provider_used;
    if (!p && record?.raw_extraction) {
      try {
        const raw = JSON.parse(record.raw_extraction);
        if (raw?.provider_used) p = raw.provider_used;
      } catch (e) {}
    }
    if (!p) p = activeProvider || "gemini";
    p = String(p).toLowerCase();

    if (p.includes("nvidia") || p.includes("llama")) {
      return {
        name: "Llama 3.2 Vision 90B",
        chipClass: "bg-[#76b900]/15 text-[#86d900] border-[#76b900]/30 shadow-[0_0_8px_rgba(118,185,0,0.2)]",
        dotClass: "bg-[#76b900]",
      };
    }
    return {
      name: "Gemini 2.5 Flash Lite",
      chipClass: "bg-sky-500/15 text-sky-300 border-sky-500/30 shadow-[0_0_8px_rgba(14,165,233,0.2)]",
      dotClass: "bg-sky-400",
    };
  };


  const fetchData = async () => {

    try {
      const resp = await axios.get(`/uploads/${uploadId}`);
      const data = resp.data;
      setUpload(data);
      setExtractionStatus(data.status);
      
      const rec = data.records?.[0];
      if (rec) {
        setRecord(rec);
        setFormData({
          date: rec.date,
          shift: rec.shift,
          employee_number: rec.employee_number,
          operation_code: rec.operation_code,
          machine_number: rec.machine_number,
          work_order_number: rec.work_order_number,
          quantity_produced: rec.quantity_produced,
          time_taken: rec.time_taken
        });
        
        try {
          const parsedScores = rec.confidence_scores ? JSON.parse(rec.confidence_scores) : null;
          setConfidenceScores(parsedScores || {});
        } catch(e) { setConfidenceScores({}); }

        try {
          const parsedErrors = rec.validation_errors ? JSON.parse(rec.validation_errors) : null;
          setValidationErrors(parsedErrors || {});
        } catch(e) { setValidationErrors({}); }
      }

      if (data.status === "extracting") {
        if (!pollInterval.current) {
          pollInterval.current = setInterval(fetchData, 3000);
        }
      } else {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
          pollInterval.current = null;
        }
        setIsExtracting(false);
      }
    } catch (e) {
      console.error(e);
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [uploadId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const reExtract = async () => {
    setIsExtracting(true);
    setExtractionStatus("extracting");
    try {
      await axios.post(`/uploads/${uploadId}/extract`);
      fetchData(); // This will trigger the polling
    } catch (e) {
      console.error(e);
      setIsExtracting(false);
      setExtractionStatus("failed");
    }
  };

  const saveDraft = async () => {
    if (!record) return;
    setIsSaving(true);
    try {
      await axios.patch(`/records/${record.id}`, formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      fetchData(); // Refresh validation errors
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const saveAndApprove = async () => {
    if (!record) return;
    setIsSaving(true);
    try {
      await axios.patch(`/records/${record.id}`, formData);
      await axios.post(`/records/${record.id}/approve`);
      setSaveSuccess(true);
      setTimeout(() => navigate("/history"), 1500);
    } catch (e) {
      console.error(e);
      setIsSaving(false);
    }
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

  if (!upload) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-16 fade-in max-w-[1400px] mx-auto relative">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate("/history")} className="btn-secondary !p-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl sm:text-2xl font-semibold text-white truncate max-w-[400px]">{upload.filename}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest ${statusBadgeStyle(record?.review_status || upload.status)}`}>
          {record?.review_status ? record.review_status.replace("_", " ") : upload.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN: 40% */}
        <div className="lg:col-span-2 glass hover-lift p-6 flex flex-col h-[calc(100vh-160px)] min-h-[600px]">
          <h2 className="text-white/80 font-semibold text-sm uppercase tracking-widest mb-4">Document Preview</h2>
          <div className="flex-1 bg-white/5 border border-white/10 rounded-lg overflow-hidden flex items-center justify-center mb-5">
            {upload.file_type === "pdf" ? (
              <iframe src={`${import.meta.env.VITE_BACKEND_URL || ""}/uploads/${upload.file_path.split(/[/\\]/).pop()}`} className="w-full h-full border-none bg-white" title="PDF Preview" />
            ) : (
              <img src={`${import.meta.env.VITE_BACKEND_URL || ""}/uploads/${upload.file_path.split(/[/\\]/).pop()}`} alt="preview" className="max-w-full max-h-full object-contain" />
            )}
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Filename</span>
              <span className="text-white truncate max-w-[200px]" title={upload.filename}>{upload.filename}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Uploaded At</span>
              <span className="text-white">{new Date(upload.uploaded_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">File Type</span>
              <span className="text-white uppercase">{upload.file_type}</span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
              <span className="text-white/40">Extraction Status</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${statusBadgeStyle(upload.status)}`}>
                {upload.status}
              </span>
            </div>
          </div>

          <style>{`
            @keyframes borderPulse {
              0%, 100% { border-color: rgba(99, 102, 241, 0.3); box-shadow: 0 0 14px rgba(99, 102, 241, 0.15); }
              50% { border-color: rgba(99, 102, 241, 0.7); box-shadow: 0 0 24px rgba(99, 102, 241, 0.35); }
            }
            @keyframes indeterminateProgress {
              0% { left: -35%; }
              50% { left: 40%; }
              100% { left: 105%; }
            }
          `}</style>

          {/* 1. Animated Extraction Status Box during extracting */}
          {(upload.status === "extracting" || isExtracting) && (
            <div
              className="rounded-xl p-4 mb-5 border border-indigo-500/40 bg-slate-900/90 transition-all duration-300 relative overflow-hidden shrink-0"
              style={{ animation: "borderPulse 2.4s infinite ease-in-out" }}
            >
              {activeProvider === "auto" ? (
                <>
                  <div className="flex items-center gap-2.5 text-white font-medium text-sm mb-2.5">
                    <RefreshCw size={16} className="animate-spin text-indigo-400 shrink-0" />
                    <span>Running AI Analysis...</span>
                  </div>
                  <p className="text-white/60 text-xs mb-3">Trying both Gemini &amp; NVIDIA</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 text-white font-medium text-sm mb-2.5">
                    <RefreshCw size={16} className="animate-spin text-indigo-400 shrink-0" />
                    <span>AI is scanning your document...</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-white/50 text-xs">Active Engine:</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getModelInfo(activeProvider).chipClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full animate-ping ${getModelInfo(activeProvider).dotClass}`} />
                      {getModelInfo(activeProvider).name}
                    </span>
                  </div>

                  <p className="text-white/40 text-xs mb-3">This may take 10–30 seconds</p>
                </>
              )}

              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden relative">
                <div
                  className="absolute top-0 bottom-0 w-1/3 rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400"
                  style={{ animation: "indeterminateProgress 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite" }}
                />
              </div>
            </div>
          )}


          {/* 2. Processed by Badge when extraction is complete and provider succeeded */}
          {!(upload.status === "extracting" || isExtracting) && (upload.status === "review_pending" || upload.status === "approved" || upload.status === "reviewed") && (record?.provider_used || (() => {
            try {
              return JSON.parse(record?.raw_extraction || "{}")?.provider_used;
            } catch(e) { return null; }
          })()) && (
            <div className="rounded-xl p-3 mb-5 border border-emerald-500/25 bg-emerald-500/10 flex items-center justify-between shadow-[0_0_12px_rgba(16,185,129,0.1)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                  <Bot size={16} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-emerald-400/80 tracking-wider">Processed By</div>
                  <div className="text-xs font-medium text-white">
                    Extracted by {getModelInfo(record?.provider_used).name}
                  </div>
                </div>
              </div>
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            </div>
          )}

          {/* 3. Extraction failed badge if complete but no provider succeeded */}
          {!(upload.status === "extracting" || isExtracting) && (upload.status === "review_pending" || upload.status === "failed") && !record?.provider_used && !(() => {
            try {
              return JSON.parse(record?.raw_extraction || "{}")?.provider_used;
            } catch(e) { return null; }
          })() && (
            <div className="rounded-xl p-3 mb-5 border border-red-500/25 bg-red-500/10 flex items-center justify-between shadow-[0_0_12px_rgba(239,68,68,0.1)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-red-400/80 tracking-wider">Extraction Failed</div>
                  <div className="text-xs font-medium text-white">
                    No fields extracted. Check API keys.
                  </div>
                </div>
              </div>
            </div>
          )}

          
          <button 
            onClick={reExtract} 
            disabled={isExtracting || extractionStatus === "extracting"}
            className="btn-secondary w-full justify-center"
          >
            {(isExtracting || extractionStatus === "extracting") ? <div className="spinner-sm" /> : <RefreshCw size={18} />}
            Re-extract Document
          </button>

        </div>

        {/* RIGHT COLUMN: 60% */}
        <div className="lg:col-span-3 glass hover-lift p-6 flex flex-col h-[calc(100vh-160px)] min-h-[600px] relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white/80 font-semibold text-sm uppercase tracking-widest">Extracted Fields</h2>
          </div>

          {extractionStatus === "extracting" ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="spinner mb-6"></div>
              <p className="text-xl text-white font-medium">AI is reading your document...</p>
              <p className="text-white/40 text-sm mt-2">This usually takes about 10 seconds.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <FieldRow label="Date" name="date" value={formData.date} onChange={handleChange} score={confidenceScores.date || 0} error={validationErrors.date} />
                  <FieldRow label="Shift" name="shift" value={formData.shift} onChange={handleChange} score={confidenceScores.shift || 0} error={validationErrors.shift} />
                  <FieldRow label="Employee Number" name="employee_number" value={formData.employee_number} onChange={handleChange} score={confidenceScores.employee_number || 0} error={validationErrors.employee_number} />
                  <FieldRow label="Operation Code" name="operation_code" value={formData.operation_code} onChange={handleChange} score={confidenceScores.operation_code || 0} error={validationErrors.operation_code} />
                  <FieldRow label="Machine Number" name="machine_number" value={formData.machine_number} onChange={handleChange} score={confidenceScores.machine_number || 0} error={validationErrors.machine_number} />
                  <FieldRow label="Work Order Number" name="work_order_number" value={formData.work_order_number} onChange={handleChange} score={confidenceScores.work_order_number || 0} error={validationErrors.work_order_number} />
                  <FieldRow label="Quantity Produced" name="quantity_produced" value={formData.quantity_produced} onChange={handleChange} score={confidenceScores.quantity_produced || 0} error={validationErrors.quantity_produced} />
                  <FieldRow label="Time Taken (Hrs)" name="time_taken" value={formData.time_taken} onChange={handleChange} score={confidenceScores.time_taken || 0} error={validationErrors.time_taken} />
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 flex justify-end items-center space-x-4 shrink-0">
                <button 
                  onClick={saveDraft} 
                  disabled={isSaving}
                  className="btn-secondary"
                >
                  {isSaving ? <div className="spinner-sm" /> : null}
                  Save Draft
                </button>
                <button 
                  onClick={saveAndApprove} 
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? <div className="spinner-sm" /> : <CheckCircle size={18} />}
                  Save & Approve
                </button>
              </div>
            </>
          )}

          {/* Success Toast */}
          {saveSuccess && (
            <div className="absolute bottom-6 right-6 glass hover-lift !bg-emerald-500/10 !border-emerald-500/30 px-4 py-3 rounded-xl flex items-center gap-3 fade-in shadow-xl z-50">
              <CheckCircle className="text-emerald-400" size={20} />
              <span className="text-emerald-400 font-medium text-sm">Saved successfully!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
