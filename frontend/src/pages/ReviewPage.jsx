import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../api/axios.js";
import { ArrowLeft, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

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

  const pollInterval = useRef(null);

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
