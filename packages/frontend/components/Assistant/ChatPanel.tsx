'use client';

import { useEffect, useRef, useState } from 'react';
import { askAssistant, SourceCard } from '../../lib/api';
import { searchEvents } from '../../lib/simulation';
import { ArrowUp, Bot, Sparkles } from 'lucide-react';

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
  /** Answered by local retrieval rather than the model — surfaced in the UI. */
  offline?: boolean;
  timestamp: string;
}

const SAMPLE_QUESTIONS = [
  'Drilling problems near 2800 m in Barail?',
  'What cured severe mud loss nearby?',
  'Any stuck pipe incidents in the radius?',
];

/**
 * Retrieval-only answer from the bundled offset corpus. Used when the
 * Gemini-backed endpoint is unreachable, so the panel still cites real records
 * instead of showing a dead end. Labelled as offline — it does not synthesise.
 */
function offlineAnswer(question: string): { answer: string; sourceCards: SourceCard[] } {
  const hits = searchEvents(question);

  if (hits.length === 0) {
    return {
      answer:
        'The assistant API is unreachable, so I searched the bundled offset records directly and found nothing matching that. Try naming a formation (Barail, Tipam, Bokabil), an event type (kick, mud loss, stuck pipe, torque spike) or a depth.',
      sourceCards: [],
    };
  }

  const lines = hits.map(
    (e) =>
      `• ${e.well_name} — ${e.event_type.replace(/_/g, ' ').toLowerCase()} at ${e.depth_m} m in the ${e.formation} (${e.severity.toLowerCase()} severity, ${e.distance_km} km offset).` +
      (e.mitigation ? ` Cured by: ${e.mitigation}.` : ' No mitigation was recorded.')
  );

  const preamble =
    'Offline retrieval — the assistant API is unreachable, so this is a direct lookup over the offset records with no model in the loop.';

  return {
    answer: [preamble, '', ...lines].join('\n'),
    sourceCards: hits.map((e) => ({
      wellName: e.well_name,
      depthM: e.depth_m,
      formation: e.formation ?? 'Unknown',
      eventType: e.event_type,
      documentId: e.id,
      page: 1,
      snippet: e.mitigation ?? `${e.severity} severity, ${e.distance_km} km from the active rig.`,
    })),
  };
}

const now = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function ChatPanel({
  activeWellId,
  currentDepth,
  formation,
  radiusKm,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Ask about offset historical events, formations, or proven mitigations. Answers are grounded in the retrieved well records and cite their sources.',
      timestamp: '',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: q, timestamp: now() }]);
    setInput('');
    setLoading(true);

    try {
      const res = await askAssistant(q, activeWellId, currentDepth, undefined, formation, radiusKm);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          sourceCards: res.sourceCards,
          timestamp: now(),
        },
      ]);
    } catch {
      const fallback = offlineAnswer(q);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: fallback.answer,
          sourceCards: fallback.sourceCards,
          offline: true,
          timestamp: now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel p-4 flex flex-col h-full min-h-[360px] overflow-hidden">
      <header className="flex items-center justify-between pb-3 border-b border-line-soft">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-wash border border-accent-line grid place-items-center text-accent">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-body font-semibold text-ink">Geotech Copilot</h2>
            <p className="text-micro text-ink-3">Grounded in offset WCR records</p>
          </div>
        </div>
        <span className="tag tag-ok font-mono">
          AI Active
        </span>
      </header>

      <div ref={feedRef} className="flex-1 overflow-y-auto py-4 flex flex-col gap-3">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === 'user' ? 'self-end max-w-[85%]' : 'max-w-[95%]'}>
            <div
              className={
                m.role === 'user'
                  ? 'bg-accent-wash border border-accent-line text-ink px-3 py-2 text-body'
                  : 'bg-surface/60 border border-line-soft text-body text-ink-2 px-3 py-2 leading-relaxed'
              }
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>

            {m.sourceCards && m.sourceCards.length > 0 && (
              <details className="mt-2 group">
                <summary className="cursor-pointer text-micro text-ink-3 hover:text-ink">
                  <span>Show {m.sourceCards.length} sources cited</span>
                </summary>
                <ul className="mt-1.5 subpanel border border-line-soft overflow-hidden">
                  {m.sourceCards.map((sc, i) => (
                    <li
                      key={i}
                      className="px-3 py-2 border-t border-line-soft first:border-t-0 text-label"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-ink">{sc.wellName}</span>
                        <span className="font-mono text-ink-3 text-micro">
                          {sc.depthM ? `${sc.depthM} m` : '—'} &middot; p{sc.page}
                        </span>
                      </div>
                      <p className="text-ink-3 text-micro mt-0.5">{sc.snippet}</p>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {m.timestamp && (
              <p className="text-micro text-ink-3 mt-1 flex items-center gap-1.5">
                {m.offline && (
                  <span className="px-1.5 py-0.5 rounded bg-warn-wash text-warn-ink border border-warn-line font-medium">
                    offline retrieval
                  </span>
                )}
                {m.timestamp}
              </p>
            )}
          </div>
        ))}

        {loading && (
          <p className="text-xs text-ink-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Analyzing offset database...
          </p>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="pb-3 flex flex-wrap gap-1.5">
          {SAMPLE_QUESTIONS.map((sq) => (
            <button
              key={sq}
              type="button"
              onClick={() => handleSend(sq)}
              className="btn text-micro px-2 py-1"
            >
              {sq}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-2 border-t border-line-soft flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about offset wells, kicks, or mitigations..."
          aria-label="Ask the assistant"
          className="flex-1 bg-bg-deep border border-line px-2.5 py-2 text-body text-ink placeholder:text-ink-3 outline-none focus:border-accent transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send question"
          className="btn btn-primary w-8 h-8 p-0 shrink-0"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </form>
    </section>
  );
}
