from route_eta import compute_route_eta

source = {"lat": 13.0827, "lon": 77.5562}       # Yelahanka
destination = {"lat": 12.8452, "lon": 77.6600}  # Electronic City

print("\nTesting route-level ETA prediction...\n")

etas = compute_route_eta(source, destination)

for h, eta in etas.items():
    print(f"{h} ETA: {eta} min")
