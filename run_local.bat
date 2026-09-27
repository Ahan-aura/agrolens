@echo off
echo ===================================================
echo Starting CropSense RL Stack Locally
echo ===================================================

echo [1/3] Launching FastAPI ML RL Service on :8000...
start "CropSense ML Engine" cmd /k "cd services\ml && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 > nul

echo [2/3] Launching Express API Gateway on :4000...
start "CropSense Gateway" cmd /k "cd services\gateway && npm start"

timeout /t 2 > nul

echo [3/3] Launching React UI Frontend on :5173...
start "CropSense Frontend" cmd /k "cd frontend && npm run dev"

echo ===================================================
echo Services started!
echo Frontend:    http://localhost:5173
echo Gateway:     http://localhost:4000
echo ML Engine:   http://localhost:8000/docs
echo ===================================================
