from fastapi import FastAPI
from pydantic import BaseModel
from src.routing.route_eta import initialize_engine, compute_route_eta

app = FastAPI(
    title="Contextual Graph ETA Engine (CGEE™)",
    description="Context-aware multi-horizon graph-based ETA prediction engine",
    version="1.0.0"
)

@app.on_event("startup")
def startup_event():
    initialize_engine()

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
