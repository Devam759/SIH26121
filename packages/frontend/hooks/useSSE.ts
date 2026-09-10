'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { RiskAssessment, DrillingTelemetry, API_BASE } from '../lib/api';
import { telemetryAt, assessRiskAt, alertMessage } from '../lib/simulation';

export type TelemetrySample = DrillingTelemetry & { depth: number };

export interface LiveAlert extends RiskAssessment {
  id: string;
  message: string;
  timestamp: string;
  acknowledged?: boolean;
}

/** Feed source, surfaced so the UI can say which one it is instead of guessing. */
export type FeedSource = 'connecting' | 'live' | 'offline' | 'paused';

/** 0.5 m every 3 s — the cadence the API's simulator uses. */
const TICK_MS = 3000;
const STEP_M = 0.5;
/** How long to wait for the backend before driving the deck locally. */
const GRACE_MS = 2500;
/** 160 samples ≈ 80 m of hole. */
const WINDOW = 160;

interface Options {
  startDepth?: number;
  radiusKm?: number;
  formation?: string;
  paused?: boolean;
  origin?: { lat: number; lon: number };
}

export function useSSE(wellId: string, options: Options = {}) {
  const {
    startDepth = 2700,
    radiusKm = 10,
    formation = 'Barail',
    paused = false,
    origin,
  } = options;

  const [currentDepth, setCurrentDepth] = useState<number>(startDepth);
  const [telemetry, setTelemetry] = useState<DrillingTelemetry | null>(null);
  const [history, setHistory] = useState<TelemetrySample[]>([]);
  const [liveRisk, setLiveRisk] = useState<RiskAssessment | null>(null);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [source, setSource] = useState<FeedSource>('connecting');

  // The ticker reads depth through a ref so it never needs to re-subscribe.
  const depthRef = useRef(startDepth);
  // Alerts repeat every tick while the bit sits in a hazard zone; only the
  // first sighting of a given evidence set is worth a row in the feed.
  const lastAlertKey = useRef<string>('');
  // The trace belongs to one hole — switching rigs must not splice two together.
  const subscribedWellId = useRef<string>('');

  const record = useCallback((depth: number, t: DrillingTelemetry) => {
    depthRef.current = depth;
    setCurrentDepth(depth);
    setTelemetry(t);
    setHistory((prev) => [...prev, { depth, ...t }].slice(-WINDOW));
  }, []);

  const pushAlert = useCallback((risk: RiskAssessment) => {
    if (risk.score < 40) return;
    const key = `${risk.level}:${risk.evidence.map((e) => e.id).join(',')}`;
    if (key === lastAlertKey.current) return;
    lastAlertKey.current = key;
    setAlerts((prev) =>
      [
        {
          ...risk,
          id: `${key}:${Date.now()}`,
          message: alertMessage(risk),
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 25)
    );
  }, []);

  /** Jump the bit to a depth — the depth scrubber and the reset button. */
  const seek = useCallback(
    (depth: number) => {
      depthRef.current = depth;
      setCurrentDepth(depth);
      setHistory([]);
      lastAlertKey.current = '';
      const t = telemetryAt(depth);
      setTelemetry(t);
      setLiveRisk(assessRiskAt(depth, formation, radiusKm, origin));
    },
    [formation, radiusKm, origin]
  );

  // Seed the deck immediately so nothing renders empty while the feed warms up.
  useEffect(() => {
    if (history.length === 0 && !telemetry) {
      const t = telemetryAt(depthRef.current);
      setTelemetry(t);
      setHistory([{ depth: depthRef.current, ...t }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Risk follows depth/radius/formation regardless of which feed is driving,
  // so the panel is never blank even before the first stream frame lands.
  useEffect(() => {
    if (source === 'live') return;
    const risk = assessRiskAt(currentDepth, formation, radiusKm, origin);
    setLiveRisk(risk);
    pushAlert(risk);
  }, [currentDepth, formation, radiusKm, origin, source, pushAlert]);

  useEffect(() => {
    if (!wellId) return;
    if (paused) {
      setSource('paused');
      return;
    }

    if (subscribedWellId.current && subscribedWellId.current !== wellId) {
      setHistory([]);
      lastAlertKey.current = '';
    }
    subscribedWellId.current = wellId;

    let connected = false;
    let localTimer: ReturnType<typeof setInterval> | null = null;
    setSource('connecting');

    const advanceLocally = () => {
      const depth = Math.round((depthRef.current + STEP_M) * 10) / 10;
      record(depth, telemetryAt(depth));
    };

    // Fall back to the bundled simulator if the API stack isn't up. The deck
    // stays fully operable on `next dev` alone; the badge says which feed it is.
    const grace = setTimeout(() => {
      if (connected) return;
      setSource('offline');
      localTimer = setInterval(advanceLocally, TICK_MS);
    }, GRACE_MS);

    let es: EventSource | null = null;
    try {
      es = new EventSource(
        `${API_BASE}/stream/live/${wellId}?start_depth=${depthRef.current}&radius_km=${radiusKm}&formation=${encodeURIComponent(formation)}`
      );

      es.addEventListener('connected', () => {
        connected = true;
        clearTimeout(grace);
        if (localTimer) clearInterval(localTimer);
        localTimer = null;
        setSource('live');
      });

      es.addEventListener('depth_update', (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          if (data.telemetry) record(data.current_depth_m, data.telemetry);
          else setCurrentDepth(data.current_depth_m);
        } catch {
          /* malformed frame — the next one will do */
        }
      });

      es.addEventListener('risk_update', (e) => {
        try {
          const risk = JSON.parse((e as MessageEvent).data) as RiskAssessment;
          setLiveRisk(risk);
          pushAlert(risk);
        } catch {
          /* ignore */
        }
      });
    } catch {
      // EventSource constructor threw (bad URL / blocked): stay on the fallback.
    }

    // A dropped backend mid-session hands the deck back to the simulator.
    if (es) {
      es.onerror = () => {
        if (!connected || localTimer) return;
        connected = false;
        setSource('offline');
        localTimer = setInterval(advanceLocally, TICK_MS);
      };
    }

    return () => {
      clearTimeout(grace);
      if (localTimer) clearInterval(localTimer);
      es?.close();
    };
  }, [wellId, radiusKm, formation, paused, record, pushAlert]);

  const acknowledge = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  }, []);

  return {
    currentDepth,
    telemetry,
    history,
    liveRisk,
    alerts,
    source,
    isConnected: source === 'live',
    seek,
    acknowledge,
    setAlerts,
  };
}
