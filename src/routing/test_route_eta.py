from route_eta import predict_route_eta

# Example coordinates in Bengaluru
# Indiranagar → MG Road
SRC_LAT, SRC_LON = 12.9716, 77.6412
DST_LAT, DST_LON = 12.9758, 77.6033

if __name__ == "__main__":
    print("Testing route-level ETA prediction...\n")

    etas = predict_route_eta(
        src_lat=SRC_LAT,
        src_lon=SRC_LON,
        dst_lat=DST_LAT,
        dst_lon=DST_LON
    )

    print("Predicted ETAs (in minutes):")
    for horizon, eta in etas.items():
        print(f"{horizon}: {eta:.2f} min")
