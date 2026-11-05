@echo off
setlocal
echo ===================================================
echo   Smart-Infra AI -- Stopping Docker Services
echo ===================================================

docker-compose down

echo.
echo [+] All Smart-Infra containers stopped cleanly.
echo.
pause

