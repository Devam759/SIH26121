'use client';

import { useMemo, useState } from 'react';
import { Well } from '../../lib/api';
import { eventsByWell } from '../../lib/simulation';
import { ArrowUpDown, Crosshair, ShieldAlert } from 'lucide-react';

interface OffsetWellTableProps {
  wells: Well[];
  activeWell: Well | null;
  radiusKm: number;
  highlight?: string | null;
  onInspect: (well: Well) => void;
  onMakeActive: (well: Well) => void;
}

type SortKey = 'distance_km' | 'name' | 'total_depth_m' | 'incidents' | 'severity';

const SEVERITY_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Well' },
  { key: 'distance_km', label: 'Offset', numeric: true },
  { key: 'total_depth_m', label: 'Total depth', numeric: true },
  { key: 'incidents', label: 'Logged incidents', numeric: true },
  { key: 'severity', label: 'Worst severity' },
];

export default function OffsetWellTable({
  wells,
  activeWell,
  radiusKm,
  highlight,
  onInspect,
  onMakeActive,
}: OffsetWellTableProps) {
  const [sort, setSort] = useState<SortKey>('distance_km');
  const [asc, setAsc] = useState(true);
  const [withIncidentsOnly, setWithIncidentsOnly] = useState(false);

  const byWell = useMemo(() => eventsByWell(), []);

  const rows = useMemo(() => {
    const enriched = wells
      .filter((w) => (w.distance_km ?? 0) <= radiusKm)
      .map((w) => {
        const events = byWell[w.name] ?? [];
        const worst = events.reduce(
          (acc, e) => (SEVERITY_RANK[e.severity] > SEVERITY_RANK[acc] ? e.severity : acc),
          'UNKNOWN'
        );
        return { well: w, incidents: events.length, worst };
      })
      .filter((r) => !withIncidentsOnly || r.incidents > 0);

    const dir = asc ? 1 : -1;
    return enriched.sort((a, b) => {
      switch (sort) {
        case 'name':
          return dir * a.well.name.localeCompare(b.well.name);
        case 'total_depth_m':
          return dir * (a.well.total_depth_m - b.well.total_depth_m);
        case 'incidents':
          return dir * (a.incidents - b.incidents);
        case 'severity':
          return dir * (SEVERITY_RANK[a.worst] - SEVERITY_RANK[b.worst]);
        default:
          return dir * ((a.well.distance_km ?? 0) - (b.well.distance_km ?? 0));
      }
    });
  }, [wells, radiusKm, byWell, sort, asc, withIncidentsOnly]);

  const toggleSort = (key: SortKey) => {
    if (key === sort) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(key === 'distance_km' || key === 'name');
    }
  };

  const totalIncidents = rows.reduce((n, r) => n + r.incidents, 0);

  return (
    <section className="panel overflow-hidden">
      <header className="panel-head px-4 py-2.5 flex-wrap">
        <div>
          <h2 className="panel-title">Offset Wells</h2>
          <p className="meta mt-0.5">
            {rows.length} wells inside the {radiusKm} km buffer &middot;{' '}
            <span className="font-mono">{totalIncidents}</span> logged incidents between them
          </p>
        </div>

        <button
          type="button"
          onClick={() => setWithIncidentsOnly((v) => !v)}
          aria-pressed={withIncidentsOnly}
          className={`btn ${
            withIncidentsOnly ? 'bg-accent-wash border-accent-line text-accent-ink' : ''
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          With incidents only
        </button>
      </header>

      <div className="overflow-x-auto max-h-[34rem]">
        <table className="w-full text-left text-body min-w-[48rem]">
          <thead className="sticky top-0 z-10 bg-raised border-b border-line">
            <tr className="text-ink-3">
              {COLUMNS.map((c) => (
                <th key={c.key} className={`hdr py-2 px-4 whitespace-nowrap ${c.numeric ? 'text-right' : ''}`}>
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className={`inline-flex items-center gap-1.5 hover:text-ink transition-colors ${
                      sort === c.key ? 'text-ink' : ''
                    }`}
                  >
                    {c.label}
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </button>
                </th>
              ))}
              <th className="hdr py-2 px-4 whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-4 py-10 text-center">
                  <p className="text-xs text-ink-3 max-w-[46ch] mx-auto">
                    No offset wells inside {radiusKm} km. Widen the radius in the toolbar to pull
                    more of the Lakwa and Moran fields into the appraisal.
                  </p>
                </td>
              </tr>
            ) : (
              rows.map(({ well, incidents, worst }) => {
                const isActive = activeWell?.id === well.id;
                const isHighlighted = highlight === well.name;
                return (
                  <tr
                    key={well.id}
                    className={`border-b border-line-soft last:border-b-0 transition-colors ${
                      isHighlighted ? 'bg-accent-wash' : 'hover:bg-surface/40'
                    }`}
                  >
                    <td className="py-2 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onInspect(well)}
                        className="font-semibold text-ink hover:text-accent-ink transition-colors"
                      >
                        {well.name}
                      </button>
                      <span className="ml-2 text-micro text-ink-3 capitalize">
                        {well.status}
                      </span>
                      {isActive && (
                        <span className="ml-2 text-micro font-semibold text-accent px-1.5 py-0.5 rounded bg-accent-wash">
                          Active rig
                        </span>
                      )}
                      <p className="text-micro text-ink-3 mt-0.5 font-normal">
                        {well.field} Field &middot; {well.api_number}
                      </p>
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-ink-2 whitespace-nowrap">
                      {(well.distance_km ?? 0).toFixed(1)} km
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-ink-3 whitespace-nowrap">
                      {well.total_depth_m.toFixed(0)} m
                    </td>
                    <td className="py-2 px-4 text-right font-mono whitespace-nowrap">
                      <span className={incidents > 0 ? 'text-ink font-semibold' : 'text-ink-3'}>
                        {incidents}
                      </span>
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      {incidents === 0 ? (
                        <span className="text-label text-ink-3">&mdash;</span>
                      ) : (
                        <span
                          className={`tag ${
                            worst === 'HIGH'
                              ? 'bg-brand-wash text-brand-ink border border-brand-line'
                              : worst === 'MEDIUM'
                                ? 'bg-warn-wash text-warn-ink border border-warn-line'
                                : 'bg-ok-wash text-ok-ink border border-ok-line'
                          }`}
                        >
                          {worst}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onInspect(well)}
                          className="btn"
                        >
                          Records
                        </button>
                        <button
                          type="button"
                          onClick={() => onMakeActive(well)}
                          disabled={isActive}
                          title="Drive the telemetry deck from this rig"
                          className="btn"
                        >
                          <Crosshair className="w-3 h-3" />
                          Set active
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
