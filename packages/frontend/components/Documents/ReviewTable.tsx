'use client';

import { useState, useEffect } from 'react';
import { fetchEvents, updateEventStatus } from '../../lib/api';
import DocumentUploader from './DocumentUploader';
import { Check, Clock, AlertCircle, FileSpreadsheet, ShieldCheck, CheckCheck } from 'lucide-react';

export default function ReviewTable() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'EXTRACTED' | 'APPROVED'>('EXTRACTED');

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents(filter === 'ALL' ? undefined : filter);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const handleApprove = async (id: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('nwis_token') || undefined : undefined;
      await updateEventStatus(id, 'APPROVED', token);
      setEvents((prev: any[]) =>
        prev.map((e: any) => (e.id === id ? { ...e, review_status: 'APPROVED' } : e))
      );
    } catch (err) {
      alert('Failed to approve event: ' + err);
    }
  };

  const pendingCount = events.filter((e) => e.review_status === 'EXTRACTED').length;
  const approvedCount = events.filter((e) => e.review_status === 'APPROVED').length;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Document Ingestion & AI Extraction Panel */}
      <DocumentUploader onUploadSuccess={() => loadEvents()} />

      {/* 2. Steward Review Table */}
      <div className="bg-slate-900/90 border border-slate-700/60 rounded-lg p-4 flex flex-col gap-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Data Steward Validation Queue (Human-in-the-Loop)
            </span>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilter('EXTRACTED')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filter === 'EXTRACTED'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Review</span>
            </button>
            <button
              onClick={() => setFilter('APPROVED')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filter === 'APPROVED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Approved Events</span>
            </button>
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                filter === 'ALL'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              All Records
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700/70 sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-2.5 px-3">Offset Well</th>
                <th className="py-2.5 px-3">Encountered Event</th>
                <th className="py-2.5 px-3">Interval Depth</th>
                <th className="py-2.5 px-3">Formation</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Curing Mitigation</th>
                <th className="py-2.5 px-3">Review Status</th>
                <th className="py-2.5 px-3 text-right">Steward Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    Loading historical events...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No records found in this view.
                  </td>
                </tr>
              ) : (
                events.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{ev.well_name}</td>
                    <td className="py-2.5 px-3 text-amber-300 font-mono uppercase">
                      {ev.event_type.replaceAll('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {ev.depth_start_m}m {ev.depth_end_m ? `– ${ev.depth_end_m}m` : ''}
                    </td>
                    <td className="py-2.5 px-3">{ev.formation || 'Barail'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          ev.severity === 'HIGH'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : ev.severity === 'MEDIUM'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {ev.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-[220px] truncate text-slate-400" title={ev.mitigation}>
                      {ev.mitigation || 'Circulated heavier mud'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          ev.review_status === 'APPROVED'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {ev.review_status === 'APPROVED' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {ev.review_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {ev.review_status !== 'APPROVED' ? (
                        <button
                          onClick={() => handleApprove(ev.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                      ) : (
                        <span className="text-emerald-400/80 font-mono text-[10px] flex items-center justify-end gap-1">
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Validated</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
