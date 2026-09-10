'use client';

import { useState, useEffect, useRef } from 'react';
import { Well, fetchWellEvents } from '../../lib/api';
import { localEventsForWell } from '../../lib/simulation';
import { formationAt } from '../../lib/strata';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface WellDetailModalProps {
  well: Well | null;
  onClose: () => void;
}

export default function WellDetailModal({ well, onClose }: WellDetailModalProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    if (!well) return;
    const name = well.name;
    setLoading(true);
    fetchWellEvents(well.id)
      .then((rows) => {
        // An empty response means either a clean well or no API; the bundled
        // corpus decides, so the modal never claims a well is incident-free
        // when its records say otherwise.
        setEvents(rows.length ? rows : localEventsForWell(name));
      })
      .catch(() => setEvents(localEventsForWell(name)))
      .finally(() => setLoading(false));
  }, [well]);

  if (!well) return null;

  const meta = [
    { label: 'Total depth', value: `${well.total_depth_m} m` },
    { label: 'Latitude', value: `${Number(well.latitude).toFixed(5)}°N` },
    { label: 'Longitude', value: `${Number(well.longitude).toFixed(5)}°E` },
    { label: 'Target stratum', value: formationAt(well.total_depth_m).name },
  ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="bg-transparent p-0 w-[calc(100%-2rem)] max-w-2xl max-h-[88vh] backdrop:bg-black/70"
    >
      <div className="bg-raised border border-line shadow-overlay overflow-hidden flex flex-col max-h-[88vh] text-left">
        <header className="panel-head px-4 py-2.5 items-start">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-title font-semibold text-ink">{well.name}</h2>
              <span className="tag tag-mute capitalize">
                {well.status}
              </span>
              {well.distance_km !== undefined && (
                <span className="text-xs text-accent font-mono font-semibold">
                  {well.distance_km} km offset
                </span>
              )}
            </div>
            <p className="text-xs text-ink-3 mt-1 truncate">
              {well.api_number || 'IN-AS-OIL'} &middot; {well.field || 'Lakwa'} Field &middot;{' '}
              {well.basin || 'Brahmaputra'} Basin
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-quiet w-8 h-8 p-0 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-surface/60 border-b border-line-soft">
            {meta.map((m) => (
              <div key={m.label} className="bg-raised px-5 py-3.5">
                <p className="text-label text-ink-3">{m.label}</p>
                <p className="text-body font-semibold text-ink font-mono mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>

          <div className="px-4 py-2.5 flex items-baseline justify-between gap-4">
            <h3 className="text-body font-semibold text-ink">Drilling Incidents &amp; NPT Records</h3>
            <span className="text-xs text-ink-3 font-mono">{events.length} records</span>
          </div>

          {loading ? (
            <div className="px-4 pb-4 flex flex-col gap-2.5" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 bg-surface/60" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="px-4 pb-4 text-xs text-ink-3 leading-relaxed">
              No major NPT or drilling incident is documented for this offset well. Its records
              still contribute to the formation-match factor in the hazard score.
            </p>
          ) : (
            <ul className="border-t border-line-soft">
              {events.map((ev, idx) => (
                <li
                  key={ev.id || idx}
                  className="px-4 py-2.5 border-b border-line-soft last:border-b-0 hover:bg-surface/40 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`text-xs font-semibold ${
                        ev.severity === 'HIGH'
                          ? 'text-brand-ink'
                          : ev.severity === 'MEDIUM'
                            ? 'text-warn-ink'
                            : 'text-ok-ink'
                      }`}
                    >
                      {String(ev.event_type ?? 'EVENT').replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-xs text-ink-3 shrink-0">
                      {ev.depth_start_m}
                      {ev.depth_end_m ? `–${ev.depth_end_m}` : ''} m
                    </span>
                  </div>
                  <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                    {ev.description ||
                      `Encountered ${String(ev.event_type ?? 'event')
                        .replace(/_/g, ' ')
                        .toLowerCase()} in the ${ev.formation || 'Barail'} formation.`}
                  </p>
                  {ev.mitigation && (
                    <p className="text-label text-ink-3 mt-2 flex items-center gap-1.5">
                      <span className="text-ok-ink font-medium">Cured by:</span> {ev.mitigation}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </dialog>
  );
}
