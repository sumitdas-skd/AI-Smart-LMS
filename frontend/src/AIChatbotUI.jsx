// ============================================
// ChatbotWidget.jsx — Complete Working UI
// ============================================

import { 
  useState, 
  useRef, 
  useEffect, 
  useCallback 
} from "react";
import { sendMessage, resetChat } from "./AIChatbot";

export default function ChatbotWidget() {

  const [open, setOpen]       = useState(false);
  const [busy, setBusy]       = useState(false);
  const [text, setText]       = useState("");
  const [chat, setChat]       = useState([
    {
      from: "bot",
      msg: "👋 Hi! I am your AI Study Assistant!\n\n" +
           "I use Gemini 2.0 Flash AI.\n" +
           "I can answer ANY question you have!\n\n" +
           "📚 Engineering subjects\n" +
           "💻 Programming help\n" +
           "🔢 Maths problems\n" +
           "🔬 Science concepts\n" +
           "💡 Career & study tips\n" +
           "❓ Anything else!\n\n" +
           "Type your question below! 😊"
    }
  ]);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [chat, busy]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [open]);

  // ==========================================
  // SEND MESSAGE — Fixed with finally block
  // ==========================================
  const doSend = useCallback(async () => {

    const question = text.trim();
    if (!question || busy) return;

    // Show user message
    setChat(prev => [
      ...prev,
      { from: "user", msg: question }
    ]);

    // Clear input
    setText("");

    // Start loading — ALWAYS set true here
    setBusy(true);

    try {
      // Call Gemini 2.0 Flash API
      const result = await sendMessage(question);

      // Show bot answer
      setChat(prev => [
        ...prev,
        {
          from: "bot",
          msg: result.text,
          bad: !result.ok
        }
      ]);

    } catch (e) {
      // Show error if something crashes
      setChat(prev => [
        ...prev,
        {
          from: "bot",
          msg: "Something went wrong.\n" +
               "Please try again! 😊",
          bad: true
        }
      ]);

    } finally {
      // THIS ALWAYS RUNS — stops infinite thinking
      setBusy(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }

  }, [text, busy]);

  // Send on Enter key
  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  };

  // Clear chat
  const clearChat = () => {
    resetChat();
    setChat([{
      from: "bot",
      msg: "Chat cleared! ✅\n" +
           "Ask me anything! 😊"
    }]);
  };

  // Quick questions
  const quickQ = [
    "What is recursion?",
    "Explain DBMS",
    "Write Hello World in Java",
    "What is ML?",
    "Explain OSI layers"
  ];

  // ==========================================
  // STYLES
  // ==========================================
  const colors = {
    blue:     "#1565C0",
    lightBlue:"#1a73e8",
    bg:       "#F0F4FF",
    white:    "#FFFFFF",
    gray:     "#F5F5F5",
    text:     "#1A1A1A",
    sub:      "#666666",
    red:      "#C62828",
    redBg:    "#FFF0F0"
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div style={{
      position:   "fixed",
      bottom:     "20px",
      right:      "20px",
      zIndex:     99999,
      fontFamily: "'Segoe UI', Arial, sans-serif"
    }}>

      {/* ============================
          CHAT WINDOW
          ============================ */}
      {open && (
        <div style={{
          position:     "absolute",
          bottom:       "68px",
          right:        "0",
          width:        "360px",
          height:       "540px",
          background:   colors.white,
          borderRadius: "20px",
          boxShadow:    "0 12px 40px " +
                        "rgba(21,101,192,0.25)",
          display:      "flex",
          flexDirection:"column",
          overflow:     "hidden",
          border:       "1px solid #DDEEFF"
        }}>

          {/* --- Header --- */}
          <div style={{
            background: "linear-gradient(" +
                        "135deg," +
                        colors.lightBlue + "," +
                        colors.blue + ")",
            color:      colors.white,
            padding:    "14px 16px",
            display:    "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0
          }}>
            <div style={{
              display:    "flex",
              alignItems: "center",
              gap:        "10px"
            }}>
              <span style={{fontSize:"26px"}}>
                🤖
              </span>
              <div>
                <div style={{
                  fontWeight: "700",
                  fontSize:   "15px"
                }}>
                  AI Study Assistant
                </div>
                <div style={{
                  fontSize:  "11px",
                  opacity:   "0.92",
                  marginTop: "1px"
                }}>
                  ⚡ Gemini 2.0 Flash • Always Online
                </div>
              </div>
            </div>

            {/* Header buttons */}
            <div style={{
              display: "flex",
              gap:     "6px"
            }}>
              <button
                onClick={clearChat}
                title="Clear chat"
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border:     "none",
                  color:      colors.white,
                  borderRadius:"6px",
                  padding:    "5px 9px",
                  cursor:     "pointer",
                  fontSize:   "13px"
                }}>
                🗑️
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border:     "none",
                  color:      colors.white,
                  borderRadius:"6px",
                  padding:    "5px 9px",
                  cursor:     "pointer",
                  fontSize:   "14px",
                  fontWeight: "bold"
                }}>
                ✕
              </button>
            </div>
          </div>

          {/* --- Messages --- */}
          <div style={{
            flex:          1,
            overflowY:     "auto",
            padding:       "14px 12px",
            display:       "flex",
            flexDirection: "column",
            gap:           "10px",
            background:    colors.bg
          }}>

            {/* Render all messages */}
            {chat.map((m, i) => (
              <div key={i} style={{
                display:       "flex",
                justifyContent: m.from === "user"
                                ? "flex-end"
                                : "flex-start"
              }}>
                <div style={{
                  maxWidth:     "84%",
                  padding:      "10px 14px",
                  borderRadius: m.from === "user"
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                  background:   m.bad
                    ? colors.redBg
                    : m.from === "user"
                      ? colors.lightBlue
                      : colors.white,
                  color: m.bad
                    ? colors.red
                    : m.from === "user"
                      ? colors.white
                      : colors.text,
                  fontSize:     "13.5px",
                  lineHeight:   "1.65",
                  whiteSpace:   "pre-wrap",
                  wordBreak:    "break-word",
                  boxShadow:    "0 1px 4px " +
                                "rgba(0,0,0,0.07)",
                  border: m.bad
                    ? "1px solid #FFCDD2"
                    : m.from === "user"
                      ? "none"
                      : "1px solid #E8F0FE"
                }}>
                  {m.from === "bot" && (
                    <span style={{marginRight:"4px"}}>
                      🤖
                    </span>
                  )}
                  {m.msg}
                </div>
              </div>
            ))}

            {/* Thinking animation */}
            {busy && (
              <div style={{
                display:    "flex",
                justifyContent: "flex-start"
              }}>
                <div style={{
                  background:   colors.white,
                  borderRadius: "18px 18px 18px 4px",
                  padding:      "12px 16px",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "6px",
                  border:       "1px solid #E8F0FE",
                  boxShadow:    "0 1px 4px " +
                                "rgba(0,0,0,0.07)"
                }}>
                  <span style={{fontSize:"13px"}}>
                    🤖
                  </span>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width:     "7px",
                      height:    "7px",
                      borderRadius:"50%",
                      background: colors.lightBlue,
                      animation: "botBounce 1.2s " +
                                 "infinite ease-in-out",
                      animationDelay: i * 0.2 + "s"
                    }}/>
                  ))}
                  <span style={{
                    fontSize: "12px",
                    color:    colors.sub,
                    marginLeft:"4px"
                  }}>
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* --- Quick Questions --- */}
          {chat.length <= 1 && !busy && (
            <div style={{
              padding:    "8px 12px",
              background: colors.white,
              borderTop:  "1px solid #EEF2FF",
              flexShrink: 0
            }}>
              <div style={{
                fontSize:     "11px",
                color:        colors.sub,
                marginBottom: "6px",
                fontWeight:   "600"
              }}>
                Quick questions:
              </div>
              <div style={{
                display:  "flex",
                flexWrap: "wrap",
                gap:      "5px"
              }}>
                {quickQ.map((q, i) => (
                  <button key={i}
                    onClick={() => {
                      setText(q);
                      inputRef.current?.focus();
                    }}
                    style={{
                      background:   "#E8F0FE",
                      color:        colors.lightBlue,
                      border:       "none",
                      borderRadius: "12px",
                      padding:      "5px 10px",
                      fontSize:     "11px",
                      cursor:       "pointer",
                      fontWeight:   "500"
                    }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* --- Input Area --- */}
          <div style={{
            display:    "flex",
            alignItems: "center",
            gap:        "8px",
            padding:    "10px 12px",
            background: colors.white,
            borderTop:  "1px solid #EEF2FF",
            flexShrink: 0
          }}>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={onKey}
              disabled={busy}
              placeholder={
                busy
                ? "Please wait for answer..."
                : "Type any question here..."
              }
              style={{
                flex:         1,
                border:       "2px solid " +
                              (busy
                                ? "#E0E0E0"
                                : colors.lightBlue),
                borderRadius: "20px",
                padding:      "9px 16px",
                fontSize:     "13px",
                outline:      "none",
                background:   busy
                              ? colors.gray
                              : colors.white,
                color:        colors.text,
                transition:   "border 0.2s"
              }}
            />
            <button
              onClick={doSend}
              disabled={!text.trim() || busy}
              style={{
                background:   !text.trim() || busy
                              ? "#CCCCCC"
                              : "linear-gradient(" +
                                "135deg," +
                                colors.lightBlue +
                                "," +
                                colors.blue + ")",
                color:        colors.white,
                border:       "none",
                borderRadius: "50%",
                width:        "42px",
                height:       "42px",
                fontSize:     "17px",
                cursor:       !text.trim() || busy
                              ? "not-allowed"
                              : "pointer",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                flexShrink:   0,
                transition:   "background 0.2s",
                boxShadow:    !text.trim() || busy
                              ? "none"
                              : "0 2px 8px " +
                                "rgba(26,115," +
                                "232,0.4)"
              }}>
              {busy ? "⏳" : "➤"}
            </button>
          </div>

          {/* Footer */}
          <div style={{
            textAlign:  "center",
            padding:    "5px",
            fontSize:   "10px",
            color:      "#AAAAAA",
            background: colors.white,
            flexShrink: 0
          }}>
            Powered by Google Gemini 2.0 Flash AI
          </div>

        </div>
      )}

      {/* ============================
          OPEN/CLOSE BUTTON
          ============================ */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background:   open
                        ? "#E53935"
                        : "linear-gradient(" +
                          "135deg," +
                          colors.lightBlue + "," +
                          colors.blue + ")",
          color:        colors.white,
          border:       "none",
          borderRadius: "50px",
          padding:      "13px 22px",
          fontSize:     "14px",
          fontWeight:   "700",
          cursor:       "pointer",
          boxShadow:    open
                        ? "0 4px 16px " +
                          "rgba(229,57,53,0.4)"
                        : "0 4px 20px " +
                          "rgba(26,115,232,0.45)",
          transition:   "all 0.3s ease",
          display:      "flex",
          alignItems:   "center",
          gap:          "8px"
        }}>
        {open ? "✕ Close Chat" : "💬 AI Assistant"}
      </button>

      {/* Animation styles */}
      <style>{`
        @keyframes botBounce {
          0%, 60%, 100% {
            transform: translateY(0px);
            opacity: 0.35;
          }
          30% {
            transform: translateY(-7px);
            opacity: 1;
          }
        }
        @media (max-width: 420px) {
          .chatbot-window {
            width: 100vw !important;
            height: 100vh !important;
            bottom: 0 !important;
            right: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
