# Contextual Graph ETA Engine (CGEE™)

## Overview

The Contextual Graph ETA Engine (CGEE™) is a graph-based, multi-horizon traffic ETA prediction system that integrates machine learning and shortest-path routing to generate realistic, context-aware travel time estimates.

The system combines:
- OpenStreetMap graph routing (OSMnx)
- Multi-horizon XGBoost speed prediction models
- Segment-level ETA aggregation
- Context-aware incident modeling
- Uncertainty band estimation
- Confidence scoring
- Route caching optimization

---

## Key Features

- Graph-based shortest path routing
- Segment-level ML speed prediction
- Multi-horizon ETA forecasting (1h, 2h, 4h)
- Localized incident simulation with spatial propagation
- ETA uncertainty bands
- Confidence score per horizon
- Production-ready FastAPI backend
- Modular and extensible architecture

---

## Architecture

User → FastAPI → Graph Routing → ML Speed Prediction → ETA Aggregation → Response (JSON)

---

## API Endpoint

### POST `/predict-route-eta`

#### Request

```json
{
  "source": {"lat": 12.9716, "lon": 77.5946},
  "destination": {"lat": 12.9750, "lon": 77.6000}
}

{
  "eta_minutes": {
    "1_hour": {
      "estimate": 18.2,
      "lower_bound": 16.9,
      "upper_bound": 20.1
    }
  },
  "confidence": {
    "1_hour": 0.89
  },
  "meta": {
    "distance_km": 12.4,
    "segments": 48,
    "incident": true,
    "incident_segments": 4,
    "avg_incident_severity": 0.47
  }
}
