export interface LocationPoint {
  lat: number;
  lon: number;
}

export interface PredictionRequest {
  source: LocationPoint;
  destination: LocationPoint;
  datetime: string;
}

export interface HorizonETA {
  estimate: number;
  lower_bound: number;
  upper_bound: number;
}

export interface RouteMeta {
  distance_km: number;
  segments: number;
  incident: boolean;
  incident_segments: number;
  avg_incident_severity: number;
  route_geometry: LocationPoint[];
  incident_coordinates: LocationPoint[];
}

export interface RouteResult {
  route_id: number;
  label: string;
  color: string;
  eta_minutes: {
    "1_hour": HorizonETA;
    "2_hour": HorizonETA;
    "4_hour": HorizonETA;
  };
  confidence: {
    "1_hour": number;
    "2_hour": number;
    "4_hour": number;
  };
  meta: RouteMeta;
}

export interface PredictionResponse {
  routes: RouteResult[];
}

export interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}
