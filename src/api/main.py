# src/api/main.py

from fastapi import FastAPI
from pydantic import BaseModel
from src.routing.route_eta import compute_route_eta

app = FastAPI(title="AI Traffic Prediction System")


class Location(BaseModel):
    lat: float
    lon: float


class RouteRequest(BaseModel):
    source: Location
    destination: Location


@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/predict-route-eta")
def predict_route_eta(req: RouteRequest):
    return compute_route_eta(
        source=req.source.dict(),
        destination=req.destination.dict()
    )
