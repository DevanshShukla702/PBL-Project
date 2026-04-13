import requests, json, time

t = time.time()
r = requests.post('http://127.0.0.1:8000/predict-route-eta', json={
    'source': {'lat': 13.1007, 'lon': 77.5963},
    'destination': {'lat': 12.8399, 'lon': 77.6770}
})
elapsed = time.time() - t

print(f"Status: {r.status_code}, Time: {elapsed:.1f}s")
d = r.json()
if 'routes' in d:
    print(f"Routes: {len(d['routes'])}")
    route = d['routes'][0]
    print(f"ETA 1h: {route['eta_minutes']['1_hour']['estimate']}min")
    print(f"Segments: {route['meta']['segments']}")
else:
    print(f"Error: {d}")
