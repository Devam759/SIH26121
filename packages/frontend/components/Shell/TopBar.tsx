'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Bell, HelpCircle, CornerDownLeft, X } from 'lucide-react';
import { VIEW_TITLES, ViewKey, toView } from './views';
import { OFFSET_EVENTS } from '../../lib/simulation';

interface Command {
  id: string;
  label: string;
  hint: string;
  group: 'Go to' | 'Offset wells' | 'Actions';
  run: (params: URLSearchParams) => void;
}

/** Wells that carry evidence, with their incident count — the palette's index. */
const WELL_INDEX = Object.entries(
  OFFSET_EVENTS.reduce<Record<string, number>>((acc, e) => {
    acc[e.well_name] = (acc[e.well_name] || 0) + 1;
    return acc;
  }, {})
).sort((a, b) => b[1] - a[1]);

function buildCommands(): Command[] {
  const views: Command[] = (Object.keys(VIEW_TITLES) as ViewKey[]).map((key) => ({
    id: 'view:' + key,
    label: VIEW_TITLES[key],
    hint: 'View',
    group: 'Go to',
    run: (p) => p.set('view', key),
  }));

  const wells: Command[] = WELL_INDEX.map(([name, count]) => ({
    id: 'well:' + name,
    label: name,
    hint: `${count} logged ${count === 1 ? 'incident' : 'incidents'}`,
    group: 'Offset wells',
    run: (p) => {
      p.set('view', 'wells');
      p.set('well', name);
    },
  }));

  const actions: Command[] = [
    {
      id: 'act:ai',
      label: 'Ask the Geotech Copilot',
      hint: 'Overlay',
      group: 'Actions',
      run: (p) => p.set('ai', '1'),
    },
    {
      id: 'act:brief',
      label: 'Generate pre-spud hazard brief',
      hint: 'Overlay',
      group: 'Actions',
      run: (p) => p.set('brief', '1'),
    },
    {
      id: 'act:ingest',
      label: 'Ingest a well completion report',
      hint: 'Data steward',
      group: 'Actions',
      run: (p) => p.set('view', 'records'),
    },
  ];

  return [...views, ...wells, ...actions];
}

const COMMANDS = buildCommands();

/** Wall clock, ticking each second. Rendered only after mount so the server
 *  and client markup agree. */
function useClock(): string {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return '';
  return now.toLocaleTimeString('en-GB', { hour12: false });
}

export default function TopBar() {
  const router = useRouter();
  const params = useSearchParams();
  const view = toView(params.get('view'));
  const clock = useClock();

  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? COMMANDS.filter((c) => (c.label + ' ' + c.hint).toLowerCase().includes(q))
      : COMMANDS.filter((c) => c.group !== 'Offset wells');
    return matches.slice(0, 12);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setHelpOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      // Focus after the dialog paints, or the caret lands nowhere.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const run = (cmd: Command) => {
    const next = new URLSearchParams(params.toString());
    next.delete('well');
    cmd.run(next);
    router.push('/dashboard?' + next.toString(), { scroll: false });
    setOpen(false);
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (c + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter' && results[cursor]) {
      e.preventDefault();
      run(results[cursor]);
    }
  };

  const goTo = (key: ViewKey) => {
    const next = new URLSearchParams(params.toString());
    next.set('view', key);
    router.push('/dashboard?' + next.toString(), { scroll: false });
  };

  return (
    <>
      <header className="sticky top-0 z-sticky bg-bg border-b border-line-soft">
        <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          {/* Context: where you are, then what you are looking at. */}
          <div className="flex items-baseline gap-2 text-body min-w-0">
            <button
              type="button"
              onClick={() => goTo('overview')}
              className="text-ink-3 hover:text-ink transition-colors shrink-0"
            >
              Dashboard
            </button>
            <span className="text-line shrink-0" aria-hidden="true">
              /
            </span>
            <span className="text-ink font-semibold truncate">{VIEW_TITLES[view]}</span>
            <span
              className="hidden sm:block h-3 w-px bg-line mx-1 self-center shrink-0"
              aria-hidden="true"
            />
            <span className="hidden sm:inline text-label text-ink-3 font-mono truncate">
              Assam Basin &middot; Lakwa Field
            </span>
          </div>

          {/* Command field. A bordered input, not a floating rounded chip. */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hidden md:flex items-center gap-2 h-8 px-2.5 w-64 lg:w-80 border border-line bg-bg-deep text-body text-ink-3 hover:border-ink-3 transition-colors"
          >
            <Search className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            <span className="flex-1 text-left truncate">Search wells or jump to a view</span>
            <kbd className="text-micro font-mono text-ink-3 border border-line px-1 py-px shrink-0">
              Ctrl K
            </kbd>
          </button>

          <div className="flex items-center gap-1">
            {/* Wall clock — the shift reference every control room carries. */}
            <span className="hidden xl:block font-mono text-label tnum text-ink-3 tabular-nums pr-2 mr-1 border-r border-line">
              {clock || '--:--:--'}
            </span>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Search"
              className="btn btn-quiet md:hidden w-8 h-8 p-0"
            >
              <Search className="w-4 h-4" strokeWidth={1.75} />
            </button>

            <button
              type="button"
              onClick={() => goTo('alerts')}
              aria-label="Alert stream"
              title="Alert stream"
              className="btn btn-quiet relative w-8 h-8 p-0"
            >
              <Bell className="w-4 h-4" strokeWidth={1.75} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="Keyboard shortcuts and help"
              title="Keyboard shortcuts"
              className="btn btn-quiet hidden sm:grid w-8 h-8 p-0"
            >
              <HelpCircle className="w-4 h-4" strokeWidth={1.75} />
            </button>

            {/* Operator identity — an ID plate, not an avatar bubble. */}
            <div className="flex items-center gap-2 pl-2 ml-1 border-l border-line">
              <div className="w-7 h-7 shrink-0 grid place-items-center border border-line bg-surface font-mono text-micro font-bold text-ink-2">
                DO
              </div>
              <div className="hidden xl:flex flex-col leading-tight">
                <span className="text-body font-medium text-ink">Drilling Ops</span>
                <span className="text-micro text-ink-3">engineer@oilindia.in</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          className="fixed inset-0 z-modal bg-black/70 flex items-start justify-center pt-[12vh] px-4"
        >
          <div className="w-full max-w-xl bg-raised border border-line shadow-overlay overflow-hidden">
            <div className="flex items-center gap-2.5 px-3 border-b border-line-soft">
              <Search className="w-3.5 h-3.5 text-ink-3 shrink-0" strokeWidth={1.75} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={onListKey}
                placeholder="Search wells, views and actions..."
                aria-label="Search wells, views and actions"
                className="flex-1 bg-transparent py-3 text-title text-ink placeholder:text-ink-3 outline-none"
              />
              <kbd className="text-micro font-mono px-1 py-px border border-line text-ink-3 shrink-0">
                Esc
              </kbd>
            </div>

            <ul className="max-h-80 overflow-y-auto py-1">
              {results.length === 0 && (
                <li className="px-3 py-6 text-center text-body text-ink-3">
                  Nothing matches &ldquo;{query}&rdquo;.
                </li>
              )}
              {results.map((c, i) => {
                const newGroup = i === 0 || results[i - 1].group !== c.group;
                return (
                  <li key={c.id}>
                    {newGroup && (
                      <p className="hdr px-3 pt-2.5 pb-1">{c.group}</p>
                    )}
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => run(c)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-1.5 text-left border-l-2 transition-colors ${
                        i === cursor
                          ? 'bg-surface border-l-accent'
                          : 'border-l-transparent hover:bg-surface/50'
                      }`}
                    >
                      <span className="text-body text-ink truncate">{c.label}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-micro text-ink-3 font-mono">{c.hint}</span>
                        {i === cursor && <CornerDownLeft className="w-3 h-3 text-ink-3" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {helpOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          onClick={(e) => e.target === e.currentTarget && setHelpOpen(false)}
          className="fixed inset-0 z-modal bg-black/70 grid place-items-center p-4"
        >
          <div className="w-full max-w-md bg-raised border border-line shadow-overlay">
            <div className="panel-head px-4 py-2.5">
              <h2 className="panel-title">Keyboard shortcuts</h2>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="Close"
                className="btn btn-quiet w-7 h-7 p-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <dl className="px-4 py-2 text-body">
              {[
                ['Ctrl / ⌘ + K', 'Open the command palette'],
                ['Space', 'Pause or resume the telemetry feed'],
                ['[ and ]', 'Step the bit back or forward 10 m'],
                ['Esc', 'Close any overlay'],
              ].map(([keys, what]) => (
                <div
                  key={keys}
                  className="flex items-center justify-between gap-4 py-1.5 border-b border-line-soft last:border-b-0"
                >
                  <dt className="text-ink-2">{what}</dt>
                  <dd className="font-mono text-micro text-ink-3 border border-line px-1.5 py-px shrink-0">
                    {keys}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="px-4 py-3 border-t border-line-soft text-label text-ink-3 leading-relaxed">
              All well records in this deck are synthetic. When the API stack is not running the
              dashboard drives itself from the bundled Assam Basin simulator.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
