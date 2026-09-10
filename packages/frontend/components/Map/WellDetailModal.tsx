'use client';

import { useState, useEffect } from 'react';
import { Well, fetchWellEvents } from '../../lib/api';
import { X, MapPin, Calendar, Ruler, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';

interface WellDetailModalProps {
  well: Well | null;
  onClose: () => void;
}

export default function WellDetailModal({ well, onClose }: WellDetailModalProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!well) return;
    setLoading(true);
    fetchWellEvents(well.id)
      .then((data) => setEvents(data))
      .catch((err) => console.error('Failed to load well events:', err))
      .finally(() => setLoading(false));
  }, [well]);

  if (!well) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-800/80 px-5 py-3.5 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-sky-950 border border-sky-800 text-sky-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{well.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                  well.status === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                  well.status === 'completed' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {well.status}
                </span>
                {well.distance_km !== undefined && (
                  <span className="text-[10px] text-sky-400 font-mono">
                    ({well.distance_km} km away)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                API: {well.api_number || 'IN-AS-OIL'} • {well.field || 'Lakwa'} Field, {well.basin || 'Brahmaputra'} Basin
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-800/50 border border-slate-700/40 rounded p-2.5">
              <div className="text-[10px] text-slate-400 mb-0.5">Total Depth (TD)</div>
              <div className="text-sm font-bold font-mono text-slate-200">{well.total_depth_m}m</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/40 rounded p-2.5">
              <div className="text-[10px] text-slate-400 mb-0.5">Latitude</div>
              <div className="text-sm font-bold font-mono text-slate-200">{Number(well.latitude).toFixed(5)}°N</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/40 rounded p-2.5">
              <div className="text-[10px] text-slate-400 mb-0.5">Longitude</div>
              <div className="text-sm font-bold font-mono text-slate-200">{Number(well.longitude).toFixed(5)}°E</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/40 rounded p-2.5">
              <div className="text-[10px] text-slate-400 mb-0.5">Target Stratum</div>
              <div className="text-sm font-bold text-amber-300">Barail / Tipam</div>
            </div>
          </div>

          {/* Historical Incidents Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <div className="flex items-center gap-1.5 font-bold text-slate-200">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Historical Drilling Incidents & NPT Records ({events.length})</span>
              </div>
              <span className="text-[10px] text-slate-500">Source: Historical Well Completion Reports</span>
            </div>

            {loading ? (
              <div className="text-center py-6 text-slate-500">Loading incident records...</div>
            ) : events.length === 0 ? (
              <div className="text-center py-4 bg-slate-800/30 rounded border border-dashed border-slate-800 text-slate-500">
                No major NPT or drilling incidents documented for this offset well.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {events.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-200">
                        <span className="text-amber-400 font-mono uppercase">
                          {ev.event_type.replaceAll('_', ' ')}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-semibold ${
                          ev.severity === 'HIGH' ? 'bg-red-950 text-red-300 border border-red-800' :
                          ev.severity === 'MEDIUM' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {ev.severity}
                        </span>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">
                        Depth: {ev.depth_start_m}m {ev.depth_end_m ? `– ${ev.depth_end_m}m` : ''}
                      </span>
                    </div>

                    <div className="text-slate-300 text-[11px] leading-relaxed">
                      {ev.description || `Encountered ${ev.event_type.toLowerCase()} in ${ev.formation || 'Barail formation'}.`}
                    </div>

                    {ev.mitigation && (
                      <div className="bg-slate-900/80 border border-slate-800 rounded p-2 text-[11px] text-slate-400">
                        <span className="text-emerald-400 font-semibold">Curing Action Taken: </span>
                        {ev.mitigation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-800/80 px-5 py-3 border-t border-slate-700/80 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-1.5 rounded font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
