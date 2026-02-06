from fastapi import FastAPI
from pydantic import BaseModel
from src.routing.route_eta import compute_route_eta

app = FastAPI(title="AI Traffic Prediction API")


class Location(BaseModel):
    lat: float
    lon: float


class RouteRequest(BaseModel):
    source: Location
    destination: Location


@app.get("/")
def health():
    return {"status": "API is running"}


@app.post("/predict-route-eta")
def predict_route_eta(request: RouteRequest):
    etas = compute_route_eta(
        (request.source.lat, request.source.lon),
        (request.destination.lat, request.destination.lon),
    )

    # 🔑 CRITICAL: ensure JSON-serializable output
    clean_etas = {k: float(v) for k, v in etas.items()}

    return {"eta_minutes": clean_etas}
