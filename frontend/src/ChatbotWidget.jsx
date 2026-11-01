// ============================================================
// ChatbotWidget.jsx — AI Chat with Persistent Session History
// ============================================================

import { useState, useRef, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import api from "./services/api";

// ── Time helper ───────────────────────────────────────────────────────────────
const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ── Group sessions by date ────────────────────────────────────────────────────
const groupSessions = (sessions) => {
  const now = new Date();
  const groups = { pinned: [], today: [], yesterday: [], week: [], older: [] };
  sessions.forEach(s => {
    if (s.pinned) { groups.pinned.push(s); return; }
    const d = new Date(s.updated_at);
    const dayDiff = Math.floor((now - d) / 86400000);
    if (dayDiff === 0) groups.today.push(s);
    else if (dayDiff === 1) groups.yesterday.push(s);
    else if (dayDiff <= 7) groups.week.push(s);
    else groups.older.push(s);
  });
  return groups;
};

// ── Copy button ───────────────────────────────────────────────────────────────
const CopyBtn = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} title="Copy" style={{
      background: 'none', border: 'none', cursor: 'pointer',
      fontSize: '11px', color: copied ? '#14b8a6' : '#999',
      padding: '2px 6px', borderRadius: '4px'
    }}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

// ── Export chat ───────────────────────────────────────────────────────────────
const exportChat = (messages, title = 'Chat') => {
  const lines = [`# ${title}\n`];
  messages.forEach(m => {
    lines.push(`**${m.from === 'user' ? 'You' : 'AI'}** (${m.time || ''}):\n${m.msg}\n`);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.md`; a.click();
  URL.revokeObjectURL(url);
};

// ═══════════════════════════════════════════════════════════════
// MAIN WIDGET
// ═══════════════════════════════════════════════════════════════
export default function ChatbotWidget() {
  const { user } = useContext(AuthContext) || {};
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [chat, setChat] = useState([
    { from: "bot", msg: "Hi! I am your AI Study Assistant.\n\nAsk me anything about your subjects, coding, maths, or career tips.", time: new Date().toISOString() }
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [sessionTitle, setSessionTitle] = useState('New Chat');
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [renameText, setRenameText] = useState('');

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // ── Scroll to bottom on new message ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, busy]);

  // ── Focus input on open ──
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  // ── Load sessions when history opens ──
  const fetchSessions = useCallback(async (q = '') => {
    if (!user) return;
    setSessionsLoading(true);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : '';
      const res = await api.get(`/chat/sessions${params}`);
      setSessions(res.data || []);
    } catch { setSessions([]); }
    finally { setSessionsLoading(false); }
  }, [user]);

  useEffect(() => {
    if (showHistory) fetchSessions(historySearch);
  }, [showHistory, historySearch]);

  // ── Open a past session ──
  const openSession = async (s) => {
    try {
      const res = await api.get(`/chat/sessions/${s.id}`);
      const msgs = (res.data.messages || []).map(m => ({
        from: m.role === 'user' ? 'user' : 'bot',
        msg: m.content,
        time: m.created_at,
      }));
      setChat(msgs.length ? msgs : [{ from: 'bot', msg: 'Session loaded. Continue the conversation!', time: new Date().toISOString() }]);
      setSessionId(s.id);
      setSessionTitle(s.title || 'Chat');
      setShowHistory(false);
    } catch {
      setShowHistory(false);
    }
  };

  // ── Start new chat ──
  const newChat = () => {
    setChat([{ from: 'bot', msg: "New chat started! Ask me anything.", time: new Date().toISOString() }]);
    setSessionId(null);
    setSessionTitle('New Chat');
    setShowHistory(false);
  };

  // ── Delete a session ──
  const deleteSession = async (e, s) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${s.title}"?`)) return;
    try {
      await api.delete(`/chat/sessions/${s.id}`);
      setSessions(prev => prev.filter(x => x.id !== s.id));
      if (sessionId === s.id) newChat();
    } catch {}
  };

  // ── Pin / Unpin ──
  const pinSession = async (e, s) => {
    e.stopPropagation();
    try {
      await api.patch(`/chat/sessions/${s.id}`, { pinned: !s.pinned });
      setSessions(prev => prev.map(x => x.id === s.id ? { ...x, pinned: !x.pinned } : x));
    } catch {}
  };

  // ── Rename ──
  const startRename = (e, s) => {
    e.stopPropagation();
    setRenaming(s.id);
    setRenameText(s.title);
  };
  const commitRename = async (s) => {
    try {
      await api.patch(`/chat/sessions/${s.id}`, { title: renameText });
      setSessions(prev => prev.map(x => x.id === s.id ? { ...x, title: renameText } : x));
      if (sessionId === s.id) setSessionTitle(renameText);
    } catch {}
    setRenaming(null);
  };

  // ── Send message ──
  const doSend = useCallback(async () => {
    const question = text.trim();
    if (!question || busy) return;

    const userMsg = { from: 'user', msg: question, time: new Date().toISOString() };
    setChat(prev => [...prev, userMsg]);
    setText('');
    setBusy(true);

    try {
      // Call backend (uses JWT automatically via axios interceptor)
      const payload = { message: question };
      if (sessionId) payload.session_id = sessionId;

      const res = await api.post('/ai/chat', payload);
      const data = res.data;

      setChat(prev => [...prev, {
        from: 'bot',
        msg: data.reply || '(no reply)',
        time: new Date().toISOString(),
        provider: data.provider,
      }]);

      // Update session tracking
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
        setSessionTitle(data.session_title || 'New Chat');
        // Refresh sidebar if open
        if (showHistory) fetchSessions();
      }

      // XP toast
      if (data.xp_earned > 0) {
        console.log(`+${data.xp_earned} XP earned!`);
      }

    } catch (e) {
      // Fallback to direct fetch without JWT for anonymous users
      try {
        const fallbackRes = await fetch((process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000') + '/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: question, history: chat.slice(-6).map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.msg })) })
        });
        const data = await fallbackRes.json();
        setChat(prev => [...prev, { from: 'bot', msg: data.reply || 'No response', time: new Date().toISOString() }]);
      } catch {
        setChat(prev => [...prev, { from: 'bot', msg: 'AI temporarily unavailable. Please try again!', time: new Date().toISOString(), bad: true }]);
      }
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [text, busy, sessionId, chat, showHistory, fetchSessions]);

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  };

  const colors = {
    blue: '#1e1b4b', teal: '#14b8a6', bg: '#F0F4FF',
    white: '#FFFFFF', gray: '#F5F5F5', text: '#1A1A1A', sub: '#666'
  };

  const grouped = groupSessions(sessions);

  const SessionGroup = ({ label, items }) => {
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', padding: '0 4px' }}>{label}</div>
        {items.map(s => (
          <div key={s.id} onClick={() => openSession(s)}
            style={{
              padding: '8px 10px', borderRadius: '10px', cursor: 'pointer',
              background: sessionId === s.id ? '#e0f2fe' : 'transparent',
              marginBottom: '2px', transition: 'background 0.15s',
              display: 'flex', alignItems: 'flex-start', gap: '6px',
            }}
            onMouseEnter={e => { if (sessionId !== s.id) e.currentTarget.style.background = '#f0f0f0'; }}
            onMouseLeave={e => { if (sessionId !== s.id) e.currentTarget.style.background = 'transparent'; }}>
            {s.pinned && <span style={{ fontSize: '10px', marginTop: '2px', color: '#14b8a6', fontWeight: 'bold' }}>[P]</span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              {renaming === s.id ? (
                <input
                  value={renameText}
                  onChange={e => setRenameText(e.target.value)}
                  onBlur={() => commitRename(s)}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(s); if (e.key === 'Escape') setRenaming(null); }}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                  style={{ width: '100%', fontSize: '12px', border: '1px solid #14b8a6', borderRadius: '4px', padding: '1px 4px', outline: 'none' }}
                />
              ) : (
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
              )}
              <div style={{ fontSize: '10px', color: '#999', marginTop: '1px' }}>{timeAgo(s.updated_at)} · {s.message_count || 0} msgs</div>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button onClick={e => pinSession(e, s)} title={s.pinned ? 'Unpin' : 'Pin'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '2px', color: s.pinned ? '#14b8a6' : '#888' }}>
                {s.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button onClick={e => startRename(e, s)} title="Rename" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '2px', color: '#666' }}>Edit</button>
              <button onClick={e => deleteSession(e, s)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '2px', color: '#ef4444' }}>Del</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 99999, fontFamily: "'Segoe UI', Arial, sans-serif" }}>

      {open && (
        <div style={{
          position: 'absolute', bottom: '68px', right: '0',
          width: showHistory ? '680px' : '360px', height: '560px',
          background: colors.white, borderRadius: '20px',
          boxShadow: '0 12px 40px rgba(30,27,75,0.25)',
          display: 'flex', overflow: 'hidden', border: '1px solid #ddd',
          transition: 'width 0.3s ease',
          maxWidth: '95vw',
        }}>

          {/* ── History Sidebar ── */}
          {showHistory && (
            <div style={{ width: '280px', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', background: '#fafafa', flexShrink: 0 }}>
              <div style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                <button onClick={newChat} style={{
                  width: '100%', padding: '8px', background: '#14b8a6', color: '#fff',
                  border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer'
                }}>+ New Chat</button>
                <input
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Search chats..."
                  style={{ width: '100%', marginTop: '8px', padding: '6px 10px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                {sessionsLoading ? (
                  <div style={{ textAlign: 'center', color: '#999', padding: '20px', fontSize: '12px' }}>Loading...</div>
                ) : sessions.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#999', padding: '20px', fontSize: '12px' }}>
                    {user ? 'No chats yet.\nAsk your first question!' : 'Log in to save chat history.'}
                  </div>
                ) : (
                  <>
                    <SessionGroup label="Pinned" items={grouped.pinned} />
                    <SessionGroup label="Today" items={grouped.today} />
                    <SessionGroup label="Yesterday" items={grouped.yesterday} />
                    <SessionGroup label="Past 7 days" items={grouped.week} />
                    <SessionGroup label="Older" items={grouped.older} />
                  </>
                )}
              </div>
              {user && sessions.length > 0 && (
                <div style={{ padding: '8px', borderTop: '1px solid #eee' }}>
                  <button
                    onClick={async () => { if (window.confirm('Clear ALL chat history?')) { await api.delete('/chat/sessions?confirm=true'); setSessions([]); newChat(); } }}
                    style={{ width: '100%', padding: '6px', background: 'none', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                    Clear all history
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Main Chat Panel ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {/* Header */}
            <div style={{
              background: `linear-gradient(135deg, #1e1b4b, #14b8a6)`,
              color: '#fff', padding: '12px 14px', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sessionTitle}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.85 }}>AI Study Assistant • {user ? user.full_name : 'Guest'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                {user && (
                  <button onClick={() => setShowHistory(h => !h)} title="Chat history"
                    style={{ background: showHistory ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                    History
                  </button>
                )}
                {chat.length > 1 && (
                  <button onClick={() => exportChat(chat, sessionTitle)} title="Export chat"
                    style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                    Export
                  </button>
                )}
                <button onClick={newChat} title="New chat"
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                  New
                </button>
                <button onClick={() => setOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '6px', padding: '5px 9px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                  X
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '8px', background: colors.bg }}>
              {chat.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '84%',
                    padding: '9px 13px',
                    borderRadius: m.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.bad ? '#fff0f0' : m.from === 'user' ? '#1e1b4b' : colors.white,
                    color: m.bad ? '#c62828' : m.from === 'user' ? '#fff' : colors.text,
                    fontSize: '13px', lineHeight: '1.65', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                    border: m.from === 'bot' ? '1px solid #e8f0fe' : 'none',
                    position: 'relative',
                  }}>
                    {m.msg}
                    {m.from === 'bot' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <CopyBtn text={m.msg} />
                        {m.time && <span title={new Date(m.time).toLocaleString()} style={{ fontSize: '10px', color: '#bbb' }}>{timeAgo(m.time)}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {busy && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: colors.white, borderRadius: '18px 18px 18px 4px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid #e8f0fe' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#14b8a6', animation: 'botBounce 1.2s infinite ease-in-out', animationDelay: `${i * 0.2}s` }} />
                    ))}
                    <span style={{ fontSize: '11px', color: colors.sub, marginLeft: '2px' }}>Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick questions */}
            {chat.length <= 1 && !busy && (
              <div style={{ padding: '6px 10px', background: colors.white, borderTop: '1px solid #eef2ff', flexShrink: 0 }}>
                <div style={{ fontSize: '10px', color: colors.sub, marginBottom: '4px', fontWeight: '600' }}>Quick questions:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {['What is recursion?', 'Explain DBMS', 'What is ML?', 'OSI layers'].map((q, i) => (
                    <button key={i} onClick={() => { setText(q); inputRef.current?.focus(); }}
                      style={{ background: '#e0f2fe', color: '#14b8a6', border: 'none', borderRadius: '10px', padding: '4px 9px', fontSize: '11px', cursor: 'pointer', fontWeight: '500' }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 10px', background: colors.white, borderTop: '1px solid #eef2ff', flexShrink: 0 }}>
              <input
                ref={inputRef} type="text" value={text}
                onChange={e => setText(e.target.value)} onKeyDown={onKey}
                disabled={busy} aria-label="Type your question"
                placeholder={busy ? 'Waiting for answer...' : 'Type any question...'}
                style={{ flex: 1, border: `2px solid ${busy ? '#e0e0e0' : '#14b8a6'}`, borderRadius: '18px', padding: '8px 14px', fontSize: '13px', outline: 'none', background: busy ? colors.gray : colors.white, color: colors.text }}
              />
              <button onClick={doSend} disabled={!text.trim() || busy} aria-label="Send"
                style={{
                  background: !text.trim() || busy ? '#ccc' : 'linear-gradient(135deg, #14b8a6, #1e1b4b)',
                  color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                  fontSize: '14px', fontWeight: 'bold', cursor: !text.trim() || busy ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                {busy ? '...' : '>'}
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '4px', fontSize: '10px', color: '#bbb', background: colors.white, flexShrink: 0 }}>
              Powered by AI Study Assistant{user ? ' · History saved' : ' · Log in to save history'}
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button onClick={() => setOpen(o => !o)}
        style={{
          background: open ? '#ef4444' : 'linear-gradient(135deg, #14b8a6, #1e1b4b)',
          color: '#fff', border: 'none', borderRadius: '50px', padding: '13px 20px',
          fontSize: '13px', fontWeight: '700', cursor: 'pointer',
          boxShadow: open ? '0 4px 16px rgba(239,68,68,0.4)' : '0 4px 20px rgba(20,184,166,0.45)',
          transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '7px'
        }}>
        {open ? 'Close' : 'AI Assistant'}
      </button>

      <style>{`
        @keyframes botBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @media (max-width: 420px) {
          .chatbot-window { width: 100vw !important; height: 100vh !important; bottom: 0 !important; right: 0 !important; border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}
