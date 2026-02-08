import osmnx as ox
import networkx as nx

def get_shortest_path(G, source_lat, source_lon, dest_lat, dest_lon):
    orig = ox.nearest_nodes(G, source_lon, source_lat)
    dest = ox.nearest_nodes(G, dest_lon, dest_lat)

    path = nx.shortest_path(
        G,
        orig,
        dest,
        weight="length"
    )
    return path
