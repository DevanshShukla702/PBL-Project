export interface Coordinate { lat: number; lon: number; label?: string; }

export interface RouteResponse {
  route_id: number;
  label: string;
  eta_minutes: {
    '1_hour': { estimate: number; lower_bound: number; upper_bound: number };
    '2_hour': { estimate: number; lower_bound: number; upper_bound: number };
    '4_hour': { estimate: number; lower_bound: number; upper_bound: number };
  };
  confidence: { '1_hour': number; '2_hour': number; '4_hour': number };
  meta: {
    distance_km: number;
    segments: number;
    incident: boolean;
    incident_segments: number;
    avg_incident_severity: number;
    route_geometry: { lat: number; lon: number }[];
  };
}

export const checkHealth = async () => {
  const res = await fetch('/health');
  if (!res.ok) throw new Error('Offline');
  return await res.json();
};

export const predictRouteETA = async (data: any) => {
  const res = await fetch('/predict-route-eta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Prediction failed');
  }
  return await res.json();
};
