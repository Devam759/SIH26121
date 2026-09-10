'use client';

import { useState, useEffect } from 'react';
import { fetchEvents, updateEventStatus } from '../../lib/api';
import { localEvents } from '../../lib/simulation';
import DocumentUploader from './DocumentUploader';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

type Filter = 'ALL' | 'EXTRACTED' | 'APPROVED';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'EXTRACTED', label: 'Pending review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'ALL', label: 'All records' },
];

const COLUMNS = [
  'Offset well',
  'Event',
  'Interval',
  'Formation',
  'Severity',
  'Mitigation',
  'Status',
  '',
];

export default function ReviewTable() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [filter, setFilter] = useState<Filter>('EXTRACTED');

  const status = filter === 'ALL' ? undefined : filter;

  const loadEvents = async () => {
    setLoading(true);
    try {
      const rows = await fetchEvents(status);
      // fetchEvents swallows a non-OK response and returns [], so an empty
      // result is ambiguous — probe once to tell "no records" from "no API".
      if (rows.length === 0) throw new Error('empty');
      setEvents(rows);
      setOffline(false);
      setError(null);
    } catch {
      // Fall back to the bundled corpus so the queue is reviewable offline.
      setEvents(localEvents(status));
      setOffline(true);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const handleApprove = async (id: string) => {
    // Reflect the approval immediately; the queue is a review surface and must
    // stay usable whether or not the write reaches the API.
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, review_status: 'APPROVED' } : e)));
    setError(null);
    if (offline) return;
    try {
      await updateEventStatus(id, 'APPROVED');
    } catch {
      setError('Approved locally — the API did not accept the write, so it will not persist.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <DocumentUploader onUploadSuccess={loadEvents} />

      <section className="panel overflow-hidden">
        <header className="panel-head px-4 py-2.5 flex-wrap">
          <div>
            <h2 className="panel-title">Validation Queue</h2>
            <p className="meta mt-0.5">
              Extracted offset events await human validation before factoring into real-time hazard
              scores.
              {offline && (
                <span className="text-warn-ink">
                  {' '}
                  Showing the bundled corpus &mdash; approvals stay in this browser session.
                </span>
              )}
            </p>
          </div>

          <div className="seg" role="group" aria-label="Review status">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>

        {error && (
          <p className="px-4 py-2 text-body text-brand-ink bg-brand-wash border-b border-brand-line">
            {error}
          </p>
        )}

        <div className="overflow-x-auto max-h-[30rem]">
          <table className="w-full text-left text-body min-w-[54rem]">
            <thead className="sticky top-0 z-10 bg-raised border-b border-line">
              <tr className="text-ink-3">
                {COLUMNS.map((c, i) => (
                  <th
                    key={c || i}
                    className={`hdr py-2 px-4 whitespace-nowrap ${
                      i === COLUMNS.length - 1 ? 'text-right' : ''
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [0, 1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={COLUMNS.length} className="px-4 py-2">
                      <div className="h-7 bg-surface/50" />
                    </td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-10 text-center">
                    <p className="text-xs text-ink-3 max-w-[50ch] mx-auto">
                      No records in this category. Upload a well completion report above to populate the queue.
                    </p>
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr
                    key={ev.id}
                    className="border-b border-line-soft last:border-b-0 hover:bg-surface/40 transition-colors"
                  >
                    <td className="py-2 px-4 font-semibold text-ink whitespace-nowrap">
                      {ev.well_name}
                    </td>
                    <td className="py-2 px-4 text-ink-2 whitespace-nowrap">
                      {ev.event_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2 px-4 font-mono text-ink-3 whitespace-nowrap">
                      {ev.depth_start_m}
                      {ev.depth_end_m ? `–${ev.depth_end_m}` : ''} m
                    </td>
                    <td className="py-2 px-4 text-ink-2 whitespace-nowrap">
                      {ev.formation || 'Barail'}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      <span
                        className={`tag ${
                          ev.severity === 'HIGH'
                            ? 'bg-brand-wash text-brand-ink border border-brand-line'
                            : ev.severity === 'MEDIUM'
                              ? 'bg-warn-wash text-warn-ink border border-warn-line'
                              : 'bg-ok-wash text-ok-ink border border-ok-line'
                        }`}
                      >
                        {ev.severity}
                      </span>
                    </td>
                    <td
                      className="py-2 px-4 text-ink-3 max-w-[16rem] truncate"
                      title={ev.mitigation}
                    >
                      {ev.mitigation || 'Circulated heavier mud'}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold flex items-center gap-1.5 ${
                          ev.review_status === 'APPROVED' ? 'text-ok-ink' : 'text-warn-ink'
                        }`}
                      >
                        {ev.review_status === 'APPROVED' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            Pending
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap">
                      {ev.review_status !== 'APPROVED' ? (
                        <button
                          type="button"
                          onClick={() => handleApprove(ev.id)}
                          className="btn"
                        >
                          Approve
                        </button>
                      ) : (
                        <span className="text-label text-ink-3">Validated</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
