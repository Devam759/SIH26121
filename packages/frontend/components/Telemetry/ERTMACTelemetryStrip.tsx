'use client';

import { DrillingTelemetry } from '../../lib/api';
import { Activity, Gauge, Disc, Zap, Droplets, AlertTriangle, Radio } from 'lucide-react';

interface ERTMACTelemetryStripProps {
  telemetry: DrillingTelemetry | null;
  currentDepth: number;
  isSimulating: boolean;
}

export default function ERTMACTelemetryStrip({
  telemetry,
  currentDepth,
  isSimulating,
}: ERTMACTelemetryStripProps) {
  // Default values if stream hasn't received first telemetry payload
  const rop = telemetry?.rop_m_hr ?? 14.5;
  const wob = telemetry?.wob_tonnes ?? 12.5;
  const rpm = telemetry?.rpm ?? 110;
  const torque = telemetry?.torque_kn_m ?? 18.2;
  const mudWeight = telemetry?.mud_weight_sg ?? 1.16;
  const spp = telemetry?.spp_psi ?? 3120;
  const gas = telemetry?.gas_units ?? 34;
  const isAnomaly = telemetry?.status === 'ANOMALY_DETECTED' || gas > 100 || torque > 22;

  return (
    <div className="bg-[#161B22]/95 border border-[#2E3642] rounded-lg p-3 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5 pb-2 border-b border-[#2E3642]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#3A0B10] border border-[#8E1218] text-[11px] font-bold text-[#ED1C24]">
            <Radio className="w-3 h-3 text-[#ED1C24] animate-pulse" />
            <span>eRTMAC WITSML TELEMETRY</span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Real-time sensor feed synchronized with active bit depth ({currentDepth.toFixed(1)}m MD)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isAnomaly ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#3A0B10] border border-[#ED1C24] text-red-200 font-bold animate-pulse text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#ED1C24]" />
              <span>SENSOR ANOMALY (GAS / TORQUE SPIKE)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-medium text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>PARAMETERS IN SAFE ENVELOPE</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of 6 Drilling Sensor Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* ROP */}
        <div className="bg-[#0F1216] border border-[#2E3642] rounded p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-semibold">ROP</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold text-slate-100">{rop.toFixed(1)}</span>
            <span className="text-[10px] text-slate-400">m/hr</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-1">Target: 12-18 m/hr</div>
        </div>

        {/* WOB */}
        <div className="bg-[#0F1216] border border-[#2E3642] rounded p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-semibold">WOB</span>
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold text-slate-100">{wob.toFixed(1)}</span>
            <span className="text-[10px] text-slate-400">tonne</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-1">Limit: 16.0 tonne</div>
        </div>

        {/* RPM */}
        <div className="bg-[#0F1216] border border-[#2E3642] rounded p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-semibold">RPM</span>
            <Disc className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold text-slate-100">{rpm}</span>
            <span className="text-[10px] text-slate-400">rpm</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-1">Top Drive / Mud Motor</div>
        </div>

        {/* Torque */}
        <div className={`rounded p-2 flex flex-col justify-between border transition-all ${
          torque > 22
            ? 'bg-amber-950/40 border-amber-600/80 text-amber-200'
            : 'bg-[#0F1216] border-[#2E3642] text-slate-100'
        }`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-semibold">TORQUE</span>
            <Zap className={`w-3.5 h-3.5 ${torque > 22 ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold">{torque.toFixed(1)}</span>
            <span className="text-[10px] text-slate-400">kN·m</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-1">
            {torque > 22 ? 'Micro-sticking' : 'Normal smooth'}
          </div>
        </div>

        {/* Mud Weight */}
        <div className="bg-[#0F1216] border border-[#2E3642] rounded p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-semibold">MUD WEIGHT</span>
            <Droplets className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold text-slate-100">{mudWeight.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400">SG</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-1">In: {mudWeight} / Out: {(mudWeight - 0.02).toFixed(2)}</div>
        </div>

        {/* Standpipe Pressure & Gas Units */}
        <div className={`rounded p-2 flex flex-col justify-between border transition-all ${
          gas > 100
            ? 'bg-[#3A0B10] border-[#ED1C24] text-red-200'
            : 'bg-[#0F1216] border-[#2E3642] text-slate-100'
        }`}>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-semibold">TOTAL GAS</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${gas > 100 ? 'text-[#ED1C24] animate-bounce' : 'text-amber-400'}`} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-bold">{gas}</span>
            <span className="text-[10px] text-slate-400">units</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-1">
            SPP: <span className="font-mono text-slate-300">{spp} psi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
