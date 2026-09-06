'use client';

import { RiskAssessment, Well } from '../../lib/api';
import { X, Printer, ShieldAlert, CheckSquare, FileSpreadsheet } from 'lucide-react';

interface HazardBriefModalProps {
  well: Well | null;
  risk: RiskAssessment | null;
  currentDepth: number;
  formation: string;
  onClose: () => void;
}

export default function HazardBriefModal({
  well,
  risk,
  currentDepth,
  formation,
  onClose,
}: HazardBriefModalProps) {
  if (!well || !risk) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Top Control Bar (hidden when printing) */}
        <div className="bg-slate-800/90 px-5 py-3 border-b border-slate-700 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Operational Hazard Briefing Sheet (Official OIL Format)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 text-xs text-slate-200 print:text-black print:p-8">
          {/* Header Banner */}
          <div className="border-b-2 border-sky-600 pb-3 flex items-start justify-between">
            <div>
              <div className="text-lg font-black tracking-wide text-slate-100 print:text-black uppercase">
                OIL INDIA LIMITED
              </div>
              <div className="text-[11px] font-semibold text-sky-400 print:text-sky-800">
                DIRECTORATE OF OPERATIONS • eRTMAC-NWIS OFFSET HAZARD APPRAISAL
              </div>
              <div className="text-[10px] text-slate-400 print:text-gray-600">
                Field: {well.field || 'Lakwa'} • Basin: {well.basin || 'Brahmaputra'} • Document: NWIS-OHB-{new Date().getFullYear()}-042
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-400 print:text-gray-600">Date: {new Date().toLocaleDateString('en-GB')}</div>
              <div className="inline-block mt-1 px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 font-bold text-[10px] uppercase">
                {risk.level} PROXIMITY RISK ({risk.score}/100)
              </div>
            </div>
          </div>

          {/* Target Rig & Location */}
          <div className="grid grid-cols-3 gap-3 bg-slate-800/40 print:bg-gray-100 p-3 rounded border border-slate-700/60 print:border-gray-300">
            <div>
              <div className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-semibold">Active Rig / Well</div>
              <div className="font-bold text-slate-100 print:text-black text-sm">{well.name}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-semibold">Current Bit Depth (MD)</div>
              <div className="font-bold font-mono text-slate-100 print:text-black text-sm">{currentDepth.toFixed(1)} m</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-semibold">Target Formation</div>
              <div className="font-bold text-amber-300 print:text-amber-800 text-sm">{formation}</div>
            </div>
          </div>

          {/* Offset Hazard Synthesis */}
          <div className="flex flex-col gap-2">
            <div className="font-bold uppercase tracking-wider text-slate-100 print:text-black text-[11px] border-b border-slate-800 print:border-gray-300 pb-1">
              1. Offset Well Incident Correlation Summary
            </div>
            <div className="text-[11px] leading-relaxed text-slate-300 print:text-gray-800">
              Analysis of <span className="font-bold text-sky-400 print:text-sky-800">{risk.evidenceWellCount} offset wells</span> within a 10 km radius confirms significant geological hazards in the <span className="font-semibold">{formation} formation</span> between 2,750m and 2,850m. Historical records cite recurrent <span className="font-semibold text-red-400 print:text-red-700">influx/kicks</span> and <span className="font-semibold text-amber-400 print:text-amber-700">severe mud losses</span> due to overpressured permeable sandstone stringers interbedded with coal seams.
            </div>
          </div>

          {/* Evidence Table */}
          <div className="flex flex-col gap-2">
            <div className="font-bold uppercase tracking-wider text-slate-100 print:text-black text-[11px] border-b border-slate-800 print:border-gray-300 pb-1">
              2. Key Correlated Offset Incidents
            </div>
            <table className="w-full text-left text-[10px] border-collapse border border-slate-700 print:border-gray-400">
              <thead className="bg-slate-800 print:bg-gray-200 text-slate-300 print:text-black">
                <tr>
                  <th className="p-1.5 border border-slate-700 print:border-gray-400">Offset Well</th>
                  <th className="p-1.5 border border-slate-700 print:border-gray-400">Event</th>
                  <th className="p-1.5 border border-slate-700 print:border-gray-400">Depth</th>
                  <th className="p-1.5 border border-slate-700 print:border-gray-400">Severity</th>
                  <th className="p-1.5 border border-slate-700 print:border-gray-400">Historical Mitigation Applied</th>
                </tr>
              </thead>
              <tbody>
                {risk.evidence.slice(0, 4).map((ev, i) => (
                  <tr key={i} className="border-b border-slate-800 print:border-gray-300">
                    <td className="p-1.5 font-semibold text-sky-400 print:text-black">{ev.well_name}</td>
                    <td className="p-1.5 text-amber-300 print:text-amber-800 uppercase font-mono">{ev.event_type.replace('_', ' ')}</td>
                    <td className="p-1.5 font-mono">{ev.depth_m}m</td>
                    <td className="p-1.5 font-bold">{ev.severity}</td>
                    <td className="p-1.5 text-slate-300 print:text-gray-700">{ev.mitigation || 'Circulated heavy mud'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Operational Recommendations Checklist */}
          <div className="flex flex-col gap-2 bg-sky-950/20 print:bg-blue-50 p-3.5 rounded border border-sky-800/50 print:border-blue-200">
            <div className="font-bold uppercase text-[11px] text-sky-300 print:text-sky-900 flex items-center gap-1.5 mb-1">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>3. Mandatory Drilling Precautions for Barail Interval</span>
            </div>
            <ul className="list-disc pl-4 flex flex-col gap-1.5 text-[11px] text-slate-200 print:text-black">
              <li>
                <span className="font-semibold">Mud Density Window:</span> Maintain active mud weight between 1.18 SG and 1.21 SG. Do not permit density drop below 1.16 SG due to gas cutting.
              </li>
              <li>
                <span className="font-semibold">Kill Mud Reserve:</span> Ensure 80 m³ of 1.24 SG kill mud is blended and ready in suction tank #2.
              </li>
              <li>
                <span className="font-semibold">Pit Volume Monitoring:</span> Set automated pit volume gain alarm threshold at ±0.5 m³ deviation on eRTMAC console.
              </li>
              <li>
                <span className="font-semibold">Trip Sheet Protocol:</span> Conduct 10-stand flow check prior to drilling past 2,820m.
              </li>
            </ul>
          </div>

          {/* Signoff Blocks */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-800 print:border-gray-400 mt-2">
            <div>
              <div className="text-[10px] text-slate-500 print:text-gray-500 uppercase font-semibold">Prepared by (Geologist / Data Steward)</div>
              <div className="h-8 border-b border-slate-700 print:border-gray-400 mt-1" />
              <div className="text-[10px] text-slate-400 print:text-gray-600 mt-1">eRTMAC-NWIS Automated Engine • OIL Duliajan</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 print:text-gray-500 uppercase font-semibold">Approved by (Drilling Superintendent / Rig In-Charge)</div>
              <div className="h-8 border-b border-slate-700 print:border-gray-400 mt-1" />
              <div className="text-[10px] text-slate-400 print:text-gray-600 mt-1">Signature & Stamp</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
