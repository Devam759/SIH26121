'use client';

import { useEffect, useRef } from 'react';
import { Well } from '../../lib/api';

interface WellMapProps {
  wells: Well[];
  activeWell: Well | null;
  radiusKm: number;
  onSelectWell: (well: Well) => void;
}

// Marker colours are read off the token ramp so the map agrees with the rest
// of the deck: amber is the rig you are steering, green is a live offset rig,
// grey is a completed hole.
const MARKER = {
  active: 'oklch(0.700 0.155 55)',
  offset: 'oklch(0.700 0.105 158)',
  completed: 'oklch(0.595 0.006 250)',
};

export default function WellMap({ wells, activeWell, radiusKm, onSelectWell }: WellMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Callers pass an inline arrow, so keeping the handler in a ref stops every
  // parent render from tearing down and rebuilding the whole marker layer.
  const onSelectRef = useRef(onSelectWell);
  onSelectRef.current = onSelectWell;

  useEffect(() => {
    const container = mapContainerRef.current;
    if (typeof window === 'undefined' || !container) return;

    import('leaflet').then((L) => {
      if (!mapInstanceRef.current && container) {
        const map = L.map(container, { zoomControl: true, attributionControl: false }).setView(
          [activeWell ? activeWell.latitude : 26.852, activeWell ? activeWell.longitude : 94.532],
          11
        );

        L.tileLayer(
          'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          { attribution: '&copy; Esri', maxZoom: 16 }
        ).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      markersRef.current.forEach((m: any) => m.remove());
      markersRef.current = [];

      if (circleRef.current) {
        circleRef.current.remove();
        circleRef.current = null;
      }

      if (activeWell) {
        map.setView([activeWell.latitude, activeWell.longitude], map.getZoom(), {
          animate: true,
        });
        // The search buffer is a surveyed boundary: a thin dashed outline with
        // barely any fill, so the wells inside it stay readable.
        circleRef.current = L.circle([activeWell.latitude, activeWell.longitude], {
          radius: radiusKm * 1000,
          color: MARKER.active,
          fillColor: MARKER.active,
          fillOpacity: 0.03,
          weight: 1,
          dashArray: '3, 5',
        }).addTo(map);
      }

      wells.forEach((w) => {
        const isActive = activeWell && activeWell.id === w.id;
        const fill = isActive
          ? MARKER.active
          : w.status === 'active'
            ? MARKER.offset
            : MARKER.completed;

        // The active rig is identified by a ringed marker rather than a glow:
        // a hollow ring around a filled centre reads as a survey symbol.
        const marker = L.circleMarker([w.latitude, w.longitude], {
          radius: isActive ? 6 : 4,
          color: fill,
          weight: isActive ? 2 : 1,
          opacity: 1,
          fillColor: isActive ? fill : fill,
          fillOpacity: isActive ? 1 : 0.55,
        }).addTo(map);

        marker.bindPopup(`
          <div class="wm-pop">
            <div class="wm-pop-head">
              <span class="wm-pop-name">${w.name}</span>
              ${isActive ? '<span class="wm-pop-tag">Active rig</span>' : ''}
            </div>
            <dl class="wm-pop-rows">
              <div><dt>Status</dt><dd>${w.status}</dd></div>
              <div><dt>Total depth</dt><dd>${w.total_depth_m} m</dd></div>
              <div><dt>Field</dt><dd>${w.field || 'Assam Basin'}</dd></div>
              ${
                w.distance_km !== undefined
                  ? `<div><dt>Offset</dt><dd>${w.distance_km} km</dd></div>`
                  : ''
              }
            </dl>
          </div>
        `);

        marker.on('click', () => onSelectRef.current(w));
        markersRef.current.push(marker);
      });
    });
  }, [wells, activeWell, radiusKm]);

  return (
    <div className="relative w-full h-full min-h-[320px] overflow-hidden border border-line-soft">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Legend, docked to the frame rather than floating over it. */}
      <div className="absolute left-0 bottom-0 z-[1000] flex flex-wrap items-center gap-x-3.5 gap-y-1 px-2.5 py-1.5 bg-bg-deep/95 border-t border-r border-line-soft text-micro text-ink-3">
        <span className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full border-2 border-accent"
            style={{ background: 'var(--accent)' }}
            aria-hidden="true"
          />
          Active rig
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-ok" aria-hidden="true" />
          Offset rig
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-ink-3" aria-hidden="true" />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 border-t border-dashed border-accent-line" aria-hidden="true" />
          <span className="font-mono tnum text-ink-2">{radiusKm} km</span> buffer
        </span>
      </div>
    </div>
  );
}
