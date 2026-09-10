'use client';

import { useState } from 'react';
import { askAssistant, SourceCard } from '../../lib/api';
import { Send, Bot, FileText, ChevronDown, ChevronUp, Sparkles, AlertCircle } from 'lucide-react';

interface ChatPanelProps {
  activeWellId: string;
  currentDepth: number;
  formation: string;
  radiusKm: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sourceCards?: SourceCard[];
  timestamp: string;
}

const SAMPLE_QUESTIONS = [
  "What drilling problems occurred near 2800m in Barail formation?",
  "What mitigations cured severe mud loss in offset wells?",
  "Were there any stuck pipe incidents reported nearby?",
];

export default function ChatPanel({ activeWellId, currentDepth, formation, radiusKm }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello Engineer. I am NWIS Drilling Decision-Support Assistant. Ask any question about offset historical events, formations, or proven mitigations.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev: Message[]) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await askAssistant(q, activeWellId, currentDepth, undefined, formation, radiusKm);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.answer,
        sourceCards: res.sourceCards,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev: Message[]) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev: Message[]) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to reach the AI assistant. Please check your backend connection or Google API key.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSources = (msgIdx: number) => {
    setExpandedSources((prev: Record<number, boolean>) => ({
      ...prev,
      [msgIdx]: !prev[msgIdx],
    }));
  };

  return (
    <div className="bg-[#161B22]/95 border border-[#2E3642] rounded-lg p-4 flex flex-col h-[560px] shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2E3642] pb-2.5 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            AI Assistant (RAG Grounded)
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          Gemini 3.6 Flash • Oil India
        </div>
      </div>

      {/* Suggested Quick Queries */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {SAMPLE_QUESTIONS.map((sq, i) => (
          <button
            key={i}
            onClick={() => handleSend(sq)}
            className="text-[10px] px-2.5 py-1 rounded bg-[#1D232C] hover:bg-[#252C37] text-slate-300 border border-[#2E3642] transition-colors text-left"
          >
            {sq}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
        {messages.map((m: Message, idx: number) => (
          <div
            key={idx}
            className={`flex flex-col gap-1 text-xs ${
              m.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`p-3 rounded-lg max-w-[90%] ${
                m.role === 'user'
                  ? 'bg-[#ED1C24] text-white rounded-br-none shadow-sm font-medium'
                  : 'bg-[#1D232C] border border-[#2E3642] text-slate-200 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>

              {/* Source Cards Accordion */}
              {m.sourceCards && m.sourceCards.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-700/60">
                  <button
                    onClick={() => toggleSources(idx)}
                    className="flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Evidence Sources ({m.sourceCards.length} Cards)</span>
                    {expandedSources[idx] ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {expandedSources[idx] && (
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {m.sourceCards.map((sc: SourceCard, scIdx: number) => (
                        <div
                          key={scIdx}
                          className="bg-slate-900/80 border border-slate-700/60 rounded p-2 text-[11px] text-slate-300"
                        >
                          <div className="flex justify-between items-center text-sky-400 font-semibold mb-1">
                            <span>{sc.wellName}</span>
                            <span className="text-[10px] text-slate-400">
                              {sc.depthM ? `${sc.depthM}m` : 'N/A'} • Page {sc.page}
                            </span>
                          </div>
                          <div className="text-[10px] text-amber-300 mb-1">
                            {sc.eventType} {sc.formation ? `(${sc.formation})` : ''}
                          </div>
                          <div className="text-[10px] text-slate-400 italic">
                            {sc.snippet}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 px-1">{m.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-[#1D232C] p-2.5 rounded border border-[#2E3642]">
            <Bot className="w-4 h-4 animate-bounce text-[#ED1C24]" />
            <span>Consulting offset records & generating grounded answer...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 mt-2 pt-2 border-t border-[#2E3642]"
      >
        <input
          type="text"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="Ask about offset wells, formations, or mitigations..."
          className="flex-1 bg-[#1D232C] border border-[#2E3642] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#ED1C24] transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-[#ED1C24] hover:bg-[#D31E2A] disabled:opacity-50 text-white px-3.5 py-2 rounded text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
}
