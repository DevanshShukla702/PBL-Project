import os
import sys

def main():
    print("CGEE Data Integrity Check")
    print("-" * 30)

    # Required files
    graph_path = "/app/data/raw/osm/bengaluru.graphml"
    models = ["xgb_1_hour.pkl", "xgb_2_hour.pkl", "xgb_4_hour.pkl"]
    
    missing = False
    
    if os.path.exists(graph_path):
        size = os.path.getsize(graph_path) / (1024*1024)
        print(f"✅ Graph found: {graph_path} ({size:.1f} MB)")
    else:
        print(f"❌ Graph missing: {graph_path}")
        missing = True

    for model in models:
        m_path = f"/app/models/{model}"
        if os.path.exists(m_path):
            print(f"✅ Model found: {m_path}")
        else:
            print(f"❌ Model missing: {m_path}")
            missing = True

    if missing:
        print("\nACTION REQUIRED: Missing data files!")
        print("Please upload them using the Render Shell:")
        print("1. Go to your Render Dashboard -> Shell")
        print("2. Upload bengaluru.graphml to /app/data/raw/osm/")
        print("3. Upload the XGBoost .pkl files to /app/models/")
        sys.exit(1)
    else:
        print("\nAll required data files are present. Engine is ready to initialize.")

if __name__ == "__main__":
    main()
