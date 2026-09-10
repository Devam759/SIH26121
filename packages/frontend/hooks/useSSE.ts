'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RiskAssessment, DrillingTelemetry, API_BASE } from '../lib/api';
import { telemetryAt, assessRiskAt, alertMessage } from '../lib/simulation';

export interface TelemetrySnapshot extends DrillingTelemetry {
  depth: number;
  ts: number;
}

/** Alias expected by ERTMACTelemetryStrip and TrendChart. */
export type TelemetrySample = TelemetrySnapshot;

export type FeedSource = 'live' | 'offline' | 'connecting' | 'paused';

export interface LiveAlert {
  id: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
  well_name?: string;
  current_depth_m?: number;
  message: string;
  timestamp?: string;
  created_at?: string;
  acknowledged?: boolean;
  evidence?: Array<{ well_name: string; [key: string]: any }>;
  evidenceWellCount?: number;
}

interface UseSSEOptions {
  startDepth?: number;
  radiusKm?: number;
  formation?: string;
  paused?: boolean;
  origin?: { lat: number; lon: number };
}

const HISTORY_LIMIT = 120;
const STEP_M = 0.5;
const TICK_MS = 3000;

export function useSSE(
  wellId: string,
  options: UseSSEOptions | number = {},
  _legacyRadiusKm?: number,
  _legacyResetKey?: number
) {
  // Backwards-compatible overload: useSSE(id, startDepth, radiusKm, resetKey)
  const opts: UseSSEOptions =
    typeof options === 'number'
      ? { startDepth: options, radiusKm: _legacyRadiusKm ?? 10 }
      : options;

  const {
    startDepth = 2700,
    radiusKm = 10,
    formation = 'Barail',
    paused = false,
    origin = { lat: 26.852, lon: 94.532 },
  } = opts;

  const [currentDepth, setCurrentDepth] = useState<number>(startDepth);
  const [telemetry, setTelemetry] = useState<DrillingTelemetry | null>(null);
  const [history, setHistory] = useState<TelemetrySnapshot[]>([]);
  const [liveRisk, setLiveRisk] = useState<RiskAssessment | null>(null);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [source, setSource] = useState<FeedSource>('connecting');

  const depthRef = useRef<number>(startDepth);

  const pushSnapshot = useCallback((depth: number, tel: DrillingTelemetry) => {
    const snap: TelemetrySnapshot = { ...tel, depth, ts: Date.now() };
    setHistory((prev) => [...prev, snap].slice(-HISTORY_LIMIT));
  }, []);

  const seek = useCallback((depth: number) => {
    const d = Math.max(0, Math.round(depth * 10) / 10);
    depthRef.current = d;
    setCurrentDepth(d);
    const tel = telemetryAt(d);
    setTelemetry(tel);
    pushSnapshot(d, tel);
    setLiveRisk(assessRiskAt(d, formation, radiusKm, origin));
  }, [formation, radiusKm, origin, pushSnapshot]);

  const acknowledge = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Reset only on actual well or explicit startDepth change
  const prevWellIdRef = useRef<string>(wellId);
  const prevStartDepthRef = useRef<number>(startDepth);
  useEffect(() => {
    if (wellId && (prevWellIdRef.current !== wellId || prevStartDepthRef.current !== startDepth)) {
      prevWellIdRef.current = wellId;
      prevStartDepthRef.current = startDepth;
      depthRef.current = startDepth;
      setCurrentDepth(startDepth);
      setTelemetry(null);
      setHistory([]);
      setLiveRisk(null);
      setAlerts([]);
      setSource('connecting');
    }
  }, [wellId, startDepth]);

  // Live SSE connection
  useEffect(() => {
    if (!wellId || paused) {
      setSource(paused ? 'paused' : 'offline');
      return;
    }

    const currentDrillDepth = depthRef.current || startDepth;
    const url = `${API_BASE}/stream/live/${wellId}?start_depth=${currentDrillDepth}&radius_km=${radiusKm}`;
    let es: EventSource | undefined;
    let connected = false;

    const fallbackTimer = setTimeout(() => {
      if (!connected) setSource('offline');
    }, 4000);

    try {
      es = new EventSource(url);

      es.addEventListener('connected', () => {
        connected = true;
        clearTimeout(fallbackTimer);
        setSource('live');
      });

      es.addEventListener('depth_update', (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          const d: number = data.current_depth_m;
          depthRef.current = d;
          setCurrentDepth(d);
          if (data.telemetry) {
            setTelemetry(data.telemetry);
            pushSnapshot(d, data.telemetry);
          }
        } catch { /* ignore */ }
      });

      es.addEventListener('risk_update', (e) => {
        try { setLiveRisk(JSON.parse((e as MessageEvent).data)); } catch { /* ignore */ }
      });

      es.addEventListener('risk_alert', (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          setAlerts((prev) => [data, ...prev].slice(0, 10));
        } catch { /* ignore */ }
      });

      es.onerror = () => { connected = false; setSource('offline'); };
    } catch {
      setSource('offline');
    }

    return () => {
      clearTimeout(fallbackTimer);
      es?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wellId, radiusKm, paused]);

  // Offline simulator
  useEffect(() => {
    if (source !== 'offline' || paused) return;

    const id = setInterval(() => {
      const d = Math.round((depthRef.current + STEP_M) * 10) / 10;
      depthRef.current = d;
      setCurrentDepth(d);
      const tel = telemetryAt(d);
      setTelemetry(tel);
      pushSnapshot(d, tel);
      const risk = assessRiskAt(d, formation, radiusKm, origin);
      setLiveRisk(risk);

      if (risk.level === 'HIGH' && risk.evidence.length > 0) {
        const top = risk.evidence[0];
        const alertId = `${top.id ?? top.well_name}-${Math.round(d)}`;
        setAlerts((prev) => {
          if (prev.some((a) => a.id === alertId)) return prev;
          return [
            {
              id: alertId,
              level: risk.level,
              score: risk.score,
              well_name: top.well_name,
              current_depth_m: d,
              message: alertMessage(risk),
              created_at: new Date().toISOString(),
              evidence: risk.evidence ?? [],
              evidenceWellCount: risk.evidenceWellCount ?? (risk.evidence ? risk.evidence.length : 0),
            },
            ...prev,
          ].slice(0, 10);
        });
      }
    }, TICK_MS);

    return () => clearInterval(id);
  }, [source, paused, formation, radiusKm, origin, pushSnapshot]);

  return {
    currentDepth,
    telemetry,
    history,
    liveRisk,
    alerts,
    source,
    isConnected: source === 'live',
    setAlerts,
    seek,
    acknowledge,
  };
}
