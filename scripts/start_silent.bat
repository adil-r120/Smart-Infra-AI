@echo off
setlocal

echo --- Smart-Infra Persistence Engine ---

:: 1. Force kill any existing processes on ports 8000 (Backend) and frontend ports (3000, 5173-5177)
echo [*] Cleaning ghost processes on ports 8000, 3000, and 5173-5177...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /f /t /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":3000 :5173 :5174 :5175 :5176 :5177"') do taskkill /f /t /pid %%a >nul 2>&1

:: 2. Start Backend
echo [*] Launching Neural Backend (8000)...
pushd "%~dp0..\backend"
start /B venv\Scripts\python.exe run.py
popd

:: 3. Start Frontend
echo [*] Launching Dashboard UI (3000)...
pushd "%~dp0..\frontend"
start /B npm run dev -- --port 3000
popd

echo.
echo [SUCCESS] Smart-Infra is now active.
echo [+] Backend: http://localhost:8000
echo [+] Frontend: http://localhost:3000
echo.
echo NOTE: You can close this window. The servers will remain active in the background.
echo To stop them, run scripts/stop_servers.bat.
timeout /t 5 >nul
exit
