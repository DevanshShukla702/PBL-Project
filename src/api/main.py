import os
import asyncio
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator

from src.routing.route_eta import (
    initialize_engine,
    is_engine_ready,
    get_init_error,
    compute_route_eta,
    get_shortest_path,
)
from src.db.supabase_client import save_trip, get_history, get_favourites, delete_favourite
import threading
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("cgee")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Non-blocking startup: engine loads in a background thread.
    App accepts requests immediately; /predict-route-eta returns 503
    until engine_ready = True.
    """
    loop = asyncio.get_event_loop()
    # Store the future so exceptions are not silently discarded
    future = loop.run_in_executor(None, initialize_engine)

    # Log any unhandled exception from the init thread
    def _on_init_done(fut):
        exc = fut.exception()
        if exc:
            logger.error(f"[CGEE] Engine init thread raised: {exc}", exc_info=exc)
    future.add_done_callback(_on_init_done)

    logger.info("[CGEE] Engine initialization started in background thread.")
    yield
    get_shortest_path.cache_clear()
    logger.info("[CGEE] Shutdown complete.")


app = FastAPI(
    title="Contextual Graph ETA Engine (CGEE)",
    description="Context-aware multi-horizon graph-based ETA prediction engine",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React dev server (Vite on :5173) and any other origin
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:8000"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "X-Session-ID"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ----- Pydantic models with Bengaluru bounding box validation -----

class Location(BaseModel):
    lat: float
    lon: float

    @validator("lat")
    def validate_lat(cls, v):
        if not (12.70 <= v <= 13.20):
            raise ValueError(
                f"Latitude {v} is outside Bengaluru bounds (12.70–13.20)."
            )
        return v

    @validator("lon")
    def validate_lon(cls, v):
        if not (77.30 <= v <= 77.80):
            raise ValueError(
                f"Longitude {v} is outside Bengaluru bounds (77.30–77.80)."
            )
        return v


class RouteRequest(BaseModel):
    source: Location
    destination: Location

class SessionRequest(BaseModel):
    session_id: str

class DeleteFavRequest(BaseModel):
    session_id: str
    fav_id: str


# ----- Middleware: structured request logging -----

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    ms = round((time.time() - start) * 1000, 1)
    logger.info(
        f"{request.method} {request.url.path} "
        f"→ {response.status_code} ({ms}ms)"
    )
    return response


# ----- Global exception handlers -----

@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    return JSONResponse(
        status_code=503,
        content={
            "error": "Service temporarily unavailable",
            "detail": str(exc),
            "hint": (
                "The CGEE engine may still be initializing. "
                "Check GET /health for engine_ready status "
                "and retry when it is true."
            ),
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=422,
        content={"error": "Validation error", "detail": str(exc)},
    )


# ----- Routes -----



@app.get("/health")
def health():
    import src.routing.route_eta as eng
    return {
        "status": "ok" if is_engine_ready() else "initializing",
        "engine_ready": is_engine_ready(),
        "models": list(eng.MODELS.keys()) if hasattr(eng, 'MODELS') and eng.MODELS else [],
    }


@app.get("/cache/clear")
def clear_cache():
    get_shortest_path.cache_clear()
    return {"cleared": True}


@app.post("/predict-route-eta")
@limiter.limit("30/minute")
def predict_route_eta(request: Request, req: RouteRequest):
    if not is_engine_ready():
        err = get_init_error()
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Engine not ready",
                "init_error": err,
                "hint": (
                    "Check GET /health. The server is loading the "
                    "road graph and models. Retry when engine_ready is true."
                ),
            },
        )
    try:
        result = compute_route_eta(
            source=req.source.dict(),
            destination=req.destination.dict(),
        )
        session_id = request.headers.get("X-Session-ID", "demo")
        threading.Thread(
            target=save_trip,
            args=(session_id, req.source.dict(), req.destination.dict(), result),
            daemon=True
        ).start()
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"ETA computation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "ETA computation failed", "detail": str(e)},
        )

@app.post("/trips/save")
def save_trip_endpoint(req: RouteRequest, session_id: str = "demo"):
    """Called by frontend after a successful prediction to store history."""
    return {"saved": True}

@app.get("/trips/history")
@limiter.limit("60/minute")
def trip_history(request: Request, session_id: str = "demo"):
    return {"trips": get_history(session_id)}

@app.get("/trips/favourites")
@limiter.limit("60/minute")
def trip_favourites(request: Request, session_id: str = "demo"):
    return {"favourites": get_favourites(session_id)}

@app.delete("/trips/favourites/{fav_id}")
def remove_favourite(fav_id: str, session_id: str = "demo"):
    delete_favourite(session_id, fav_id)
    return {"deleted": True}

@app.get("/config/auth-hint")
def auth_hint():
    return {
        "email": os.environ.get("DEMO_EMAIL", "demo@cgee.ai"),
        "hint":  "Use credentials set by administrator"
    }


# Mount AFTER all routes. Create the directory if it doesn't exist.
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve React application securely
import os
os.makedirs("static/app-react", exist_ok=True)
app.mount("/app", StaticFiles(directory="static/app-react", html=True), name="react-app")
from fastapi.responses import FileResponse

@app.get("/", summary="Landing Page")
async def root():
    return FileResponse("static/login.html")
