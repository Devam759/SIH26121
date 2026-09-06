'use client';

import { useEffect, useRef } from 'react';
import { Well } from '../../lib/api';

interface WellMapProps {
  wells: Well[];
  activeWell: Well | null;
  radiusKm: number;
  onSelectWell: (well: Well) => void;
}

export default function WellMap({ wells, activeWell, radiusKm, onSelectWell }: WellMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (typeof window === 'undefined' || !container) return;

    // Dynamically import Leaflet
    import('leaflet').then((L) => {
      if (!mapInstanceRef.current && container) {
        const centerLat = activeWell ? activeWell.latitude : 26.852;
        const centerLon = activeWell ? activeWell.longitude : 94.532;

        const map = L.map(container).setView([centerLat, centerLon], 11);

        // Dark-themed tile layer (No API key required)
        L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
          maxZoom: 16,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // Clear existing markers
      markersRef.current.forEach((m: any) => m.remove());
      markersRef.current = [];

      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }

      // Draw active well radius circle in Oil India branding
      if (activeWell) {
        circleRef.current = L.circle([activeWell.latitude, activeWell.longitude], {
          radius: radiusKm * 1000,
          color: '#ED1C24',
          fillColor: '#ED1C24',
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '5, 5',
        }).addTo(map);
      }

      // Add markers
      wells.forEach((w) => {
        const isActive = activeWell && activeWell.id === w.id;
        const color = isActive ? '#ED1C24' : w.status === 'active' ? '#10b981' : '#94a3b8';
        const radius = isActive ? 9 : 6;

        const marker = L.circleMarker([w.latitude, w.longitude], {
          radius,
          color: '#ffffff',
          weight: isActive ? 2.5 : 1.5,
          fillColor: color,
          fillOpacity: 0.95,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 170px; font-size: 12px; background: #161B22; color: #f1f5f9; padding: 4px;">
            <div style="font-weight: 800; color: #ffffff; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
              <span>${w.name}</span>
              ${isActive ? '<span style="color:#ED1C24; font-size:10px; background:#3A0B10; padding:1px 4px; border-radius:3px; border:1px solid #ED1C24;">ACTIVE</span>' : ''}
            </div>
            <div style="color: #94a3b8; font-size: 11px;">Status: <span style="text-transform: capitalize; color: #e2e8f0;">${w.status}</span></div>
            <div style="color: #94a3b8; font-size: 11px;">Total Depth: <strong>${w.total_depth_m}m</strong></div>
            <div style="color: #94a3b8; font-size: 11px;">Field: ${w.field || 'Assam Basin'}</div>
            ${w.distance_km !== undefined ? `<div style="color: #EAA824; font-size: 11px; margin-top: 4px; font-weight: 600;">Offset Distance: ${w.distance_km} km</div>` : ''}
          </div>
        `);

        marker.on('click', () => {
          onSelectWell(w);
        });

        markersRef.current.push(marker);
      });
    });
  }, [wells, activeWell, radiusKm, onSelectWell]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-lg overflow-hidden border border-[#2E3642] bg-[#0F1216] shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-3 right-3 z-[1000] bg-[#161B22]/95 backdrop-blur-sm border border-[#2E3642] text-xs px-3 py-2 rounded-md shadow-lg flex flex-col gap-1.5">
        <div className="font-bold text-slate-100 text-[11px] uppercase tracking-wider border-b border-[#2E3642] pb-1">
          Basin Map Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ED1C24] ring-2 ring-[#ED1C24]/30" />
          <span className="text-slate-300">Active Drilling Well (OIL)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-300">Active Offset Rig</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <span className="text-slate-300">Completed Well</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 border-t-2 border-dashed border-[#ED1C24]" />
          <span className="text-amber-400 font-semibold">{radiusKm} km Spatial Buffer</span>
        </div>
      </div>
    </div>
  );
}
