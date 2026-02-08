import os
import osmnx as ox

GRAPH_PATH = "data/raw/osm/bengaluru.graphml"

def load_graph():
    if os.path.exists(GRAPH_PATH):
        print("Loading cached OSM graph...")
        return ox.load_graphml(GRAPH_PATH)

    print("Downloading Bengaluru road network...")
    G = ox.graph_from_place(
        "Bengaluru, India",
        network_type="drive",
        simplify=True
    )

    os.makedirs(os.path.dirname(GRAPH_PATH), exist_ok=True)
    ox.save_graphml(G, GRAPH_PATH)
    return G
