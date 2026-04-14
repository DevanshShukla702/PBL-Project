# CGEE Deployment Guide

## Prerequisites

* Render.com account (free tier works)
* Supabase project created with schema from Phase 1
* Git repo with all code committed (NO `data/` or `models/` in git — they are gitignored)

## Steps

### 1. Upload large files to Render Persistent Disk
After first deployment, use Render Shell to upload:
* `bengaluru.graphml` → `/app/data/raw/osm/bengaluru.graphml`
* `xgb_1_hour.pkl`, `xgb_2_hour.pkl`, `xgb_4_hour.pkl` → `/app/models/`

### 2. Set Environment Variables on Render Dashboard
Go to your service → Environment → add:
* `SUPABASE_URL`
* `SUPABASE_SERVICE_KEY`
* `ALLOWED_ORIGINS` (your render URL e.g. `https://cgee-api.onrender.com`)
* `DEMO_PASSWORD`

### 3. Deploy
Push to GitHub → Render auto-deploys from `render.yaml`

### 4. Verify
Hit `https://your-service.onrender.com/health` — `engine_ready` should be true after ~60s startup

## Notes

* Free tier sleeps after 15min inactivity — first request after sleep takes ~30s
* Upgrade to Render Starter ($7/mo) for always-on
* The OSM graph loads once at startup and stays in RAM — this is why `workers=1`
