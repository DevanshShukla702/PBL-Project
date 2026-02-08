import osmnx as ox
import networkx as nx

GRAPH_PATH = "data/raw/osm/bengaluru.graphml"

def load_graph():
    return ox.load_graphml(GRAPH_PATH)

def get_nearest_node(G, lat, lon):
    return ox.distance.nearest_nodes(G, lon, lat)

def get_shortest_path(G, src, dst):
    return nx.shortest_path(G, src, dst, weight="length")
