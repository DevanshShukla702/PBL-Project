"""
Supabase database client for trip history and favourites.
Uses the supabase-py library. All operations are fire-and-forget safe —
they catch and log exceptions so a DB failure never breaks ETA prediction.
"""
import os
import logging
from typing import Optional

logger = logging.getLogger("cgee.db")

def get_client():
    try:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            return None
        return create_client(url, key)
    except Exception as e:
        logger.warning(f"Supabase client init failed: {e}")
        return None

def save_trip(session_id: str, source: dict, destination: dict, result: dict):
    """Save a completed trip to history. Never raises."""
    try:
        client = get_client()
        if not client:
            return
        routes = result.get("routes", [])
        fastest = routes[0] if routes else {}
        client.table("trips").insert({
            "session_id": session_id,
            "source_lat": source["lat"],
            "source_lon": source["lon"],
            "source_label": source.get("label", ""),
            "dest_lat": destination["lat"],
            "dest_lon": destination["lon"],
            "dest_label": destination.get("label", ""),
            "fastest_eta_minutes": fastest.get("eta_minutes", {}).get("1_hour", {}).get("estimate"),
            "distance_km": fastest.get("meta", {}).get("distance_km"),
            "incident": fastest.get("meta", {}).get("incident", False),
            "incident_segments": fastest.get("meta", {}).get("incident_segments", 0),
            "routes_json": routes
        }).execute()
        upsert_favourite(session_id, source, destination, 
                         fastest.get("eta_minutes", {}).get("1_hour", {}).get("estimate"))
    except Exception as e:
        logger.warning(f"save_trip failed: {e}")

def upsert_favourite(session_id: str, source: dict, destination: dict, eta: Optional[float]):
    """Increment trip count for this route pair or insert if new."""
    try:
        client = get_client()
        if not client:
            return
        existing = client.table("favourites").select("id,trip_count").eq(
            "session_id", session_id
        ).eq("source_lat", source["lat"]).eq("source_lon", source["lon"]
        ).eq("dest_lat", destination["lat"]).eq("dest_lon", destination["lon"]).execute()
        
        if existing.data:
            row = existing.data[0]
            client.table("favourites").update({
                "trip_count": row["trip_count"] + 1,
                "last_fastest_eta": eta
            }).eq("id", row["id"]).execute()
        else:
            client.table("favourites").insert({
                "session_id": session_id,
                "source_lat": source["lat"],
                "source_lon": source["lon"],
                "source_label": source.get("label", ""),
                "dest_lat": destination["lat"],
                "dest_lon": destination["lon"],
                "dest_label": destination.get("label", ""),
                "trip_count": 1,
                "last_fastest_eta": eta
            }).execute()
    except Exception as e:
        logger.warning(f"upsert_favourite failed: {e}")

def get_history(session_id: str, limit: int = 20):
    """Fetch recent trips for a session."""
    try:
        client = get_client()
        if not client:
            return []
        res = client.table("trips").select(
            "id,source_lat,source_lon,source_label,dest_lat,dest_lon,dest_label,"
            "fastest_eta_minutes,distance_km,incident,incident_segments,created_at"
        ).eq("session_id", session_id).order("created_at", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.warning(f"get_history failed: {e}")
        return []

def get_favourites(session_id: str):
    """Fetch top routes ordered by trip_count desc."""
    try:
        client = get_client()
        if not client:
            return []
        res = client.table("favourites").select("*").eq(
            "session_id", session_id
        ).order("trip_count", desc=True).limit(10).execute()
        return res.data or []
    except Exception as e:
        logger.warning(f"get_favourites failed: {e}")
        return []

def delete_favourite(session_id: str, fav_id: str):
    """Remove a specific favourite."""
    try:
        client = get_client()
        if not client:
            return
        client.table("favourites").delete().eq("id", fav_id).eq(
            "session_id", session_id
        ).execute()
    except Exception as e:
        logger.warning(f"delete_favourite failed: {e}")
