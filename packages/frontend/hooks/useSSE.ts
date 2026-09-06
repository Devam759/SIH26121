'use client';

import { useState, useEffect } from 'react';
import { RiskAssessment, DrillingTelemetry, API_BASE } from '../lib/api';

export function useSSE(wellId: string, initialDepth = 2700, radiusKm = 10) {
  const [currentDepth, setCurrentDepth] = useState<number>(initialDepth);
  const [telemetry, setTelemetry] = useState<DrillingTelemetry | null>(null);
  const [liveRisk, setLiveRisk] = useState<RiskAssessment | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!wellId) return;

    const url = `${API_BASE}/stream/live/${wellId}?start_depth=${initialDepth}&radius_km=${radiusKm}`;
    const es = new EventSource(url);

    es.addEventListener('connected', () => {
      setIsConnected(true);
    });

    es.addEventListener('depth_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        setCurrentDepth(data.current_depth_m);
        if (data.telemetry) {
          setTelemetry(data.telemetry);
        }
      } catch (err) {
        // ignore
      }
    });

    es.addEventListener('risk_update', (e) => {
      try {
        const data = JSON.parse(e.data);
        setLiveRisk(data);
      } catch (err) {
        // ignore
      }
    });

    es.addEventListener('risk_alert', (e) => {
      try {
        const data = JSON.parse(e.data);
        setAlerts((prev: any[]) => [data, ...prev].slice(0, 10));
      } catch (err) {
        // ignore
      }
    });

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [wellId, initialDepth, radiusKm]);

  return { currentDepth, telemetry, liveRisk, alerts, isConnected, setAlerts };
}
