import React, { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import {
  Award, BookOpen, Star, FileText, TrendingUp, Upload,
  CheckCircle, XCircle, AlertTriangle, Download, X, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────────
const GRADE_COLORS = {
  O: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  E: 'bg-teal-100 text-teal-800 border-teal-200',
  A: 'bg-blue-100 text-blue-800 border-blue-200',
  B: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  D: 'bg-orange-100 text-orange-800 border-orange-200',
  F: 'bg-red-100 text-red-800 border-red-200',
};

// ─── Skeleton ────────────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

// ─── SGPA Trend Chart (pure SVG, no chart library) ────────────────────────────
const SGPATrend = ({ trend }) => {
  if (!trend || trend.length < 2) return null;
  const W = 300, H = 80, pad = 12;
  const max = Math.max(...trend.map(t => t.sgpa), 10);
  const min = Math.max(0, Math.min(...trend.map(t => t.sgpa)) - 1);
  const xStep = (W - pad * 2) / (trend.length - 1);
  const yScale = v => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  const points = trend.map((t, i) => ({ x: pad + i * xStep, y: yScale(t.sgpa), sem: t.semester, sgpa: t.sgpa }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" aria-label="SGPA trend">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L${points[points.length - 1].x},${H} L${points[0].x},${H} Z`}
        fill="url(#trendGrad)"
      />
      <path d={pathD} fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#14b8a6" stroke="#fff" strokeWidth="1.5" />
          <title>Sem {p.sem}: {p.sgpa}</title>
        </g>
      ))}
    </svg>
  );
};

// ─── Upload Modal ─────────────────────────────────────────────────────────────
const UploadModal = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (f) => {
    if (!f) return;
    const ok = f.name.endsWith('.csv') || f.name.endsWith('.xlsx');
    if (!ok) { setError('Only .csv or .xlsx files allowed.'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('File too large (max 5 MB).'); return; }
    setError('');
    setFile(f);
    setDryRunResult(null);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const runDryRun = async () => {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.post('/results/upload?dry_run=true', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDryRunResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Dry-run failed. Check file format.');
    } finally { setLoading(false); }
  };

  const confirmUpload = async () => {
    if (!file) return;
    setLoading(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.post('/results/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSuccess(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed.');
    } finally { setLoading(false); }
  };

  const downloadTemplate = async () => {
    const res = await api.get('/results/upload-template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a'); a.href = url; a.download = 'results_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Upload Results</h2>
          <div className="flex gap-2">
            <button onClick={downloadTemplate} className="text-xs text-teal-600 font-semibold flex items-center gap-1 hover:underline">
              <Download className="h-3 w-3" /> Template
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => document.getElementById('results-file-input').click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${dragging ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'}`}
          >
            <Upload className={`h-10 w-10 mx-auto mb-3 ${dragging ? 'text-teal-500' : 'text-gray-400'}`} />
            {file ? (
              <p className="font-semibold text-gray-800">{file.name}</p>
            ) : (
              <>
                <p className="font-semibold text-gray-700">Drag & drop or click to select</p>
                <p className="text-sm text-gray-400 mt-1">.csv or .xlsx • max 5 MB</p>
              </>
            )}
            <input id="results-file-input" type="file" accept=".csv,.xlsx" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {/* Dry-run preview */}
          {dryRunResult && (
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 flex items-center justify-between border-b border-gray-200">
                <span className="font-semibold text-sm text-gray-700">Preview ({dryRunResult.valid_rows} valid / {dryRunResult.error_rows} errors)</span>
                {dryRunResult.error_rows > 0 && <span className="text-xs text-red-600 font-bold">Fix errors before uploading</span>}
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {['Row', 'Student', 'Subject', 'Semester', 'Grade', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(dryRunResult.rows || []).map((row, i) => (
                      <tr key={i} className={row.error ? 'bg-red-50' : 'bg-white'}>
                        <td className="px-3 py-2 text-gray-500">{row.row}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{row.student}</td>
                        <td className="px-3 py-2 text-gray-600">{row.subject}</td>
                        <td className="px-3 py-2 text-gray-600">{row.semester}</td>
                        <td className="px-3 py-2">
                          {row.grade && <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${GRADE_COLORS[row.grade] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>{row.grade}</span>}
                        </td>
                        <td className="px-3 py-2">
                          {row.error
                            ? <span className="text-red-600 flex items-center gap-1"><XCircle className="h-3 w-3" /> {row.error}</span>
                            : <span className="text-green-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {file && !dryRunResult && (
              <button onClick={runDryRun} disabled={loading}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-all disabled:opacity-50">
                {loading ? 'Checking...' : 'Preview (Dry Run)'}
              </button>
            )}
            {dryRunResult && dryRunResult.error_rows === 0 && (
              <button onClick={confirmUpload} disabled={loading}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all disabled:opacity-50">
                {loading ? 'Uploading...' : 'Confirm Upload'}
              </button>
            )}
            {(!file || dryRunResult?.error_rows > 0) && (
              <button disabled={!file} onClick={runDryRun}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                Preview & Validate
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Results Page ────────────────────────────────────────────────────────
const Results = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [selectedSem, setSelectedSem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  const fetchResults = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/results/me');
      setData(res.data);
      if (res.data.semesters?.length > 0) {
        setSelectedSem(res.data.semesters[0].semester);
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load results.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const downloadPDF = () => {
    // Uses html2pdf.js if available, else fallback
    const el = document.getElementById('transcript-section');
    if (!el) return;
    if (window.html2pdf) {
      window.html2pdf().set({ margin: 0.5, filename: 'transcript.pdf', jsPDF: { unit: 'in', format: 'a4' } }).from(el).save();
    } else {
      window.print();
    }
  };

  const currentSemData = data?.semesters?.find(s => s.semester === selectedSem);

  // ── Loading skeleton ──
  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );

  // ── Error ──
  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
      <p className="text-gray-600 mb-4">{error}</p>
      <button onClick={fetchResults} className="flex items-center gap-2 mx-auto px-5 py-2 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700">
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );

  // ── Empty ──
  if (!data || data.semesters?.length === 0) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-700 mb-2">No Results Yet</h2>
      <p className="text-gray-400 mb-6">Results will appear here once uploaded by your teacher.</p>
      {isTeacherOrAdmin && (
        <button onClick={() => setShowUpload(true)} className="px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 flex items-center gap-2 mx-auto">
          <Upload className="h-4 w-4" /> Upload Results
        </button>
      )}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); fetchResults(); }} />}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Award className="h-8 w-8 text-yellow-500 mr-3" /> Academic Performance
        </h1>
        <div className="flex gap-3">
          {isTeacherOrAdmin && (
            <button onClick={() => setShowUpload(true)}
              className="flex items-center px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-teal-700 transition-all">
              <Upload className="h-4 w-4 mr-2" /> Upload Results
            </button>
          )}
          <button onClick={downloadPDF}
            className="flex items-center px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-black transition-all">
            <FileText className="h-4 w-4 mr-2" /> Download PDF
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Overall CGPA', value: data.cgpa?.toFixed(2) ?? '—', icon: Star, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Current SGPA', value: data.semesters[0]?.sgpa?.toFixed(2) ?? '—', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Credits Earned', value: `${data.total_credits_earned ?? 0}`, icon: Award, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map((stat, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</h3>
                <p className={`text-4xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`${stat.bg} p-3 rounded-2xl`}>
                <stat.icon className={`h-7 w-7 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── SGPA Trend + Semester Selector ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-teal-500" /> SGPA Trend</h3>
          <SGPATrend trend={data.sgpa_trend} />
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            {data.sgpa_trend?.map(t => <span key={t.semester}>Sem {t.semester}</span>)}
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">Semesters</h3>
          <div className="space-y-2">
            {data.semesters.map(s => (
              <button key={s.semester} onClick={() => setSelectedSem(s.semester)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedSem === s.semester ? 'bg-teal-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-teal-50 hover:text-teal-700'}`}>
                <span>Semester {s.semester}</span>
                <span className="font-black">{s.sgpa?.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Subject Table ── */}
      {currentSemData && (
        <div id="transcript-section" className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Semester {selectedSem} — Subject Breakdown</h2>
              <p className="text-sm text-gray-400 mt-0.5">SGPA: <span className="font-black text-teal-600">{currentSemData.sgpa?.toFixed(2)}</span> · Credits Earned: <span className="font-bold">{currentSemData.credits_earned}</span></p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  {['Subject', 'Credits', 'Midsem', 'Endsem', 'Assignment', 'Total', 'Grade', 'Grade Point'].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentSemData.subjects.map((subj, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-gray-900">{subj.subject_name}</td>
                    <td className="px-5 py-4 text-gray-600">{subj.credits}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5"><div className="bg-indigo-500 h-1.5 rounded-full" style={{width:`${(subj.midsem_marks/30)*100}%`}} /></div>
                        <span className="text-gray-700">{subj.midsem_marks}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5"><div className="bg-teal-500 h-1.5 rounded-full" style={{width:`${(subj.endsem_marks/70)*100}%`}} /></div>
                        <span className="text-gray-700">{subj.endsem_marks}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{subj.assignment_marks}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">{subj.total}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase border ${GRADE_COLORS[subj.grade] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                        {subj.grade}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-black text-indigo-600">{subj.grade_point}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); fetchResults(); }}
        />
      )}
    </div>
  );
};

export default Results;
