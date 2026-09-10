'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchWells, Well } from '../../lib/api';
import { useSSE } from '../../hooks/useSSE';
import { NEARBY_WELLS, distanceKm, ANOMALY_WINDOW } from '../../lib/simulation';
import { formationAt } from '../../lib/strata';
import { toView } from '../../components/Shell/views';
import ERTMACTelemetryStrip from '../../components/Telemetry/ERTMACTelemetryStrip';
import TrendChart from '../../components/Telemetry/TrendChart';
import LithologyColumn from '../../components/Subsurface/LithologyColumn';
import RiskPanel from '../../components/Risk/RiskPanel';
import AlertFeed from '../../components/Alert/AlertFeed';
import SensorMatrix from '../../components/Telemetry/SensorMatrix';
import ChatPanel from '../../components/Assistant/ChatPanel';
import ReviewTable from '../../components/Documents/ReviewTable';
import WellDetailModal from '../../components/Map/WellDetailModal';
import HazardBriefModal from '../../components/Risk/HazardBriefModal';
import OffsetWellTable from '../../components/Wells/OffsetWellTable';
import { Bot, Maximize2, X } from 'lucide-react';

const WellMap = dynamic(() => import('../../components/Map/WellMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[320px] border border-line-soft bg-bg-deep grid place-items-center text-body text-ink-3">
      Loading Assam Basin cartography&hellip;
    </div>
  ),
});

const RADII = [5, 10, 15, 25];
const FORMATION = 'Barail';
const SPUD_DEPTH = 2700;
const MAX_DEPTH = 3800;

/** Feed provenance — the deck must never imply a live rig when it is simulating. */
const FEED_LABEL = {
  live: { text: 'WITSML live', tone: 'tag-ok', dot: 'bg-ok' },
  offline: { text: 'Offline simulator', tone: 'tag-warn', dot: 'bg-warn' },
  connecting: { text: 'Connecting', tone: 'tag-mute', dot: 'bg-ink-3' },
  paused: { text: 'Feed held', tone: 'tag-mute', dot: 'bg-ink-3' },
} as const;

export default function DashboardClient() {
  const router = useRouter();
  const params = useSearchParams();
  const view = toView(params.get('view'));
  const isCopilotOpen = params.get('ai') === '1';
  const isHazardBriefOpen = params.get('brief') === '1';
  const highlightWell = params.get('well');

  // The bundled corpus is the starting point; a reachable API replaces it.
  const [wells, setWells] = useState<Well[]>(NEARBY_WELLS);
  const [activeWellId, setActiveWellId] = useState<string>(NEARBY_WELLS[0].id);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [paused, setPaused] = useState<boolean>(false);
  const [inspectWell, setInspectWell] = useState<Well | null>(null);

  const activeWell = useMemo(
    () => wells.find((w) => w.id === activeWellId) ?? wells[0] ?? null,
    [wells, activeWellId]
  );

  // A stable identity, or the risk effect in useSSE would re-run every render.
  const origin = useMemo(
    () =>
      activeWell
        ? { lat: activeWell.latitude, lon: activeWell.longitude }
        : { lat: 26.852, lon: 94.532 },
    [activeWell]
  );

  useEffect(() => {
    fetchWells(26.852, 94.532, 25)
      .then((data) => {
        if (data?.length) {
          setWells(data);
          setActiveWellId(data.find((w) => w.name === 'OIL-W-042')?.id ?? data[0].id);
        }
      })
      .catch(() => {
        // API is down — the seeded corpus already on screen is the fallback.
      });
  }, []);

  // Distances are measured from whichever rig is active, so the radius buffer,
  // the offset table and the map always agree — whatever fed the well list.
  const wellsWithOffsets = useMemo(
    () =>
      wells
        .map((w) => ({
          ...w,
          distance_km:
            Math.round(distanceKm(origin, { lat: w.latitude, lon: w.longitude }) * 10) / 10,
        }))
        .sort((a, b) => a.distance_km - b.distance_km),
    [wells, origin]
  );

  const { currentDepth, telemetry, history, liveRisk, alerts, source, seek, acknowledge } =
    useSSE(activeWell?.id ?? '', {
      startDepth: SPUD_DEPTH,
      radiusKm,
      formation: FORMATION,
      paused,
      origin,
    });

  const setParam = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      router.push('/dashboard?' + next.toString(), { scroll: false });
    },
    [params, router]
  );

  const closeOverlay = (key: 'ai' | 'brief') => setParam((p) => p.delete(key));
  const goTo = (key: string) => setParam((p) => p.set('view', key));

  // Shortcuts advertised in the help dialog. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPaused((v) => !v);
      } else if (e.key === '[') {
        seek(Math.max(0, Math.round((currentDepth - 10) * 10) / 10));
      } else if (e.key === ']') {
        seek(Math.round((currentDepth + 10) * 10) / 10);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentDepth, seek]);

  const feed = FEED_LABEL[source];
  const inAnomaly = currentDepth >= ANOMALY_WINDOW.top && currentDepth <= ANOMALY_WINDOW.bottom;
  const formationHere = formationAt(currentDepth);

  const mapCard = (
    <WellMap
      wells={wellsWithOffsets}
      activeWell={activeWell}
      radiusKm={radiusKm}
      onSelectWell={(w) => setInspectWell(w)}
    />
  );

  return (
    <div className="flex-1 w-full min-w-0 flex flex-col max-w-[1720px] mx-auto">
      {/*
        Control bar. One rule-bounded band holding every input that changes
        what the deck is showing — mode, rig, radius — instead of a scatter of
        floating pill groups.
      */}
      <div className="border-b border-line-soft px-4 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <div className="seg" role="group" aria-label="Workspace">
          {(['overview', 'records'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => goTo(key)}
              aria-pressed={view === key}
            >
              {key === 'overview' ? 'Operations' : 'Data steward'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <label htmlFor="rig" className="hdr shrink-0">
              Rig
            </label>
            <select
              id="rig"
              value={activeWell?.id ?? ''}
              onChange={(e) => setActiveWellId(e.target.value)}
              className="h-7 min-w-0 bg-bg-deep border border-line text-body font-mono text-ink px-1.5 outline-none cursor-pointer max-w-[9rem] sm:max-w-[13rem] focus-visible:border-accent"
            >
              {wellsWithOffsets.map((w) => (
                <option key={w.id} value={w.id} className="bg-raised text-ink font-sans">
                  {w.name} ({w.field || 'Assam'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="hdr hidden sm:inline">Radius</span>
            <div className="seg" role="group" aria-label="Search radius">
              {RADII.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRadiusKm(r)}
                  aria-pressed={radiusKm === r}
                  className="font-mono"
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => setParam((p) => p.set('ai', '1'))} className="btn">
            <Bot className="w-3.5 h-3.5 text-accent-ink" strokeWidth={1.75} />
            Geotech AI
          </button>
        </div>
      </div>

      {/*
        Depth line. Feed provenance, the scrubber, and where the bit currently
        sits — the one piece of state every panel below is synchronised to.
      */}
      <div className="border-b border-line-soft bg-bg-deep px-4 sm:px-5 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={`tag ${feed.tone} shrink-0`}>
          <span className={`led ${feed.dot}`} aria-hidden="true" />
          {feed.text}
        </span>

        <div className="flex items-center gap-2.5 flex-1 min-w-[12rem]">
          <label htmlFor="depth" className="hdr shrink-0">
            Bit depth
          </label>
          <input
            id="depth"
            type="range"
            min={0}
            max={MAX_DEPTH}
            step={0.5}
            value={currentDepth}
            onChange={(e) => seek(Number(e.target.value))}
            // A range input has an intrinsic width (~129px in Chrome) and, as a
            // flex item, will not shrink below it without min-w-0 — which is
            // enough on its own to push the whole page into horizontal scroll.
            className="flex-1 min-w-0 cursor-pointer"
          />
          <span className="font-mono text-body tnum text-ink font-semibold shrink-0 w-[5.5rem] text-right">
            {currentDepth.toFixed(1)} m
          </span>
        </div>

        <span className="text-micro font-mono text-ink-3 shrink-0 hidden sm:inline">
          {formationHere.name} &middot; {((currentDepth / MAX_DEPTH) * 100).toFixed(0)}% of section
        </span>

        <button
          type="button"
          onClick={() => seek(ANOMALY_WINDOW.top + 5)}
          className={`btn shrink-0 ${inAnomaly ? 'text-brand-ink border-brand-line' : ''}`}
        >
          Barail hazard zone
        </button>
      </div>

      <div className="flex-1 px-4 sm:px-5 py-4 flex flex-col gap-4">
        {view === 'records' ? (
          <ReviewTable />
        ) : view === 'wells' ? (
          <OffsetWellTable
            wells={wellsWithOffsets}
            activeWell={activeWell}
            radiusKm={radiusKm}
            highlight={highlightWell}
            onInspect={setInspectWell}
            onMakeActive={(w) => setActiveWellId(w.id)}
          />
        ) : view === 'map' ? (
          <div className="h-[70vh] min-h-[26rem]">{mapCard}</div>
        ) : view === 'strata' ? (
          <div className="h-[70vh] min-h-[26rem]">
            <LithologyColumn currentDepth={currentDepth} />
          </div>
        ) : view === 'alerts' ? (
          <AlertFeed
            alerts={alerts}
            expanded
            onAcknowledge={acknowledge}
            onInspectWell={(name) => {
              const target = wellsWithOffsets.find((w) => w.name === name);
              if (target) setInspectWell(target);
            }}
          />
        ) : view === 'telemetry' ? (
          <>
            <ERTMACTelemetryStrip
              telemetry={telemetry}
              history={history}
              currentDepth={currentDepth}
              isSimulating={!paused}
              onOpenHazardBrief={() => setParam((p) => p.set('brief', '1'))}
              onToggleSimulate={() => setPaused((v) => !v)}
              onResetDepth={() => seek(SPUD_DEPTH)}
            />
            <TrendChart history={history} currentDepth={currentDepth} />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-7 min-w-0 flex flex-col">
                <SensorMatrix
                  telemetry={telemetry}
                  currentDepth={currentDepth}
                  isSimulating={!paused}
                />
              </div>
              <div className="lg:col-span-5 min-w-0 flex flex-col">
                <LithologyColumn currentDepth={currentDepth} />
              </div>
            </div>
          </>
        ) : (
          <>
            <ERTMACTelemetryStrip
              telemetry={telemetry}
              history={history}
              currentDepth={currentDepth}
              isSimulating={!paused}
              onOpenHazardBrief={() => setParam((p) => p.set('brief', '1'))}
              onToggleSimulate={() => setPaused((v) => !v)}
              onResetDepth={() => seek(SPUD_DEPTH)}
            />

            {/* The trace is the thing being watched, so it takes two thirds. */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-8 min-w-0 flex flex-col">
                <TrendChart history={history} currentDepth={currentDepth} />
              </div>
              <div className="lg:col-span-4 min-w-0 flex flex-col">
                <RiskPanel
                  risk={liveRisk}
                  currentDepth={currentDepth}
                  formation={FORMATION}
                  radiusKm={radiusKm}
                  wellName={activeWell?.name || 'Active rig'}
                  onOpenHazardBrief={() => setParam((p) => p.set('brief', '1'))}
                  onSelectEvidenceWell={(name) => {
                    const target = wellsWithOffsets.find((w) => w.name === name);
                    if (target) setInspectWell(target);
                  }}
                />
              </div>
            </div>

            {/* Three different widths, by importance: the event log is read
                most, the map is a locator. */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-5 min-w-0 flex flex-col">
                <AlertFeed
                  alerts={alerts}
                  onAcknowledge={acknowledge}
                  onSeeAll={() => goTo('alerts')}
                  onInspectWell={(name) => {
                    const target = wellsWithOffsets.find((w) => w.name === name);
                    if (target) setInspectWell(target);
                  }}
                />
              </div>

              <div className="lg:col-span-4 min-w-0 flex flex-col">
                <SensorMatrix
                  telemetry={telemetry}
                  currentDepth={currentDepth}
                  isSimulating={!paused}
                />
              </div>

              <div className="lg:col-span-3 min-w-0 panel flex flex-col overflow-hidden">
                <div className="panel-head px-3 py-2">
                  <h2 className="panel-title truncate">Offset map</h2>
                  <button
                    type="button"
                    onClick={() => goTo('map')}
                    className="btn btn-quiet px-1.5 py-1 shrink-0"
                    title="Open the full basin map"
                  >
                    <Maximize2 className="w-3 h-3" />
                    Expand
                  </button>
                </div>
                <div className="flex-1 min-h-[300px]">{mapCard}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {isCopilotOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Geotech Copilot"
          className="fixed inset-0 z-modal flex justify-end bg-black/60"
          onClick={(e) => e.target === e.currentTarget && closeOverlay('ai')}
        >
          <div className="w-full max-w-md h-full bg-raised border-l border-line flex flex-col">
            <div className="panel-head px-4 py-2.5 shrink-0">
              <h2 className="panel-title">Geotech Copilot</h2>
              <button
                type="button"
                onClick={() => closeOverlay('ai')}
                aria-label="Close copilot"
                className="btn btn-quiet w-7 h-7 p-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <ChatPanel
                activeWellId={activeWell?.id || ''}
                currentDepth={currentDepth}
                formation={FORMATION}
                radiusKm={radiusKm}
              />
            </div>
          </div>
        </div>
      )}

      {inspectWell && <WellDetailModal well={inspectWell} onClose={() => setInspectWell(null)} />}

      {isHazardBriefOpen && (
        <HazardBriefModal
          well={activeWell}
          risk={liveRisk}
          currentDepth={currentDepth}
          formation={FORMATION}
          radiusKm={radiusKm}
          onClose={() => closeOverlay('brief')}
        />
      )}
    </div>
  );
}
