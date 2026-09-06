'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { fetchWells, Well } from '../../lib/api';
import { useSSE } from '../../hooks/useSSE';
import ERTMACTelemetryStrip from '../../components/Telemetry/ERTMACTelemetryStrip';
import LithologyColumn from '../../components/Subsurface/LithologyColumn';
import RiskPanel from '../../components/Risk/RiskPanel';
import AlertFeed from '../../components/Alert/AlertFeed';
import ChatPanel from '../../components/Assistant/ChatPanel';
import ReviewTable from '../../components/Documents/ReviewTable';
import WellDetailModal from '../../components/Map/WellDetailModal';
import HazardBriefModal from '../../components/Risk/HazardBriefModal';
import { Play, Pause, RotateCcw, Sliders, MapPin, Database, FileText, FileSpreadsheet } from 'lucide-react';

// Dynamically import WellMap to ensure Leaflet only runs on client
const WellMap = dynamic(() => import('../../components/Map/WellMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[380px] bg-slate-900 flex items-center justify-center text-xs text-slate-500 rounded-lg border border-slate-800">
      Loading interactive basin map...
    </div>
  ),
});

export default function DashboardPage() {
  const [wells, setWells] = useState<Well[]>([]);
  const [activeWell, setActiveWell] = useState<Well | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<'monitor' | 'steward'>('monitor');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simStartDepth, setSimStartDepth] = useState<number>(2700);

  // Modal inspection states
  const [inspectWell, setInspectWell] = useState<Well | null>(null);
  const [isHazardBriefOpen, setIsHazardBriefOpen] = useState<boolean>(false);

  // Load wells on mount
  useEffect(() => {
    async function load() {
      try {
        const data = await fetchWells(26.852, 94.532, 25);
        setWells(data);
        // Default to OIL-W-042 (demo active well) or first active well
        const w42 = data.find((w) => w.name === 'OIL-W-042') || data[0];
        setActiveWell(w42 || null);
      } catch (err) {
        console.error('Failed to load wells:', err);
      }
    }
    load();
  }, []);

  // Real-time SSE stream hook
  const { currentDepth, telemetry, liveRisk, alerts } = useSSE(
    isSimulating && activeWell ? activeWell.id : '',
    simStartDepth,
    radiusKm
  );

  const handleSelectEvidenceWell = (wellName: string) => {
    const target = wells.find((w) => w.name === wellName);
    if (target) {
      setInspectWell(target);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 max-w-[1600px] w-full mx-auto">
      {/* Top Controls Ribbon */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        {/* Well & Location Indicator */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-sky-950 border border-sky-800/80 text-sky-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Monitoring Active Rig</div>
            <select
              value={activeWell?.id || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const selected = wells.find((w: Well) => w.id === e.target.value);
                if (selected) setActiveWell(selected);
              }}
              className="bg-slate-800 border border-slate-700 text-xs font-bold text-slate-100 rounded px-2 py-1 focus:outline-none focus:border-sky-500"
            >
              {wells.map((w: Well) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.status === 'active' ? '• Active Rig' : ''} ({w.field || 'Assam'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Radius Filter Slider */}
        <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded border border-slate-700/50">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <div className="text-xs">
            <span className="text-slate-400 mr-2">Radius:</span>
            <span className="font-bold text-sky-400">{radiusKm} km</span>
          </div>
          <div className="flex gap-1">
            {[5, 10, 15, 25].map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                  radiusKm === r
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {r}k
              </button>
            ))}
          </div>
        </div>

        {/* Simulation Toggles & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded font-semibold transition-colors ${
              isSimulating
                ? 'bg-amber-600/90 hover:bg-amber-500 text-slate-950'
                : 'bg-emerald-600/90 hover:bg-emerald-500 text-white'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? 'Pause Stream' : 'Resume Stream'}</span>
          </button>

          <button
            onClick={() => setSimStartDepth(2700)}
            title="Reset to 2,700m (Barail trigger zone)"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsHazardBriefOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Pre-Spud Brief</span>
          </button>

          {/* View Mode Switcher */}
          <div className="border-l border-slate-700 pl-2 ml-1 flex gap-1">
            <button
              onClick={() => setActiveTab('monitor')}
              className={`text-xs px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'monitor'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Operations Console</span>
            </button>
            <button
              onClick={() => setActiveTab('steward')}
              className={`text-xs px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'steward'
                  ? 'bg-sky-600 text-white font-bold'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Data Steward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Synchronized Real-time eRTMAC Sensor Telemetry Strip */}
      <ERTMACTelemetryStrip
        telemetry={telemetry}
        currentDepth={currentDepth}
        isSimulating={isSimulating}
      />

      {/* Main Grid View */}
      {activeTab === 'monitor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          {/* Left Column (7 cols): Stratigraphy + Map + Alerts */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Interactive Subsurface Stratigraphy Column */}
            <LithologyColumn currentDepth={currentDepth} />

            {/* Basin Map */}
            <div className="h-[380px] w-full">
              <WellMap
                wells={wells}
                activeWell={activeWell}
                radiusKm={radiusKm}
                onSelectWell={(w: Well) => {
                  if (activeWell && w.id !== activeWell.id) {
                    setInspectWell(w);
                  } else {
                    setActiveWell(w);
                  }
                }}
              />
            </div>

            {/* Real-time Alert Feed */}
            <AlertFeed alerts={alerts} />
          </div>

          {/* Right Column (5 cols): Risk Engine & RAG Assistant */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <RiskPanel
              risk={liveRisk}
              currentDepth={currentDepth}
              formation="Barail"
              wellName={activeWell?.name || 'Active Rig'}
              isSimulating={isSimulating}
              onOpenHazardBrief={() => setIsHazardBriefOpen(true)}
              onSelectEvidenceWell={handleSelectEvidenceWell}
            />
            <ChatPanel
              activeWellId={activeWell?.id || ''}
              currentDepth={currentDepth}
              formation="Barail"
              radiusKm={radiusKm}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <ReviewTable />
        </div>
      )}

      {/* Modals */}
      {inspectWell && (
        <WellDetailModal
          well={inspectWell}
          onClose={() => setInspectWell(null)}
        />
      )}

      {isHazardBriefOpen && (
        <HazardBriefModal
          well={activeWell}
          risk={liveRisk}
          currentDepth={currentDepth}
          formation="Barail"
          onClose={() => setIsHazardBriefOpen(false)}
        />
      )}
    </div>
  );
}
