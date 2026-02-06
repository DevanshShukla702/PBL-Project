from route_eta import compute_route_eta

if __name__ == "__main__":
    print("Testing route-level ETA prediction...\n")

    source = (12.9716, 77.6412)
    destination = (12.9758, 77.6033)

    etas = compute_route_eta(source, destination)

    print("Predicted ETAs (in minutes):")
    for h, v in etas.items():
        print(f"{h}: {v} min")
