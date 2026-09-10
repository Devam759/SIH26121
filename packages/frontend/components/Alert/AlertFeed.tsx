'use client';

import { LiveAlert } from '../../hooks/useSSE';
import { ChevronRight, Check } from 'lucide-react';

interface AlertFeedProps {
  alerts: LiveAlert[];
  /** Full-height stream view rather than the overview card. */
  expanded?: boolean;
  onAcknowledge?: (id: string) => void;
  onSeeAll?: () => void;
  onInspectWell?: (wellName: string) => void;
}

function relativeTime(iso?: string): string {
  if (!iso) return 'just now';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (isNaN(seconds) || seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

/**
 * Operational severity, from the score the engine returned. An acknowledged
 * event drops to historical no matter how it scored — it has been dealt with,
 * so it must stop competing with what has not.
 */
function severityOf(alert: LiveAlert) {
  if (alert.acknowledged) {
    return { rank: 'ACK', bar: 'bg-line', text: 'text-ink-3' } as const;
  }
  if (alert.score >= 70 || alert.level === 'HIGH') {
    return { rank: 'HIGH', bar: 'bg-brand', text: 'text-brand-ink' } as const;
  }
  if (alert.score >= 40) {
    return { rank: 'MED', bar: 'bg-warn', text: 'text-warn-ink' } as const;
  }
  return { rank: 'LOW', bar: 'bg-line', text: 'text-ink-3' } as const;
}

export default function AlertFeed({
  alerts,
  expanded = false,
  onAcknowledge,
  onSeeAll,
  onInspectWell,
}: AlertFeedProps) {
  const shown = expanded ? alerts : alerts.slice(0, 5);
  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;

  return (
    <section className={`panel flex flex-col ${expanded ? 'min-h-[60vh]' : 'h-full'}`}>
      <div className="panel-head px-4 py-2">
        <div className="min-w-0">
          <h2 className="panel-title">{expanded ? 'Alert stream' : 'Recent alerts'}</h2>
          <p className="meta truncate">
            {unacknowledged} unacknowledged of {alerts.length}
            {expanded && ' · raised at proximity score 40 or higher'}
          </p>
        </div>

        {!expanded && onSeeAll && (
          <button type="button" onClick={onSeeAll} className="btn btn-quiet px-1.5 py-1 shrink-0">
            All {alerts.length}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Column key — this is an event log, so it gets a header row. */}
      {shown.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-1 border-b border-line-soft hdr">
          <span className="w-9 shrink-0">Sev</span>
          <span className="flex-1 min-w-0">Event</span>
          <span className="w-16 text-right shrink-0">Depth</span>
          {onAcknowledge && <span className="w-6 shrink-0" aria-hidden="true" />}
        </div>
      )}

      <div className={`flex-1 min-h-0 ${expanded ? 'overflow-y-auto' : ''}`}>
        {shown.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-body text-ink-2">No hazard alerts raised</p>
            <p className="text-label text-ink-3 mt-1 max-w-[40ch] mx-auto leading-relaxed">
              The bit is clear of every scored offset incident. Drill into the Barail interval to
              see the engine fire.
            </p>
          </div>
        ) : (
          <ul>
            {shown.map((alert) => {
              const sev = severityOf(alert);
              const top = alert.evidence?.[0];
              return (
                <li
                  key={alert.id}
                  className={`settle relative flex items-center gap-3 px-4 py-2 border-b border-line-soft last:border-b-0 transition-colors ${
                    alert.acknowledged ? 'opacity-45' : 'hover:bg-surface/50'
                  }`}
                >
                  {/* Severity is an edge marker, not a coloured icon tile. */}
                  <span
                    className={`absolute left-0 inset-y-0 w-[2px] ${sev.bar}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`w-9 shrink-0 font-mono text-micro font-semibold ${sev.text}`}
                    title={`Score ${alert.score}`}
                  >
                    {sev.rank}
                  </span>

                  <button
                    type="button"
                    onClick={() => top && onInspectWell?.(top.well_name)}
                    disabled={!top}
                    className="flex-1 min-w-0 text-left disabled:cursor-default group"
                  >
                    <span className="block text-body text-ink truncate first-letter:uppercase group-hover:text-accent-ink transition-colors">
                      {alert.message}
                    </span>
                    <span className="block text-micro text-ink-3 truncate font-mono">
                      score {alert.score} &middot;{' '}
                      {alert.evidenceWellCount ?? alert.evidence?.length ?? 0} offset{' '}
                      {(alert.evidenceWellCount ?? alert.evidence?.length ?? 0) === 1 ? 'well' : 'wells'} &middot;{' '}
                      {relativeTime(alert.timestamp || alert.created_at)}
                      {alert.acknowledged && ' · acknowledged'}
                    </span>
                  </button>

                  <span
                    className={`w-16 text-right shrink-0 font-mono text-label tnum ${sev.text}`}
                  >
                    {alert.current_depth_m ? `${alert.current_depth_m.toFixed(0)} m` : '—'}
                  </span>

                  {onAcknowledge && (
                    <span className="w-6 shrink-0 grid place-items-center">
                      {!alert.acknowledged && (
                        <button
                          type="button"
                          onClick={() => onAcknowledge(alert.id)}
                          title="Acknowledge"
                          aria-label={`Acknowledge alert: ${alert.message}`}
                          className="btn btn-quiet w-6 h-6 p-0 hover:text-ok-ink"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="px-4 py-2 border-t border-line-soft flex items-center justify-between gap-3 text-micro text-ink-3">
        <span>Autonomous offset listener</span>
        <span className="flex items-center gap-1.5 font-mono">
          <span className="led bg-ok" aria-hidden="true" />
          Active
        </span>
      </div>
    </section>
  );
}
