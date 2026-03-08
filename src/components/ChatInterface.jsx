import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import api from '../utils/api';

const QUICK_PROMPTS = [
  "Show highest risk shipments",
  "Which carriers are underperforming?",
  "Any pending approvals?",
  "SLA breach status today",
  "Active disruptions summary",
];

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`chat-message flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
        style={{
          background: isUser ? 'rgba(255,107,0,0.12)' : 'rgba(0,245,255,0.08)',
          border:     `1px solid ${isUser ? 'rgba(255,107,0,0.25)' : 'rgba(0,245,255,0.2)'}`,
        }}
      >
        {isUser
          ? <User size={13} style={{ color: '#ff6b00' }} />
          : <Bot  size={13} style={{ color: '#00f5ff' }} />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div
          className="text-xs px-3 py-2.5 rounded-xl font-mono leading-relaxed whitespace-pre-wrap"
          style={{
            background: isUser
              ? 'rgba(255,107,0,0.08)'
              : msg.error
                ? 'rgba(255,45,85,0.08)'
                : 'rgba(0,245,255,0.05)',
            border: `1px solid ${isUser ? 'rgba(255,107,0,0.18)' : msg.error ? 'rgba(255,45,85,0.18)' : 'rgba(0,245,255,0.12)'}`,
            color: msg.error ? '#ff6b6b' : 'rgba(255,255,255,0.8)',
            borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          }}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="chat-message flex gap-2.5">
      <div
        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)' }}
      >
        <Bot size={13} style={{ color: '#00f5ff' }} />
      </div>
      <div
        className="px-3 py-2.5 rounded-xl"
        style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.12)' }}
      >
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: '#00f5ff',
                opacity: 0.6,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "ChainGuard Swarm online. I'm monitoring all active shipments across the network. Ask me about disruptions, carrier performance, pending approvals, or risk zones.",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const res = await api.chat({ message: userMsg });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        timestamp: res.data.timestamp || new Date().toISOString(),
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Unable to reach the swarm intelligence layer. Please try again in a moment.',
        timestamp: new Date().toISOString(),
        error: true,
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="panel flex flex-col" style={{ height: '420px' }}>
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.2)' }}
          >
            <Sparkles size={14} style={{ color: '#00f5ff' }} />
          </div>
          <div>
            <h3 className="section-title">Orchestrator AI</h3>
            <p className="text-[10px] font-mono text-white/25">Natural language ops interface</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-green" style={{ animation: 'agentPulse 2s infinite' }} />
          <span className="text-[10px] font-mono text-neon-green/60">LIVE</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg, idx) => <Message key={idx} msg={msg} />)}
        {loading && <TypingDots />}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0 hide-scrollbar">
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => sendMessage(p)}
            disabled={loading}
            className="text-[10px] px-2.5 py-1.5 rounded-full font-mono whitespace-nowrap transition-all flex-shrink-0 disabled:opacity-40"
            style={{
              background: 'rgba(0,245,255,0.04)',
              border: '1px solid rgba(0,245,255,0.12)',
              color: 'rgba(255,255,255,0.35)',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#00f5ff'; e.currentTarget.style.borderColor = 'rgba(0,245,255,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor = 'rgba(0,245,255,0.12)'; }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(0,245,255,0.08)' }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask about shipments, risks, or actions…"
            className="flex-1 px-3 py-2 rounded-lg text-xs font-mono transition-all"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0,245,255,0.15)',
              color: 'rgba(255,255,255,0.85)',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={{
              background: input.trim() ? 'rgba(0,245,255,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${input.trim() ? 'rgba(0,245,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: '#00f5ff',
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
