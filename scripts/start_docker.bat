@echo off
setlocal
echo ===================================================
echo   Smart-Infra AI -- Docker Launcher
echo ===================================================

:: Check if Docker is responding
docker-compose ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Docker engine is not running yet.
    echo [*] Launching Docker Desktop in the background...
    start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
    echo [*] Waiting for Docker engine to start up...
    
    :wait_loop
    timeout /t 3 /nobreak >nul
    docker-compose ps >nul 2>&1
    if %errorlevel% neq 0 (
        echo [.] Waiting for Docker daemon...
        goto wait_loop
    )
    echo [+] Docker daemon is now connected!
)

echo [*] Orchestrating Smart-Infra services (Database, Backend AI, Frontend Nginx)...
docker-compose up --build -d

echo.
echo ===================================================
echo   Smart-Infra is successfully running in Docker!
echo ===================================================
echo   [*] Frontend HUD:       http://localhost
echo   [*] Alternate HUD Port: http://localhost:5173
echo   [*] Backend API & Docs: http://localhost:8000/docs
echo   [*] MySQL Database:     localhost:3306
echo ===================================================
echo.
echo To view live logs: run "docker-compose logs -f"
echo To stop containers: double-click scripts\stop_docker.bat
echo.
pause

