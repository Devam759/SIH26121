'use client';

import { AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';

interface AlertFeedProps {
  alerts: any[];
  onAcknowledge?: (alertId: string) => void;
}

export default function AlertFeed({ alerts, onAcknowledge }: AlertFeedProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-700/60 rounded-lg p-4 flex flex-col gap-3 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Alert Stream</span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
          {alerts.length} Events
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
        {alerts.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center">
            No active alerts in current operating window
          </div>
        ) : (
          alerts.map((alert, idx) => {
            const isHigh = alert.level === 'HIGH' || alert.score >= 70;
            return (
              <div
                key={alert.id || idx}
                className={`p-2.5 rounded border text-xs flex flex-col gap-1 transition-all ${
                  isHigh
                    ? 'bg-red-950/40 border-red-800/60 text-red-200'
                    : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{alert.level || 'ALERT'} Hazard (Score {alert.score}/100)</span>
                  </div>
                  {alert.current_depth_m && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                      {alert.current_depth_m.toFixed(1)}m
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-300">
                  {alert.message || `${alert.evidenceWellCount || 0} offset wells reported drilling incidents near current depth.`}
                </div>

                {alert.factors && (
                  <div className="flex gap-2 mt-1 text-[10px] text-slate-400">
                    <span>Depth: {alert.factors.find((f: any) => f.name === 'depth_proximity')?.score || 0} pts</span>
                    <span>•</span>
                    <span>Formation: {alert.factors.find((f: any) => f.name === 'formation_match')?.score || 0} pts</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
