'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  Layers,
  FileText,
  Map as MapIcon,
  ShieldAlert,
  Bot,
  Radio,
  Sliders,
  Waypoints,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { ViewKey, toView } from './views';
import { OFFSET_EVENTS } from '../../lib/simulation';

/** Each item either switches the view or opens an overlay — no dead links. */
interface NavItem {
  icon: any;
  label: string;
  view?: ViewKey;
  overlay?: 'ai' | 'brief';
  badge?: string;
  live?: boolean;
}

/*
  Three groups, named after what an engineer is doing rather than after the
  software's own architecture. The old "OTHER" bucket held a telemetry view,
  so it moved into Operations and the catch-all label went away.
*/
const SECTIONS: { category: string; items: NavItem[] }[] = [
  {
    category: 'Operations',
    items: [
      { icon: Activity, label: 'Home', view: 'overview' },
      { icon: Radio, label: 'Live Telemetry', view: 'telemetry' },
      { icon: Waypoints, label: 'WITSML Feed', view: 'telemetry', live: true },
      { icon: ShieldAlert, label: 'Offset Wells', view: 'wells' },
    ],
  },
  {
    category: 'Subsurface',
    items: [
      { icon: Layers, label: 'Stratigraphy', view: 'strata' },
      { icon: MapIcon, label: 'Basin Map', view: 'map' },
      { icon: FileText, label: 'Well Records', view: 'records' },
    ],
  },
  {
    category: 'Analysis',
    items: [
      { icon: Activity, label: 'Alert Stream', view: 'alerts' },
      { icon: Bot, label: 'Geotech AI', overlay: 'ai' },
      { icon: Sliders, label: 'Hazard Briefs', overlay: 'brief' },
    ],
  },
];

// Offset wells carrying evidence in the corpus — the badge used to read "3"
// regardless of what was actually indexed.
const OFFSET_WELL_COUNT = new Set(OFFSET_EVENTS.map((e) => e.well_name)).size;

export default function SideRail() {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const view = toView(params.get('view'));

  const go = (item: NavItem) => {
    const next = new URLSearchParams(params.toString());
    if (item.view) next.set('view', item.view);
    if (item.overlay) next.set(item.overlay, '1');
    router.push('/dashboard?' + next.toString(), { scroll: false });
  };

  return (
    <aside
      aria-label="Sidebar navigation"
      className={`hidden lg:flex flex-col shrink-0 self-start sticky top-0 h-screen border-r border-line-soft bg-bg-deep transition-[width] duration-200 ${
        collapsed ? 'w-14' : 'w-60'
      }`}
    >
      {/* System identity. The mark is a square plate, not a glowing app icon. */}
      <div className="h-14 shrink-0 px-3 flex items-center justify-between gap-2 border-b border-line-soft">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 shrink-0 grid place-items-center border border-accent-line bg-accent-wash text-accent-ink font-mono text-micro font-bold tracking-tight">
            eR
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <div className="text-body font-semibold tracking-tight text-ink truncate">
                eRTMAC<span className="text-ink-3 font-normal">-NWIS</span>
              </div>
              <div className="text-micro text-ink-3 truncate">Oil India Limited</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="btn btn-quiet w-7 h-7 p-0 shrink-0"
        >
          {collapsed ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {SECTIONS.map((section, si) => (
          <div key={section.category} className={si > 0 ? 'mt-1 pt-2 border-t border-line-soft' : ''}>
            {!collapsed && <div className="hdr px-3 pt-1.5 pb-1">{section.category}</div>}
            {section.items.map((item) => {
              const { icon: Icon, label } = item;
              const active = !item.overlay && item.view === view;
              const count = label === 'Offset Wells' ? String(OFFSET_WELL_COUNT) : item.badge;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => go(item)}
                  title={label}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full group relative flex items-center gap-2.5 h-8 pl-3 pr-2.5 text-body transition-colors ${
                    active
                      ? 'bg-surface text-ink font-medium'
                      : 'text-ink-3 hover:text-ink-2 hover:bg-surface/50'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  {/* Selection is marked by an edge, not a floating rounded chip. */}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 inset-y-0 w-[2px] bg-accent"
                    />
                  )}
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-accent-ink' : ''}`}
                    strokeWidth={1.75}
                  />
                  {!collapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{label}</span>
                      {item.live && (
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="led bg-ok" aria-hidden="true" />
                          <span className="text-micro font-mono text-ok-ink">LIVE</span>
                        </span>
                      )}
                      {count && (
                        <span className="text-micro font-mono tnum text-ink-3 shrink-0">{count}</span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/*
        Engine metadata. Presented as a spec block at the foot of the shell —
        the kind of build/index footer operational software carries — rather
        than as a promotional card.
      */}
      {!collapsed && (
        <dl className="shrink-0 border-t border-line-soft px-3 py-2.5 text-micro">
          <div className="flex items-baseline justify-between gap-2 py-0.5">
            <dt className="text-ink-3">Engine</dt>
            <dd className="font-mono text-ink-2">Assam Basin v2.4</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2 py-0.5">
            <dt className="text-ink-3">Offset events</dt>
            <dd className="font-mono tnum text-ink-2">{OFFSET_EVENTS.length} indexed</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2 py-0.5">
            <dt className="text-ink-3">Wells with evidence</dt>
            <dd className="font-mono tnum text-ink-2">{OFFSET_WELL_COUNT}</dd>
          </div>
        </dl>
      )}
    </aside>
  );
}
