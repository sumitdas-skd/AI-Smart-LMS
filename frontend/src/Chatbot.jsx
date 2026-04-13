// ============================================
// Chatbot.jsx — AI Chat Service
// Calls backend /ai/chat endpoint (free g4f providers)
// Falls back to direct Gemini if backend fails
// ============================================

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const GEMINI_KEYS = [
  process.env.REACT_APP_GEMINI_KEY_1,
  process.env.REACT_APP_GEMINI_KEY_2,
  process.env.REACT_APP_GEMINI_KEY_3,
  process.env.REACT_APP_GEMINI_KEY_4,
].filter(Boolean);

let geminiKeyIndex = 0;
let conversationHistory = [];

// ── Backend chat (g4f free providers) ──────────────────────────────────────
async function callBackendChat(userMessage) {
  const response = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: userMessage,
      history: conversationHistory.slice(-8).map(m => ({
        role: m.role,
        content: m.content
      }))
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Backend error ${response.status}`);
  }

  const data = await response.json();
  return data.reply;
}

// ── Direct Gemini fallback ──────────────────────────────────────────────────
async function callGeminiFallback(userMessage) {
  if (GEMINI_KEYS.length === 0) throw new Error('No Gemini keys configured');
  
  const maxTries = GEMINI_KEYS.length;
  let lastErr;
  
  for (let i = 0; i < maxTries; i++) {
    const key = GEMINI_KEYS[geminiKeyIndex % GEMINI_KEYS.length];
    geminiKeyIndex++;
    
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              ...conversationHistory,
              { role: 'user', parts: [{ text: userMessage }] }
            ]
          })
        }
      );
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        throw new Error(d.error?.message || `HTTP ${resp.status}`);
      }
      const d = await resp.json();
      return d.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// ── Public API ──────────────────────────────────────────────────────────────
export async function sendMessage(userMessage) {
  let botText;
  let usedFallback = false;

  // 1. Try backend (free g4f)
  try {
    botText = await callBackendChat(userMessage);
  } catch (backendErr) {
    console.warn('Backend AI failed, trying Gemini fallback:', backendErr.message);
    
    // 2. Try Gemini direct as last resort
    try {
      botText = await callGeminiFallback(userMessage);
      usedFallback = true;
    } catch (geminiErr) {
      console.warn('Gemini fallback also failed:', geminiErr.message);
      return {
        ok: false,
        text: `⚠️ AI service temporarily unavailable.\n\nPlease try again in a moment.`
      };
    }
  }

  // Update local conversation history for context
  conversationHistory.push(
    { role: 'user', parts: [{ text: userMessage }], content: userMessage },
    { role: 'model', parts: [{ text: botText }], content: botText }
  );
  if (conversationHistory.length > 20) {
    conversationHistory = conversationHistory.slice(-20);
  }

  return { ok: true, text: botText };
}

export function resetChat() {
  conversationHistory = [];
}
