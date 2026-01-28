import osmnx as ox
import os

def load_bengaluru_road_network():
    """
    Downloads and returns the drivable road network for Bengaluru.
    """
    city_name = "Bengaluru, Karnataka, India"
    print("Downloading road network for:", city_name)

    graph = ox.graph_from_place(city_name, network_type="drive")

    return graph


def save_graph(graph, output_path):
    """
    Saves the road network graph to disk.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    ox.save_graphml(graph, output_path)
    print(f"Road network saved at {output_path}")


if __name__ == "__main__":
    G = load_bengaluru_road_network()
    save_graph(G, "data/raw/osm/bengaluru_road_network.graphml")
