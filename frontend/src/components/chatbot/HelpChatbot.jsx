import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles, Compass } from 'lucide-react';
import { getChatStatus, sendChatMessage } from '../../services/api';

const GREETING = "Namaste! I'm the Sentinel Guide — ask me how to navigate MPLADS Sentinel, what a page or " +
  "risk score means, or how to compare two MPs.";

const SUGGESTIONS = [
  'What does the risk score mean?',
  'How do I find high-priority works?',
  'How do I compare two MPs?',
  'What is this platform?',
];

export default function HelpChatbot() {
  const [open, setOpen] = useState(false);
  const [configured, setConfigured] = useState(null); // null = unknown yet
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    getChatStatus().then((s) => setConfigured(!!s.configured)).catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  const openPanel = () => { setOpen(true); setEverOpened(true); };

  const submit = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const nextHistory = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextHistory);
    setInput('');
    setSending(true);
    try {
      const res = await sendChatMessage(trimmed, messages.slice(-8));
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      if (res.source === 'gemini') setConfigured(true);
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "I couldn't reach the help service just now — please try again in a moment.",
      }]);
    } finally {
      setSending(false);
    }
  }, [messages, sending]);

  return (
    <>
      <button
        className={`chatbot-fab ${everOpened ? '' : 'invite'}`}
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={open ? 'Close help assistant' : 'Open help assistant'}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="Sentinel Guide help assistant">
          <div className="chatbot-header">
            <div className="chatbot-header-id">
              <div className="chatbot-avatar"><Compass size={16} /></div>
              <div>
                <div className="chatbot-title">Sentinel Guide</div>
                <div className={`chatbot-status ${configured ? 'ai' : ''}`}>
                  <span className="dot" />
                  {configured === null ? 'Connecting…' : configured ? 'AI-powered (Gemini)' : 'Built-in guide mode'}
                </div>
              </div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <div className="chatbot-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chatbot-bubble ${m.role}`}>
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="chatbot-bubble assistant chatbot-typing">
                <span /><span /><span />
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="chatbot-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => submit(s)}>{s}</button>
              ))}
            </div>
          )}

          <form
            className="chatbot-input-row"
            onSubmit={(e) => { e.preventDefault(); submit(input); }}
          >
            <input
              type="text"
              placeholder="Ask about a page, score, or workflow…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button type="submit" disabled={sending || !input.trim()} aria-label="Send">
              <Send size={15} />
            </button>
          </form>
          <div className="chatbot-footnote">
            <Sparkles size={11} /> Guidance only — not a source of official MPLADS data.
          </div>
        </div>
      )}
    </>
  );
}
