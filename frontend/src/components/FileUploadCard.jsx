import React, { useState } from "react";
import axios from "../api/axios.js";
import { UploadCloud, File, Loader2 } from "lucide-react";

export default function FileUploadCard({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setStatus("idle");
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus("idle");
    }
  };

  const upload = async () => {
    if (!file) return;
    setStatus("uploading");
    const form = new FormData();
    form.append("file", file);
    try {
      const resp = await axios.post("/uploads/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus("success");
      setMessage("Upload successful! AI extraction starting...");
      onUploadSuccess && onUploadSuccess(resp.data);
    } catch (err) {
      setStatus("error");
      setMessage(err.response?.data?.detail || "Upload failed");
    }
  };

  if (status === "uploading" || status === "success") {
    return (
      <div className="flex flex-col items-center justify-center p-12 glass hover-lift h-full min-h-[300px]">
        <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-6"></div>
        <h3 className="text-xl font-semibold text-white mb-2">
          {status === "uploading" ? "Uploading Document..." : "Upload Successful!"}
        </h3>
        <p className="text-white/50 text-sm">
          {status === "uploading" ? "Please wait while we securely upload your file." : "AI extraction is starting..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[300px]">
      <div
        className={`flex-1 flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-200 ${
          isDragOver 
            ? "border-indigo-500 bg-indigo-500/10" 
            : "border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10"
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
      >
        {!file ? (
          <>
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
              <UploadCloud size={32} className="text-indigo-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-1">Drop your document here</h3>
            <p className="text-white/40 text-sm mb-2">or click to browse</p>
            <p className="text-white/30 text-xs mb-6">Supports JPG, PNG, PDF up to 10MB</p>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleChange}
              className="hidden"
              id="fileInput"
            />
            <label htmlFor="fileInput" className="btn-primary cursor-pointer">
              Browse Files
            </label>
          </>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            <div className="glass hover-lift w-full p-4 flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                <File className="text-indigo-400" size={24} />
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="text-white font-medium text-sm truncate">{file.name}</div>
                <div className="text-white/40 text-xs mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setFile(null)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button onClick={upload} className="btn-primary flex-[2] justify-center">
                Upload & Extract
              </button>
            </div>
          </div>
        )}
      </div>
      {status === "error" && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {message}
        </div>
      )}
    </div>
  );
}
