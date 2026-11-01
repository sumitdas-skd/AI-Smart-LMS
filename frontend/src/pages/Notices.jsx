import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import {
  Bell, ShieldAlert, BookOpen, Pin, Search, Plus,
  ChevronDown, X, RefreshCw, Clock, Edit3, Trash2,
  CheckCircle, AlertTriangle, Filter, ExternalLink, Globe, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50', border: 'border-l-4 border-red-500', badge: 'bg-red-100 text-red-700 border-red-200' },
  exam:   { label: 'Exam',   icon: BookOpen,    color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-l-4 border-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  general:{ label: 'General',icon: Bell,        color: 'text-teal-600', bg: 'bg-teal-50/50', border: 'border-l-4 border-teal-400', badge: 'bg-teal-100 text-teal-700 border-teal-200' },
};

const Skeleton = ({ className = '' }) => <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr), now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ─── Standard Notice Card ─────────────────────────────────────────────────────
const NoticeCard = ({ notice, isTeacherOrAdmin, onDelete, onEdit }) => {
  const config = PRIORITY_CONFIG[notice.priority] || PRIORITY_CONFIG.general;
  const PIcon = config.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-white ${config.border} p-5 rounded-r-2xl shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`shrink-0 p-2 rounded-xl ${config.bg}`}>
            <PIcon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {notice.pinned && <Pin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />}
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border ${config.badge}`}>{config.label}</span>
              {notice.subject_name && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border bg-indigo-50 text-indigo-700 border-indigo-200">{notice.subject_name}</span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-base leading-snug">{notice.title}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-3 whitespace-pre-line">{notice.content || notice.body}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(notice.created_at)}</span>
              {notice.author?.full_name && <span>by {notice.author.full_name}</span>}
              {notice.expires_at && new Date(notice.expires_at) > new Date() && (
                <span className="text-amber-500">expires {timeAgo(notice.expires_at)}</span>
              )}
            </div>
          </div>
        </div>
        {isTeacherOrAdmin && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => onEdit(notice)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit">
              <Edit3 className="h-4 w-4 text-gray-400" />
            </button>
            <button onClick={() => onDelete(notice)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Delete">
              <Trash2 className="h-4 w-4 text-red-400" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── BPUT Official Notice Card ────────────────────────────────────────────────
const BPUTNoticeCard = ({ item, isTeacherOrAdmin, onSync }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white border-l-4 border-teal-600 p-5 rounded-r-2xl shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="shrink-0 p-2.5 rounded-xl bg-teal-50 text-teal-700 font-black text-xs flex flex-col items-center justify-center min-w-[50px]">
            <Globe className="h-4 w-4 mb-0.5" />
            <span>BPUT</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {item.is_new && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border bg-red-100 text-red-700 border-red-200 animate-pulse">
                  New
                </span>
              )}
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border bg-gray-100 text-gray-700 border-gray-200">
                {item.category}
              </span>
              <span className="text-xs font-semibold text-gray-400">
                Date: {item.date}
              </span>
            </div>
            <h3 className="font-bold text-gray-900 text-base leading-snug mt-1">
              {item.title}
            </h3>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {item.link ? (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-xs font-bold transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> View Official Document
                </a>
              ) : (
                <span className="text-xs text-gray-400 italic">Notice published on BPUT portal</span>
              )}
              {isTeacherOrAdmin && (
                <button
                  onClick={() => onSync(item)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
                  title="Post to College Notice Board"
                >
                  <Pin className="h-3.5 w-3.5" /> Post to College Board
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Publish / Edit Modal (Admin & Teacher) ───────────────────────────────────
const NoticeModal = ({ notice, subjects, onClose, onSaved }) => {
  const isEdit = !!notice?.id;
  const [form, setForm] = useState({
    title: notice?.title || '',
    content: notice?.content || notice?.body || '',
    priority: notice?.priority || 'general',
    subject_id: notice?.subject_id || '',
    pinned: notice?.pinned || false,
    expires_at: notice?.expires_at ? notice.expires_at.slice(0, 16) : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) { setError('Title and content are required.'); return; }
    setLoading(true); setError('');
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        subject_id: form.subject_id ? Number(form.subject_id) : null,
        pinned: form.pinned,
        expires_at: form.expires_at || null,
      };
      if (isEdit) await api.put(`/announcements/${notice.id}`, payload);
      else await api.post('/announcements/', payload);
      toast.success(isEdit ? 'Notice updated successfully' : 'Notice published successfully');
      onSaved();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save notice.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Notice' : 'Publish College Notice'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
            placeholder="Notice title *" maxLength={200}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
          <textarea value={form.content} onChange={e => setForm(f => ({...f, content: e.target.value}))}
            placeholder="Notice details & body content... *" rows={4} maxLength={5000}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500">
                <option value="general">General</option>
                <option value="urgent">Urgent</option>
                <option value="exam">Exam</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Subject (optional)</label>
              <select value={form.subject_id} onChange={e => setForm(f => ({...f, subject_id: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500">
                <option value="">All subjects (College-wide)</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Expires at (optional)</label>
            <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({...f, expires_at: e.target.value}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({...f, pinned: e.target.checked}))}
              className="w-4 h-4 text-teal-600 rounded" />
            <span className="text-sm font-semibold text-gray-700">Pin this notice to the top</span>
          </label>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? 'Update Notice' : 'Publish Notice'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Delete Confirm ────────────────────────────────────────────────────────────
const DeleteConfirm = ({ notice, onClose, onDeleted }) => {
  const [loading, setLoading] = useState(false);
  const confirm = async () => {
    setLoading(true);
    try { 
      await api.delete(`/announcements/${notice.id}`); 
      toast.success('Notice deleted');
      onDeleted(); 
    }
    catch { onClose(); }
    finally { setLoading(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
        <Trash2 className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <h3 className="font-bold text-gray-900 mb-1">Delete Notice?</h3>
        <p className="text-sm text-gray-500 mb-5">"{notice.title}" will be permanently removed.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl">Cancel</button>
          <button onClick={confirm} disabled={loading} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl disabled:opacity-50">
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Notices Hub Page ────────────────────────────────────────────────────
const Notices = () => {
  const { user } = useContext(AuthContext);
  const [notices, setNotices] = useState([]);
  const [bputNotices, setBputNotices] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bputLoading, setBputLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('bput'); // 'bput' | 'abit' | 'subject'
  const [selectedSubject, setSelectedSubject] = useState('');
  const [search, setSearch] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editNotice, setEditNotice] = useState(null);
  const [deleteNotice, setDeleteNotice] = useState(null);
  const [page, setPage] = useState(0);
  const searchTimer = useRef(null);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  // Fetch BPUT Notifications
  const fetchBPUTNotices = useCallback(async (force = false) => {
    setBputLoading(true);
    try {
      const res = await api.get(`/announcements/bput${force ? '?force_refresh=true' : ''}`);
      setBputNotices(res.data || []);
      if (force) toast.success('BPUT notifications refreshed!');
    } catch (e) {
      console.error("Failed to load BPUT notices:", e);
    } finally {
      setBputLoading(false);
    }
  }, []);

  // Fetch College Announcements (ABIT Notices & Subject Specific)
  const fetchNotices = useCallback(async (searchVal = search) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ limit: '50', offset: String(page * 50) });
      if (searchVal) params.append('search', searchVal);
      if (tab === 'subject' && selectedSubject) {
        params.append('subject_id', selectedSubject);
      }
      const res = await api.get(`/announcements/?${params}`);
      let items = res.data.items || res.data || [];
      if (tab === 'subject' && !selectedSubject) {
        items = items.filter(n => n.subject_id !== null && n.subject_id !== undefined);
      }
      setNotices(items);
      try { 
        const u = await api.get('/announcements/unread-count'); 
        setUnreadCount(u.data.unread_count || 0); 
      } catch {}
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load notices.');
    } finally { setLoading(false); }
  }, [tab, page, search, selectedSubject]);

  useEffect(() => {
    api.get('/subjects/').then(r => setSubjects(r.data || [])).catch(() => {});
    fetchBPUTNotices();
  }, [fetchBPUTNotices]);

  useEffect(() => {
    if (tab !== 'bput') {
      fetchNotices();
    }
  }, [tab, page, selectedSubject, fetchNotices]);

  const handleSearch = (val) => {
    setSearch(val);
    if (tab === 'bput') return; // Client-side filtered below
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchNotices(val), 400);
  };

  const markRead = async () => {
    try { await api.post('/announcements/mark-read'); setUnreadCount(0); } catch {}
  };

  useEffect(() => { markRead(); }, []);

  // Admin sync BPUT item to internal college notice board
  const handleSyncBPUT = async (item) => {
    try {
      await api.post('/announcements/bput/sync', {
        title: item.title,
        link: item.link,
        priority: 'exam'
      });
      toast.success('Official BPUT notification posted to ABIT Notice Board!');
      fetchNotices();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to sync notice');
    }
  };

  const tabs = [
    { key: 'bput', label: 'BPUT Official' },
    { key: 'abit', label: 'ABIT Notices' },
    { key: 'subject', label: 'Subject Specific' },
  ];

  // Filtered BPUT list for search
  const filteredBPUT = bputNotices.filter(item => 
    !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-8 w-8 text-indigo-600" /> College & BPUT Notice Board
          </h1>
          {unreadCount > 0 && (
            <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-black rounded-full">{unreadCount} new</span>
          )}
        </div>
        {isTeacherOrAdmin && (
          <button onClick={() => { setEditNotice(null); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-all shadow-lg">
            <Plus className="h-4 w-4" /> Publish Notice
          </button>
        )}
      </div>

      {/* Search + Controls */}
      <div className="flex gap-3 mb-5 items-center flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder={
              tab === 'bput'
                ? "Search BPUT notifications..."
                : tab === 'abit'
                ? "Search ABIT notices..."
                : "Search subject notices..."
            }
            aria-label="Search notices"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
        </div>

        {tab === 'subject' && subjects.length > 0 && (
          <select
            value={selectedSubject}
            onChange={e => { setSelectedSubject(e.target.value); setPage(0); }}
            aria-label="Filter by subject"
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 bg-white text-gray-700 font-medium shrink-0"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {tab === 'bput' && (
          <button
            onClick={() => fetchBPUTNotices(true)}
            disabled={bputLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-sm font-bold transition-all border border-teal-200 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${bputLoading ? 'animate-spin' : ''}`} />
            Refresh BPUT
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPage(0); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${tab === t.key ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t.label}
            {t.key === 'bput' && bputNotices.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${tab === 'bput' ? 'bg-teal-400 text-indigo-950' : 'bg-teal-600 text-white'}`}>
                {bputNotices.length}
              </span>
            )}
            {t.key === 'abit' && tab === 'abit' && notices.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-white/20 text-white">
                {notices.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── BPUT Live Notifications Tab ── */}
      {tab === 'bput' ? (
        bputLoading && bputNotices.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : filteredBPUT.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8">
            <Globe className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700">No BPUT Notifications Found</h3>
            <p className="text-gray-400 text-sm mt-1">
              {search ? `No results matching "${search}"` : 'Click Refresh BPUT to check for new announcements.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1 px-1">
              <span>Showing {filteredBPUT.length} official BPUT notifications</span>
              <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-teal-600" /> Synced from bput.ac.in</span>
            </div>
            <AnimatePresence>
              {filteredBPUT.map(item => (
                <BPUTNoticeCard
                  key={item.id}
                  item={item}
                  isTeacherOrAdmin={isTeacherOrAdmin}
                  onSync={handleSyncBPUT}
                />
              ))}
            </AnimatePresence>
          </div>
        )
      ) : (
        /* ── Standard College Notices Tab (ABIT & Subject Specific) ── */
        loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-400 mb-3 text-3xl font-bold">!</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={() => fetchNotices()} className="flex items-center gap-2 mx-auto px-5 py-2 bg-teal-600 text-white rounded-xl font-bold">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8">
            <Bell className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700">
              {tab === 'abit' ? 'No ABIT Notices Found' : 'No Subject Notices Found'}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {search 
                ? `No results for "${search}"` 
                : tab === 'abit'
                ? 'Admin has not posted any notices yet. Click "Publish Notice" above to post.'
                : 'No subject-specific announcements posted.'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-4">
              {notices.map(n => (
                <NoticeCard key={n.id} notice={n} isTeacherOrAdmin={isTeacherOrAdmin}
                  onDelete={setDeleteNotice}
                  onEdit={(n) => { setEditNotice(n); setShowModal(true); }} />
              ))}
            </div>
          </AnimatePresence>
        )
      )}

      {/* Modals */}
      {showModal && (
        <NoticeModal
          notice={editNotice}
          subjects={subjects}
          onClose={() => { setShowModal(false); setEditNotice(null); }}
          onSaved={() => { setShowModal(false); setEditNotice(null); fetchNotices(); }}
        />
      )}
      {deleteNotice && (
        <DeleteConfirm
          notice={deleteNotice}
          onClose={() => setDeleteNotice(null)}
          onDeleted={() => { setDeleteNotice(null); fetchNotices(); }}
        />
      )}
    </div>
  );
};

export default Notices;
