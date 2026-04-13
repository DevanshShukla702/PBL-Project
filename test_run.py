import traceback
import json
from src.routing.route_eta import compute_route_eta

try:
    source = {'lat': 12.9859, 'lon': 77.5855}
    destination = {'lat': 12.9090, 'lon': 77.5925}
    result = compute_route_eta(source, destination)
    print(json.dumps(result, indent=2))
except Exception as e:
    traceback.print_exc()
