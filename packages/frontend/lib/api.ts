declare const process: any;

export const API_BASE = typeof window !== 'undefined'
  ? ((typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) || 'http://localhost:8000/api/v1')
  : ((typeof process !== 'undefined' && process.env?.API_INTERNAL_URL) || 'http://api:8000') + '/api/v1';

export interface Well {
  id: string;
  name: string;
  api_number?: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'completed' | 'abandoned';
  total_depth_m: number;
  basin?: string;
  field?: string;
  distance_km?: number;
  is_synthetic: boolean;
}

export interface DrillingTelemetry {
  rop_m_hr: number;
  wob_tonnes: number;
  rpm: number;
  torque_kn_m: number;
  mud_weight_sg: number;
  spp_psi: number;
  gas_units: number;
  status: 'NORMAL' | 'ANOMALY_DETECTED';
}

export interface Factor {
  name: string;
  score: number;
  max: number;
}

export interface EvidenceItem {
  id: string;
  well_name: string;
  event_type: string;
  depth_m: number;
  formation?: string;
  severity: string;
  description?: string;
  mitigation?: string;
}

export interface RiskAssessment {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: Factor[];
  evidence: EvidenceItem[];
  evidenceWellCount: number;
  current_depth_m?: number;
}

export interface SourceCard {
  wellName: string;
  depthM: number | null;
  formation: string;
  eventType: string;
  documentId: string;
  page: number;
  snippet: string;
  similarity?: number | null;
}

export async function fetchWells(lat?: number, lon?: number, radiusKm?: number): Promise<Well[]> {
  const params = new URLSearchParams();
  if (lat !== undefined && lon !== undefined && radiusKm !== undefined) {
    params.set('lat', lat.toString());
    params.set('lon', lon.toString());
    params.set('radius_km', radiusKm.toString());
  }
  const res = await fetch(`${API_BASE}/wells?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch wells');
  const json = await res.json();
  return json.data;
}

export async function fetchHealth(): Promise<{ status: string; database: string; ai_service: string }> {
  const res = await fetch(`${API_BASE}/health`);
  const json = await res.json();
  return json.data;
}

export async function assessRisk(wellId: string, currentDepthM: number, radiusKm = 10, formation = 'Barail'): Promise<RiskAssessment> {
  const res = await fetch(`${API_BASE}/risk/assess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wellId, currentDepthM, radiusKm, formation }),
  });
  if (!res.ok) throw new Error('Failed to assess risk');
  const json = await res.json();
  return json.data;
}

export async function askAssistant(
  question: string,
  wellId: string,
  currentDepthM: number,
  token?: string,
  formation = 'Barail',
  radiusKm = 10
): Promise<{ answer: string; sourceCards: SourceCard[] }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/assistant/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ question, wellId, currentDepthM, formation, radiusKm }),
  });
  if (!res.ok) throw new Error('Failed to query assistant');
  const json = await res.json();
  return json.data;
}

export async function fetchAlerts(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/alerts`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function fetchEvents(status?: string): Promise<any[]> {
  const url = status ? `${API_BASE}/events?review_status=${status}` : `${API_BASE}/events`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function updateEventStatus(eventId: string, newStatus: string, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/events/${eventId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ review_status: newStatus }),
  });
  if (!res.ok) throw new Error('Failed to update event status');
  const json = await res.json();
  return json.data;
}

export async function fetchWellEvents(wellId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/wells/${wellId}/events`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function fetchWellFormations(wellId: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/wells/${wellId}/formations`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function uploadDocumentFile(file: File, token?: string): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || 'Failed to upload document');
  }
  return res.json();
}

