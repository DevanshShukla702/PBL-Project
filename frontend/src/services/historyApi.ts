export interface TripRecord {
  id: string;
  source_lat: number; source_lon: number; source_label: string;
  dest_lat: number; dest_lon: number; dest_label: string;
  fastest_eta_minutes: number; distance_km: number;
  incident: boolean; incident_segments: number; created_at: string;
}

export interface FavouriteRecord {
  id: string;
  source_lat: number; source_lon: number; source_label: string;
  dest_lat: number; dest_lon: number; dest_label: string;
  trip_count: number; last_fastest_eta: number; created_at: string;
}

const SESSION_KEY = "cgee_session_id";

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function fetchHistory(): Promise<TripRecord[]> {
  const res = await fetch(`/trips/history?session_id=${getSessionId()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.trips || [];
}

export async function fetchFavourites(): Promise<FavouriteRecord[]> {
  const res = await fetch(`/trips/favourites?session_id=${getSessionId()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.favourites || [];
}

export async function deleteFavourite(favId: string): Promise<void> {
  await fetch(`/trips/favourites/${favId}?session_id=${getSessionId()}`, {
    method: "DELETE"
  });
}
