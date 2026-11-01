/**
 * Jobs.jsx – "Job Query" page for AI-Smart-LMS
 * Sources: Adzuna, Greenhouse, Lever, Ashby, Manual (placement cell)
 * NO data is fetched from LinkedIn; only a search-redirect link is provided.
 */
import React, {
  useContext, useEffect, useState, useCallback, useRef
} from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import {
  Briefcase, Search, Heart, ExternalLink, Filter, X, RefreshCw,
  MapPin, Clock, Building2, Sparkles, Plus, ChevronDown, ChevronUp,
  Settings, AlertCircle, Loader2, BookmarkCheck, Linkedin,
  ArrowUpRight, Badge, Zap, Globe, Trash2, Edit3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 7 / 86400)}w ago`;
};

const fmtSalary = (min, max, currency = 'INR') => {
  if (!min && !max) return null;
  const fmt = (n) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n;
  };
  if (min && max) return `${currency} ${fmt(min)} – ${fmt(max)}`;
  if (min) return `${currency} ${fmt(min)}+`;
  return `Up to ${currency} ${fmt(max)}`;
};

const SOURCE_LABELS = {
  adzuna: { label: 'Adzuna', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  greenhouse: { label: 'Greenhouse', color: 'bg-green-100 text-green-700 border-green-200' },
  lever: { label: 'Lever', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ashby: { label: 'Ashby', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  manual: { label: 'Placement Cell', color: 'bg-teal-100 text-teal-700 border-teal-200' },
};

const TYPE_COLORS = {
  internship: 'bg-pink-100 text-pink-700 border-pink-200',
  fulltime: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  parttime: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  contract: 'bg-gray-100 text-gray-700 border-gray-200',
  unknown: 'bg-gray-50 text-gray-500 border-gray-100',
};

const MODE_COLORS = {
  remote: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  hybrid: 'bg-sky-100 text-sky-700 border-sky-200',
  onsite: 'bg-violet-100 text-violet-700 border-violet-200',
  unknown: 'bg-gray-50 text-gray-500 border-gray-100',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/10 rounded-xl ${className}`} />
);

const JobCardSkeleton = () => (
  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
    <Skeleton className="h-3 w-full" />
    <div className="flex gap-2">
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
  </div>
);

// ─── Job Card ─────────────────────────────────────────────────────────────────
const JobCard = ({ job, onSave, onSelect, isAdmin }) => {
  const src = SOURCE_LABELS[job.source] || SOURCE_LABELS.manual;
  const salary = fmtSalary(job.salary_min, job.salary_max, job.salary_currency);
  const initial = (job.company || '?')[0].toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -2 }}
      onClick={() => onSelect(job)}
      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 cursor-pointer hover:border-teal-500/40 hover:bg-white/8 transition-all group relative"
    >
      {/* "New" badge */}
      {job.is_new && (
        <span className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-teal-500 text-white animate-pulse">
          New
        </span>
      )}

      <div className="flex items-start gap-3">
        {/* Company avatar */}
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-white font-extrabold text-lg shrink-0 shadow-lg">
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm leading-snug truncate pr-12">{job.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {job.company}
          </p>
        </div>
      </div>

      {/* Location + time */}
      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[140px]">{job.location}</span>
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto shrink-0">
          <Clock className="h-3 w-3" /> {timeAgo(job.posted_at)}
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${src.color}`}>
          {src.label}
        </span>
        {job.job_type && job.job_type !== 'unknown' && (
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${TYPE_COLORS[job.job_type] || TYPE_COLORS.unknown}`}>
            {job.job_type}
          </span>
        )}
        {job.work_mode && job.work_mode !== 'unknown' && (
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${MODE_COLORS[job.work_mode] || MODE_COLORS.unknown}`}>
            {job.work_mode}
          </span>
        )}
        {salary && (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded border bg-amber-50 text-amber-700 border-amber-200">
            {salary}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
        <button
          onClick={(e) => { e.stopPropagation(); onSave(job); }}
          className={`p-2 rounded-xl transition-all ${job.is_saved ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10'}`}
          title={job.is_saved ? 'Remove from saved' : 'Save job'}
        >
          <Heart className={`h-4 w-4 ${job.is_saved ? 'fill-current' : ''}`} />
        </button>

        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 text-xs font-bold transition-all border border-teal-500/20"
        >
          Apply <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </motion.div>
  );
};

// ─── Detail Drawer ────────────────────────────────────────────────────────────
const JobDrawer = ({ job, onClose, onSave, currentUser }) => {
  const [aiMatch, setAiMatch] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const src = SOURCE_LABELS[job.source] || SOURCE_LABELS.manual;
  const salary = fmtSalary(job.salary_min, job.salary_max, job.salary_currency);

  const fetchAiMatch = async () => {
    setAiLoading(true);
    try {
      const { data } = await api.get(`/jobs/${job.id}/ai-match`);
      setAiMatch(data);
    } catch {
      toast.error('AI match unavailable right now');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#1e1b4b] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <h2 className="font-extrabold text-white text-base truncate pr-4">{job.title}</h2>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Meta */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-teal-400" /> {job.company}
          </span>
          {job.location && (
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {job.location}
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${src.color}`}>{src.label}</span>
          {job.job_type && job.job_type !== 'unknown' && (
            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${TYPE_COLORS[job.job_type]}`}>{job.job_type}</span>
          )}
          {job.work_mode && job.work_mode !== 'unknown' && (
            <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border ${MODE_COLORS[job.work_mode]}`}>{job.work_mode}</span>
          )}
          {salary && (
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-amber-50 text-amber-700 border-amber-200">{salary}</span>
          )}
          {job.is_new && (
            <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-lg bg-teal-500 text-white">New</span>
          )}
        </div>

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((s) => (
                <span key={s} className="px-2.5 py-1 text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* AI Match */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-teal-400" /> Why this fits me
            </p>
            {!aiMatch && (
              <button
                onClick={fetchAiMatch}
                disabled={aiLoading}
                className="px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 text-xs font-bold hover:bg-teal-500/30 transition-all border border-teal-500/20 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Analyse'}
              </button>
            )}
          </div>
          {aiMatch ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full" style={{ width: `${aiMatch.fit_score ?? aiMatch.match_score ?? 80}%` }} />
                </div>
                <span className="text-xs font-black text-teal-400">{aiMatch.fit_score ?? aiMatch.match_score ?? 80}% fit</span>
              </div>
              {aiMatch.bullets.map((b, i) => (
                <p key={i} className="text-xs text-gray-300 flex items-start gap-2">
                  <span className="text-teal-400 font-black shrink-0">{'•'}</span> {b}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">Click "Analyse" to see how this role matches your profile skills.</p>
          )}
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</p>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{job.description_text || 'No description available.'}</p>
        </div>

        <p className="text-xs text-gray-600">
          Posted {timeAgo(job.posted_at)} · First seen {timeAgo(job.first_seen_at)} · Source: {src.label}
        </p>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10 flex gap-3 shrink-0">
        <button
          onClick={() => onSave(job)}
          className={`p-3 rounded-xl transition-all border ${job.is_saved ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-white/5 text-gray-400 border-white/10 hover:text-red-400'}`}
        >
          <Heart className={`h-5 w-5 ${job.is_saved ? 'fill-current' : ''}`} />
        </button>
        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-bold text-sm shadow-lg hover:shadow-teal-500/20 transition-all"
        >
          Apply Now <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </motion.div>
  );
};

// ─── Manual Job Modal ─────────────────────────────────────────────────────────
const ManualJobModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    title: '', company: '', location: '', work_mode: 'onsite', job_type: 'fulltime',
    description_text: '', apply_url: '', skills: '', salary_min: '', salary_max: '',
    salary_currency: 'INR',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
      };
      await api.post('/jobs', payload);
      toast.success('Job posted successfully!');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:bg-white/10 transition-all";
  const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-[#1e1b4b] border border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-extrabold text-white text-lg">Post Opportunity</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-400"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Job Title *</label>
              <input className={inputClass} required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Software Engineer Intern" />
            </div>
            <div>
              <label className={labelClass}>Company *</label>
              <input className={inputClass} required value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} placeholder="Company name" />
            </div>
            <div>
              <label className={labelClass}>Location</label>
              <input className={inputClass} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Bhubaneswar" />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select className={inputClass} value={form.job_type} onChange={e => setForm(p => ({ ...p, job_type: e.target.value }))}>
                {['fulltime', 'internship', 'parttime', 'contract'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Work Mode</label>
              <select className={inputClass} value={form.work_mode} onChange={e => setForm(p => ({ ...p, work_mode: e.target.value }))}>
                {['onsite', 'hybrid', 'remote'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Min Salary (INR)</label>
              <input type="number" className={inputClass} value={form.salary_min} onChange={e => setForm(p => ({ ...p, salary_min: e.target.value }))} placeholder="e.g. 500000" />
            </div>
            <div>
              <label className={labelClass}>Max Salary (INR)</label>
              <input type="number" className={inputClass} value={form.salary_max} onChange={e => setForm(p => ({ ...p, salary_max: e.target.value }))} placeholder="e.g. 1000000" />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Skills (comma-separated)</label>
              <input className={inputClass} value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} placeholder="Python, React, SQL" />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Apply URL *</label>
              <input type="url" className={inputClass} required value={form.apply_url} onChange={e => setForm(p => ({ ...p, apply_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Description *</label>
              <textarea className={`${inputClass} resize-none`} rows={4} required value={form.description_text} onChange={e => setForm(p => ({ ...p, description_text: e.target.value }))} placeholder="Job responsibilities, requirements..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-bold hover:bg-white/5 transition-all">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Post Job'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Admin Sources Panel ──────────────────────────────────────────────────────
const AdminSourcesPanel = ({ onClose }) => {
  const [sources, setSources] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newSrc, setNewSrc] = useState({ type: 'greenhouse', slug: '', company_name: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [srcRes, logRes] = await Promise.all([
        api.get('/jobs/sources'),
        api.get('/jobs/sync-status?limit=5'),
      ]);
      setSources(srcRes.data);
      setSyncLogs(logRes.data);
    } catch {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/jobs/sync');
      toast.success(`Sync done: ${data.summary?.total_created ?? 0} new, ${data.summary?.total_updated ?? 0} updated`);
      fetchData();
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();
    try {
      await api.post('/jobs/sources', newSrc);
      toast.success('Source added');
      setNewSrc({ type: 'greenhouse', slug: '', company_name: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add source');
    }
  };

  const handleDeleteSource = async (id) => {
    if (!window.confirm('Remove this source?')) return;
    try {
      await api.delete(`/jobs/sources/${id}`);
      toast.success('Source removed');
      fetchData();
    } catch {
      toast.error('Failed to remove source');
    }
  };

  const inputClass = "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-[#1e1b4b] border border-white/10 rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-extrabold text-white text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-teal-400" /> Job Sources & Sync
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-gray-400"><X className="h-5 w-5" /></button>
        </div>

        {/* Sync Now */}
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="w-full mb-5 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {syncing ? 'Syncing…' : 'Sync Now (all sources)'}
        </button>

        {/* Sources list */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Company ATS Sources</p>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="space-y-2 mb-4">
            {sources.length === 0 && <p className="text-sm text-gray-500 py-2">No sources configured yet.</p>}
            {sources.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
                <div>
                  <p className="text-sm font-bold text-white">{s.company_name}</p>
                  <p className="text-xs text-gray-500">{s.type} · {s.slug} · {s.last_status}</p>
                </div>
                <button onClick={() => handleDeleteSource(s.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-all">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add source */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Add Source</p>
        <form onSubmit={handleAddSource} className="flex gap-2 flex-wrap mb-5">
          <select className={`${inputClass} w-28`} value={newSrc.type} onChange={e => setNewSrc(p => ({ ...p, type: e.target.value }))}>
            {['greenhouse', 'lever', 'ashby'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className={`${inputClass} flex-1 min-w-[100px]`} placeholder="Company slug" value={newSrc.slug} onChange={e => setNewSrc(p => ({ ...p, slug: e.target.value }))} required />
          <input className={`${inputClass} flex-1 min-w-[120px]`} placeholder="Company name" value={newSrc.company_name} onChange={e => setNewSrc(p => ({ ...p, company_name: e.target.value }))} required />
          <button type="submit" className="px-4 py-2 rounded-xl bg-teal-500/20 text-teal-300 text-sm font-bold border border-teal-500/30 hover:bg-teal-500/30 transition-all">
            <Plus className="h-4 w-4" />
          </button>
        </form>

        {/* Sync logs */}
        {syncLogs.length > 0 && (
          <>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Recent Sync Logs</p>
            <div className="space-y-1.5">
              {syncLogs.map((log, i) => (
                <div key={i} className="bg-white/5 rounded-xl px-3 py-2 border border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${log.error ? 'text-red-400' : 'text-teal-400'}`}>{log.source}</span>
                    <span className="text-gray-500">{timeAgo(log.started_at)}</span>
                    <span className="ml-auto text-gray-400">+{log.created ?? 0} new · ~{log.updated ?? 0} upd · -{log.deactivated ?? 0} off</span>
                  </div>
                  {log.error && <p className="text-red-400 mt-1 truncate">{log.error}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = ['All', 'New', 'Saved'];
const POSTED_WITHIN = [
  { label: 'Any time', value: '' },
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
];

export default function Jobs() {
  const { user } = useContext(AuthContext);
  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [postedWithin, setPostedWithin] = useState('');
  const [sort, setSort] = useState('newest');

  const [filterOptions, setFilterOptions] = useState({ locations: [], companies: [], job_types: [], work_modes: [], sources: [] });
  const [lastSynced, setLastSynced] = useState(null);
  const [newCount, setNewCount] = useState(0);

  const [selectedJob, setSelectedJob] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch filter options once
  useEffect(() => {
    api.get('/jobs/filters').then(r => setFilterOptions(r.data)).catch(() => {});
  }, []);

  // Fetch unread count
  useEffect(() => {
    api.get('/jobs/unread-count')
      .then(r => setNewCount(r.data?.unread_count ?? r.data?.count ?? 0))
      .catch(() => {});
  }, []);

  const fetchJobs = useCallback(async (pg = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQ) params.set('q', debouncedQ);
      if (location) params.set('location', location);
      if (jobType) params.set('job_type', jobType);
      if (workMode) params.set('work_mode', workMode);
      if (postedWithin) params.set('posted_within', postedWithin);
      if (tab === 'New') params.set('only_new', 'true');
      if (tab === 'Saved') params.set('saved_only', 'true');
      params.set('sort', sort);
      params.set('page', pg);
      params.set('page_size', '20');

      const { data } = await api.get(`/jobs?${params}`);
      setJobs(pg === 1 ? data.items : prev => [...prev, ...data.items]);
      setTotal(data.total);
      setLastSynced(new Date());
      setPage(pg);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, location, jobType, workMode, postedWithin, tab, sort]);

  // Refetch on filter change
  useEffect(() => {
    fetchJobs(1);
  }, [fetchJobs]);

  // Refetch on window focus
  useEffect(() => {
    const handler = () => fetchJobs(1);
    window.addEventListener('visibilitychange', handler);
    return () => window.removeEventListener('visibilitychange', handler);
  }, [fetchJobs]);

  // Mark viewed when tab changes away from New
  useEffect(() => {
    if (tab !== 'New') {
      api.post('/jobs/mark-viewed').catch(() => {});
    }
  }, [tab]);

  const handleSave = async (job) => {
    try {
      if (job.is_saved) {
        await api.delete(`/jobs/${job.id}/save`);
        toast.success('Removed from saved');
      } else {
        await api.post(`/jobs/${job.id}/save`);
        toast.success('Job saved!');
      }
      // Optimistically update
      const update = (j) => j.id === job.id ? { ...j, is_saved: !j.is_saved } : j;
      setJobs(prev => prev.map(update));
      if (selectedJob?.id === job.id) setSelectedJob(prev => ({ ...prev, is_saved: !prev.is_saved }));
    } catch {
      toast.error('Could not update saved status');
    }
  };

  const linkedInUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(debouncedQ || 'software engineer')}&location=${encodeURIComponent(location || 'India')}`;

  const clearFilters = () => {
    setQ(''); setDebouncedQ(''); setLocation(''); setJobType(''); setWorkMode(''); setPostedWithin(''); setSort('newest');
  };
  const hasFilters = q || location || jobType || workMode || postedWithin || sort !== 'newest';

  const chipClass = (active) =>
    `px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none ${active
      ? 'bg-teal-500/30 text-teal-300 border-teal-500/40'
      : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-white'}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e1b4b] via-[#1e293b] to-[#0f172a] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-teal-400" /> Job Query
              {newCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-black bg-teal-500 text-white rounded-full ml-1">{newCount} new</span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {total} listing{total !== 1 ? 's' : ''} ·{' '}
              {lastSynced ? `Updated ${timeAgo(lastSynced)}` : 'Loading…'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="px-3 py-2 rounded-xl bg-white/5 text-gray-400 text-xs font-bold border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1.5"
              >
                <Settings className="h-4 w-4" /> Sources
              </button>
            )}
            {isTeacherOrAdmin && (
              <button
                onClick={() => setShowManualModal(true)}
                className="px-3 py-2 rounded-xl bg-teal-500/20 text-teal-300 text-xs font-bold border border-teal-500/30 hover:bg-teal-500/30 transition-all flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Post Job
              </button>
            )}
            <button
              onClick={() => fetchJobs(1)}
              className="p-2 rounded-xl bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search jobs, companies, skills…"
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 focus:bg-white/8 transition-all"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-4">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={chipClass(tab === t)}>
              {t}
              {t === 'New' && newCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-teal-500 text-white text-[9px] font-black">{newCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          {/* Job type chips */}
          {['internship', 'fulltime', 'parttime', 'contract'].map(t => (
            <button key={t} onClick={() => setJobType(jobType === t ? '' : t)} className={chipClass(jobType === t)}>
              {t}
            </button>
          ))}

          {/* Work mode chips */}
          {['remote', 'hybrid', 'onsite'].map(m => (
            <button key={m} onClick={() => setWorkMode(workMode === m ? '' : m)} className={chipClass(workMode === m)}>
              {m}
            </button>
          ))}

          {/* Location dropdown */}
          {filterOptions.locations.length > 0 && (
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-white/5 text-gray-400 border-white/10 focus:outline-none focus:border-teal-500/50 transition-all"
            >
              <option value="">All Locations</option>
              {filterOptions.locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}

          {/* Posted within */}
          <select
            value={postedWithin}
            onChange={e => setPostedWithin(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-white/5 text-gray-400 border-white/10 focus:outline-none focus:border-teal-500/50 transition-all"
          >
            {POSTED_WITHIN.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-white/5 text-gray-400 border-white/10 focus:outline-none focus:border-teal-500/50 transition-all"
          >
            <option value="newest">Newest first</option>
            <option value="relevance">Relevance</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all flex items-center gap-1">
              <X className="h-3 w-3" /> Clear
            </button>
          )}

          {/* LinkedIn redirect (no data fetched) */}
          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all flex items-center gap-1.5"
            title="Search on LinkedIn (opens LinkedIn in a new tab, no data is fetched)"
          >
            <Linkedin className="h-3.5 w-3.5" /> Search on LinkedIn
          </a>
        </div>

        {/* Job grid */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
            <p className="text-red-400 font-bold mb-2">{error}</p>
            <button onClick={() => fetchJobs(1)} className="px-4 py-2 rounded-xl bg-white/5 text-sm text-gray-400 hover:bg-white/10 transition-all">
              Retry
            </button>
          </div>
        ) : loading && jobs.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <JobCardSkeleton key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Briefcase className="h-12 w-12 text-gray-600 mb-4" />
            <p className="text-gray-500 font-bold text-lg">No jobs found</p>
            <p className="text-gray-600 text-sm mt-1 mb-4">Try different filters or search terms</p>
            {hasFilters && (
              <button onClick={clearFilters} className="px-4 py-2 rounded-xl bg-teal-500/20 text-teal-300 text-sm font-bold border border-teal-500/30 hover:bg-teal-500/30 transition-all">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onSave={handleSave}
                    onSelect={setSelectedJob}
                    isAdmin={isAdmin}
                  />
                ))}
              </div>
            </AnimatePresence>

            {/* Load more */}
            {jobs.length < total && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => fetchJobs(page + 1)}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-sm text-gray-400 font-bold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Load more (${total - jobs.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Job Detail Drawer */}
      <AnimatePresence>
        {selectedJob && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setSelectedJob(null)}
            />
            <JobDrawer
              job={selectedJob}
              onClose={() => setSelectedJob(null)}
              onSave={handleSave}
              currentUser={user}
            />
          </>
        )}
      </AnimatePresence>

      {/* Manual Job Modal */}
      <AnimatePresence>
        {showManualModal && (
          <ManualJobModal
            onClose={() => setShowManualModal(false)}
            onCreated={() => fetchJobs(1)}
          />
        )}
      </AnimatePresence>

      {/* Admin Sources Panel */}
      <AnimatePresence>
        {showAdminPanel && (
          <AdminSourcesPanel onClose={() => setShowAdminPanel(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

