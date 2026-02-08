import random
from datetime import timedelta
import os
import osmnx as ox
import pandas as pd
import networkx as nx
import random
from datetime import datetime, timedelta
# -----------------------------
# Realism configuration (v2)
# -----------------------------
USE_REALISTIC_REGIMES = True

PEAK_HOURS = [(8, 10), (18, 21)]  # morning & evening
ACCIDENT_PROBABILITY = 0.015     # ~1.5% chance per segment per hour
ACCIDENT_SPEED_DROP = (0.4, 0.7) # 40–70% speed reduction
PROPAGATION_FACTOR = 0.4         # congestion spread to neighbors



ROAD_CAPACITY = {
    "motorway": 1.0,
    "primary": 0.8,
    "secondary": 0.6,
    "residential": 0.4
}


def get_capacity_factor(road_type):
    return ROAD_CAPACITY.get(road_type, 0.5)

def time_load_factor(hour):
    if 7 <= hour <= 10:
        return 0.8   # morning peak
    elif 17 <= hour <= 21:
        return 1.0   # evening peak
    elif 11 <= hour <= 16:
        return 0.5
    else:
        return 0.2

def compute_speed(free_flow_speed, congestion):
    speed = free_flow_speed * (1 - congestion)
    return max(speed, 5)  # minimum realistic speed

import osmnx as ox
import pandas as pd


def load_road_graph(path="data/raw/osm/bengaluru_road_network.graphml"):
    print("Loading Bengaluru road graph...")
    G = ox.load_graphml(path)
    return G

def extract_road_segments(G):
    segments = []

    for u, v, data in G.edges(data=True):
        road_type = data.get("highway", "residential")
        if isinstance(road_type, list):
            road_type = road_type[0]

        length = data.get("length", 100)  # meters
        segment_id = f"{u}_{v}_{data.get('key', 0)}"


        segments.append({
            "segment_id": segment_id,
            "road_type": road_type,
            "length": length
        })

    print(f"Extracted {len(segments)} road segments")
    return segments

FREE_FLOW_SPEED = {
    "motorway": 80,
    "primary": 60,
    "secondary": 45,
    "residential": 30
}
def is_peak_hour(hour):
    for start, end in PEAK_HOURS:
        if start <= hour < end:
            return True
    return False


def get_free_flow_speed(road_type):
    return FREE_FLOW_SPEED.get(road_type, 40)

def generate_daily_traffic(segments, date="2024-01-01"):
    records = []

    start_time = datetime.strptime(date, "%Y-%m-%d")
    hours = [start_time + timedelta(hours=h) for h in range(24)]

    for seg in segments:
        free_speed = get_free_flow_speed(seg["road_type"])
        capacity = get_capacity_factor(seg["road_type"])

        # Incident configuration per segment
        has_incident = random.random() < 0.12  # ~12% segments/day
        incident_start = random.randint(6, 20) if has_incident else None
        incident_duration = random.randint(1, 3) if has_incident else 0
        incident_severity = round(random.uniform(0.3, 0.8), 2) if has_incident else 0.0

        for t in hours:
            base_congestion = min(
                max(time_load_factor(t.hour) * (1 - capacity) + random.uniform(-0.05, 0.05), 0),
                0.9
            )

            # Incident logic
            incident_flag = 0
            congestion = base_congestion

            if has_incident:
                if incident_start <= t.hour < incident_start + incident_duration:
                    incident_flag = 1
                    congestion = min(congestion + incident_severity, 0.95)

            speed = compute_speed(free_speed, congestion)

            records.append({
                "segment_id": seg["segment_id"],
                "timestamp": t,
                "road_type": seg["road_type"],
                "speed_kmph": round(speed, 2),
                "congestion": round(congestion, 2),
                "incident_flag": incident_flag,
                "incident_severity": incident_severity if incident_flag else 0.0
            })

    return pd.DataFrame(records)


def save_dataset(df, path="data/raw/synthetic_traffic_v2.csv"):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_csv(path, index=False)
    print(f"Synthetic traffic dataset saved to {path}")

if __name__ == "__main__":
    G = load_road_graph()
    segments = extract_road_segments(G)
    traffic_df = generate_daily_traffic(segments)
    save_dataset(traffic_df)
