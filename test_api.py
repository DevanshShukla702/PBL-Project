import requests
import json
import sys

resp = requests.post("http://localhost:8000/predict-route-eta", json={
    "source": {"lat": 12.9859, "lon": 77.5855},
    "destination": {"lat": 12.9090, "lon": 77.5925},
    "datetime": "2026-04-04T19:37:00"
})

data = resp.json()
lines = []
lines.append(f"Status: {resp.status_code}")

if "error" in data:
    lines.append(f"ERROR: {data['error']} {data.get('details', '')}")
elif "routes" in data:
    lines.append(f"Total routes: {len(data['routes'])}")
    for route in data["routes"]:
        lines.append(f"\n--- {route['label']} (ID {route['route_id']}, color {route['color']}) ---")
        lines.append(f"  Distance: {route['meta']['distance_km']} km | Segments: {route['meta']['segments']} | Points: {len(route['meta']['route_geometry'])}")
        lines.append(f"  Incident: {route['meta']['incident']} | Inc.Segs: {route['meta']['incident_segments']} | Severity: {route['meta']['avg_incident_severity']} | Markers: {len(route['meta']['incident_coordinates'])}")
        for h in ["1_hour", "2_hour", "4_hour"]:
            e = route['eta_minutes'][h]
            c = route['confidence'][h]
            lines.append(f"  {h}: {e['estimate']}m [{e['lower_bound']}-{e['upper_bound']}] conf={c}")

with open("test_output.txt", "w") as f:
    f.write("\n".join(lines))
print("Saved to test_output.txt")
