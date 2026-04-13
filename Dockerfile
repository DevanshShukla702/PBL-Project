FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libspatialindex-dev \
    libgeos-dev \
    libproj-dev \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY models/ ./models/
COPY data/raw/osm/ ./data/raw/osm/
COPY static/ ./static/

EXPOSE 8000

# Single worker — OSMnx graph lives in process memory.
# Multi-worker would duplicate ~1-2GB per worker without shared state.
CMD ["uvicorn", "src.api.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--log-level", "info"]
