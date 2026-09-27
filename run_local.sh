#!/usr/bin/env bash
# =============================================================================
# CropSense RL: Local multi-process runner
# Launches ML service, Gateway, and Frontend concurrently
# =============================================================================
set -e

echo "Starting CropSense RL Stack..."

# Trap SIGINT to kill background jobs cleanly
trap 'kill $(jobs -p)' EXIT

echo "[1/3] Starting ML Service (FastAPI) on :8000..."
(cd services/ml && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload) &

sleep 2

echo "[2/3] Starting Gateway (Express) on :4000..."
(cd services/gateway && npm start) &

sleep 2

echo "[3/3] Starting Frontend (React/Vite) on :5173..."
(cd frontend && npm run dev) &

echo "All services running:"
echo "  Frontend:    http://localhost:5173"
echo "  Gateway:     http://localhost:4000"
echo "  ML Docs:     http://localhost:8000/docs"

wait
