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
    title="Contextual Graph ETA Engine (CGEE™)",
    description="Context-aware multi-horizon graph-based ETA prediction engine",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React dev server (Vite on :5173) and any other origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

@app.get("/", response_class=HTMLResponse)
def serve_frontend():
    try:
        with open("static/index.html") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return JSONResponse(
            content={
                "status": "ok" if is_engine_ready() else "initializing",
                "engine_ready": is_engine_ready(),
            }
        )


@app.get("/health")
def health():
    import src.routing.route_eta as eng

    graph_info = {}
    if eng.GRAPH is not None:
        graph_info = {
            "nodes": len(eng.GRAPH.nodes),
            "edges": len(eng.GRAPH.edges),
        }
    return {
        "status": "ok" if is_engine_ready() else "initializing",
        "engine_ready": is_engine_ready(),
        "init_error": get_init_error(),
        "graph": graph_info,
        "models": list(eng.MODELS.keys()) if eng.MODELS else [],
        "route_cache": get_shortest_path.cache_info()._asdict(),
    }


@app.get("/cache/clear")
def clear_cache():
    get_shortest_path.cache_clear()
    return {"cleared": True}


@app.post("/predict-route-eta")
def predict_route_eta(req: RouteRequest):
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
        return compute_route_eta(
            source=req.source.dict(),
            destination=req.destination.dict(),
        )
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


# Mount AFTER all routes. Create the directory if it doesn't exist.
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")