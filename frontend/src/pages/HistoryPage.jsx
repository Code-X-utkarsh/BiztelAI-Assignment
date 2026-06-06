import React, { useEffect, useState, useCallback } from "react";
import axios from "../api/axios.js";
import { useNavigate } from "react-router-dom";
import { Search, X, InboxIcon } from "lucide-react";

export default function HistoryPage() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const navigate = useNavigate();

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterShift, filterStatus, dateFrom, dateTo]);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterShift) params.shift = filterShift;
      if (filterStatus) params.review_status = filterStatus;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const resp = await axios.get("/records/", { params });
      setRecords(resp.data.items || []);
      setTotal(resp.data.total || 0);
      setTotalPages(resp.data.total_pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filterShift, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setFilterShift("");
    setFilterStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const getAvgConfidence = (scores) => {
    if (!scores) return null;
    try {
      const obj = typeof scores === 'string' ? JSON.parse(scores) : scores;
      const vals = Object.values(obj).filter(v => typeof v === 'number');
      if (!vals.length) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    } catch {
      return null;
    }
  };

  const hasActiveFilters = search || filterShift || filterStatus || dateFrom || dateTo;

  return (
    <div className="p-8 pb-16 fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Extraction History</h1>
          <p className="text-white/40 text-sm mt-1">{total} records found</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass hover-lift p-5 mt-6 flex flex-row gap-3 flex-wrap items-end">
        <div className="flex-[2_2_240px] relative">
          <label className="label-glass">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              className="input-glass pl-9"
              placeholder="Employee, machine, work order..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-[1_1_140px]">
          <label className="label-glass">Shift</label>
          <select className="input-glass" value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
            <option value="">All Shifts</option>
            <option value="Morning">Morning</option>
            <option value="Evening">Evening</option>
            <option value="Night">Night</option>
          </select>
        </div>

        <div className="flex-[1_1_150px]">
          <label className="label-glass">Status</label>
          <select className="input-glass" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
          </select>
        </div>

        <div className="flex-[1_1_140px]">
          <label className="label-glass">From Date</label>
          <input type="date" className="input-glass" style={{ colorScheme: 'dark' }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>

        <div className="flex-[1_1_140px]">
          <label className="label-glass">To Date</label>
          <input type="date" className="input-glass" style={{ colorScheme: 'dark' }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>

        {hasActiveFilters && (
          <div className="flex-[0_0_auto]">
            <button onClick={handleClearFilters} className="btn-secondary h-[42px]">
              <X size={16} /> Clear
            </button>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="glass hover-lift mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-4 py-3 border-b border-white/10 font-semibold w-[40px]">#</th>
                <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-4 py-3 border-b border-white/10 font-semibold">File</th>
                <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-4 py-3 border-b border-white/10 font-semibold">Date</th>
                <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-4 py-3 border-b border-white/10 font-semibold">Shift</th>
                <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-4 py-3 border-b border-white/10 font-semibold">Employee</th>
                <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-4 py-3 border-b border-white/10 font-semibold">Machine</th>
                <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-4 py-3 border-b border-white/10 font-semibold">Work Order</th>
                <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-4 py-3 border-b border-white/10 font-semibold">Qty</th>
                <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-4 py-3 border-b border-white/10 font-semibold">Confidence</th>
                <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-4 py-3 border-b border-white/10 font-semibold">Status</th>
                <th className="text-left bg-white/5 text-white/50 text-[11px] uppercase tracking-widest px-4 py-3 border-b border-white/10 font-semibold w-[80px]">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-[linear-gradient(90deg,rgba(255,255,255,0.05),rgba(255,255,255,0.1),rgba(255,255,255,0.05))] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]"></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-4 py-16 text-center">
                    <InboxIcon className="mx-auto text-white/20 mb-3" size={48} />
                    <p className="text-white/50 text-lg font-medium">No records found</p>
                    <p className="text-white/30 text-sm mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                records.map((r, index) => {
                  const conf = getAvgConfidence(r.confidence_scores);
                  let confColor = "text-white/30";
                  let confText = "N/A";
                  if (conf !== null) {
                    confText = `${(conf * 100).toFixed(0)}%`;
                    if (conf > 0.8) confColor = "text-[#34d399]";
                    else if (conf >= 0.5) confColor = "text-[#fbbf24]";
                    else confColor = "text-[#f87171]";
                  }

                  let statusClass = "bg-slate-500/15 text-slate-400 border border-slate-500/30";
                  const s = r.review_status || "";
                  if (s === "approved") statusClass = "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
                  else if (s === "reviewed") statusClass = "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30";
                  else if (s === "review_pending" || s === "pending") statusClass = "bg-amber-500/15 text-amber-400 border border-amber-500/30";

                  let shiftTint = "";
                  if (r.shift === "Morning") shiftTint = "bg-blue-500/10 text-blue-400";
                  else if (r.shift === "Evening") shiftTint = "bg-purple-500/10 text-purple-400";
                  else if (r.shift === "Night") shiftTint = "bg-indigo-500/10 text-indigo-400";

                  return (
                    <tr 
                      key={r.id} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/review/${r.upload_id}`)}
                    >
                      <td className="px-4 py-3 text-white/50 text-sm">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-4 py-3 text-[#818cf8] text-sm truncate max-w-[150px]">
                        {r.filename?.length > 20 ? r.filename.substring(0, 17) + '...' : r.filename}
                      </td>
                      <td className="px-4 py-3 text-white/75 text-sm">{r.date || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        {r.shift ? <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${shiftTint}`}>{r.shift}</span> : <span className="text-white/30">—</span>}
                      </td>
                      <td className="px-4 py-3 text-white/75 text-sm">{r.employee_number || "—"}</td>
                      <td className="px-4 py-3 text-white/75 text-sm font-mono">{r.machine_number || "—"}</td>
                      <td className="px-4 py-3 text-white/75 text-sm">{r.work_order_number || "—"}</td>
                      <td className="px-4 py-3 text-white/75 text-sm">{r.quantity_produced ?? "—"}</td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        <span className={confColor}>{confText}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase ${statusClass}`}>
                          {s}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '6px 14px', fontSize: '12px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/review/${r.upload_id}`);
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && records.length > 0 && (
          <div className="p-4 px-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-white/40 text-sm">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} records
            </div>
            <div className="flex gap-2 items-center">
              <button 
                className="btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '14px', opacity: page === 1 ? 0.4 : 1 }}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Prev
              </button>
              
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => {
                    const isGap = i > 0 && p - arr[i - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {isGap && <span className="text-white/30 px-2 py-1">...</span>}
                        {p === page ? (
                          <button className="bg-[#6366f1] text-white rounded-lg px-3.5 py-2 font-semibold text-sm">
                            {p}
                          </button>
                        ) : (
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '8px 14px' }}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        )}
                      </React.Fragment>
                    );
                  })}
              </div>

              <button 
                className="btn-secondary" 
                style={{ padding: '8px 16px', fontSize: '14px', opacity: page === totalPages ? 0.4 : 1 }}
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
