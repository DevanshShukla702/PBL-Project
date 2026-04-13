import asyncio
import time
import json
import sys
import logging
import traceback
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, validator

from src.routing.route_eta import (
    initialize_engine, is_engine_ready, compute_route_eta,
    get_shortest_path, GRAPH, MODELS
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cgee")

# ---------------------------------------------------
# Coordinate Bounds for Bengaluru
# ---------------------------------------------------
LAT_MIN, LAT_MAX = 12.70, 13.20
LON_MIN, LON_MAX = 77.30, 77.80

# ---------------------------------------------------
# Lifespan: replaces deprecated @app.on_event("startup")
# ---------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run blocking engine init in a thread so it doesn't block the event loop
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, initialize_engine)
        logger.info("CGEE engine initialized successfully on startup.")
    except RuntimeError as e:
        logger.error(f"STARTUP FAILED: {e}")
        logger.error("App is running but /predict-route-eta will return 503 "
                     "until the engine loads. Check that graph and model "
                     "files exist at the expected paths.")
    yield
    # Shutdown cleanup
    get_shortest_path.cache_clear()
    logger.info("CGEE shutdown: route cache cleared.")

# ---------------------------------------------------
# App Initialization
# ---------------------------------------------------
app = FastAPI(
    title="Contextual Graph ETA Engine (CGEE™)",
    description="Context-aware multi-horizon graph-based ETA prediction engine",
    version="2.0.0",
    lifespan=lifespan
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # IMPORTANT: temporary wildcard
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static UI files
try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except Exception:
    pass  # static dir may not exist during tests


# ---------------------------------------------------
# Request/Response models with Bengaluru validation
# ---------------------------------------------------
class Location(BaseModel):
    lat: float
    lon: float

    @validator("lat")
    def validate_lat(cls, v):
        if not (12.70 <= v <= 13.20):
            raise ValueError(
                "Latitude out of range. Supported region: Bengaluru "
                "(lat 12.70–13.20)"
            )
        return v

    @validator("lon")
    def validate_lon(cls, v):
        if not (77.30 <= v <= 77.80):
            raise ValueError(
                "Longitude out of range. Supported region: Bengaluru "
                "(lon 77.30–77.80)"
            )
        return v

class RouteRequest(BaseModel):
    source: Location
    destination: Location
    datetime: str | None = None


# ---------------------------------------------------
# Request Logging Middleware (structured JSON to stdout)
# ---------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()

    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)

    is_predict = (
        request.url.path == "/predict-route-eta" and request.method == "POST"
    )

    if is_predict:
        # Retrieve parsed source and destination injected by the route handler
        source = getattr(request.state, "source", {})
        destination = getattr(request.state, "destination", {})

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source_lat": source.get("lat"),
            "source_lon": source.get("lon"),
            "dest_lat": destination.get("lat"),
            "dest_lon": destination.get("lon"),
            "duration_ms": duration_ms,
            "http_status": response.status_code,
        }
        print(json.dumps(log_entry), file=sys.stdout, flush=True)

    logger.info(
        f"{request.method} {request.url.path} "
        f"status={response.status_code} duration={duration_ms}ms"
    )
    return response


# ---------------------------------------------------
# Global exception handler — converts RuntimeError to 503
# so cold-start failures are never a cryptic 500
# ---------------------------------------------------
@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    return JSONResponse(
        status_code=503,
        content={
            "error": "Service temporarily unavailable",
            "detail": str(exc),
            "hint": "The engine may still be initializing. "
                    "Retry in 10–30 seconds."
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    with open("500_error_trace.txt", "w") as f:
        f.write(f"500 Error at {request.url.path}:\n")
        f.write(traceback.format_exc())
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error. Trace saved to 500_error_trace.txt"})


# ---------------------------------------------------
# Routes
# ---------------------------------------------------
@app.get("/")
def health():
    from src.routing import route_eta as eng
    return {
        "status": "ok" if is_engine_ready() else "initializing",
        "engine_ready": is_engine_ready(),
        "graph_loaded": eng.GRAPH is not None,
        "models_loaded": eng.MODELS is not None,
    }


@app.get("/health")
def health_detailed():
    from src.routing import route_eta as eng
    graph_info = {}
    if eng.GRAPH is not None:
        graph_info = {
            "nodes": len(eng.GRAPH.nodes),
            "edges": len(eng.GRAPH.edges)
        }
    return {
        "status": "ok" if is_engine_ready() else "initializing",
        "engine_ready": is_engine_ready(),
        "graph": graph_info,
        "models": list(eng.MODELS.keys()) if eng.MODELS else [],
        "route_cache_info": get_shortest_path.cache_info()._asdict()
    }


@app.get("/cache/clear")
def clear_cache():
    get_shortest_path.cache_clear()
    return {"cleared": True, "message": "Route cache cleared."}


# ---------------------------------------------------
# Coordinate Validation
# ---------------------------------------------------
def validate_coordinates(source: Location, destination: Location):
    """Check if coordinates fall within supported Bengaluru region."""
    errors = []
    if not (LAT_MIN <= source.lat <= LAT_MAX) or not (LON_MIN <= source.lon <= LON_MAX):
        errors.append(f"Source ({source.lat}, {source.lon}) outside supported region.")
    if not (LAT_MIN <= destination.lat <= LAT_MAX) or not (LON_MIN <= destination.lon <= LON_MAX):
        errors.append(f"Destination ({destination.lat}, {destination.lon}) outside supported region.")
    return errors


@app.post("/predict-route-eta")
def predict_route_eta(req: RouteRequest, request: Request):
    """
    Multi-horizon ETA prediction endpoint.
    Validates coordinates, computes route, and returns ETA predictions.
    """
    if not is_engine_ready():
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Engine not ready",
                "hint": "The server is still loading the road graph and models. "
                        "Check GET /health and retry when engine_ready is true."
            }
        )

    # .model_dump() is Pydantic v2; fall back to .dict() for v1
    def _loc_dict(loc):
        return loc.model_dump() if hasattr(loc, "model_dump") else loc.dict()

    # Pass payload data to middleware via Request state instead of re-reading body
    request.state.source = _loc_dict(req.source)
    request.state.destination = _loc_dict(req.destination)

    # Coordinate validation
    errors = validate_coordinates(req.source, req.destination)
    if errors:
        return JSONResponse(
            status_code=422,
            content={
                "detail": (
                    "Coordinates outside supported region. "
                    "CGEE supports Bengaluru, India "
                    f"(lat {LAT_MIN}–{LAT_MAX}, lon {LON_MIN}–{LON_MAX})."
                ),
                "errors": errors,
            }
        )

    try:
        return compute_route_eta(
            source=_loc_dict(req.source),
            destination=_loc_dict(req.destination),
            departure_time=req.datetime
        )
    except Exception as e:
        logger.error(f"ETA computation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "ETA computation failed",
                "detail": str(e)
            }
        )
