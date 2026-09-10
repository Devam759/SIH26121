// The dashboard's view state lives in the URL, so the sidebar, the command
// palette, the browser's back button and a pasted link all drive the same
// thing. Nothing here needs a store or a context.

export type ViewKey =
  | 'overview'
  | 'telemetry'
  | 'wells'
  | 'strata'
  | 'map'
  | 'alerts'
  | 'records';

export const VIEW_TITLES: Record<ViewKey, string> = {
  overview: 'Operations',
  telemetry: 'Live Telemetry',
  wells: 'Offset Wells',
  strata: 'Stratigraphy',
  map: 'Basin Map',
  alerts: 'Alert Stream',
  records: 'Well Records',
};

const KEYS = Object.keys(VIEW_TITLES) as ViewKey[];

export function toView(raw: string | null | undefined): ViewKey {
  return KEYS.includes(raw as ViewKey) ? (raw as ViewKey) : 'overview';
}
