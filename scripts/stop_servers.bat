@echo off
echo [*] Stopping Smart-Infra Servers...

:: Kill Backend
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    echo [!] Killing Backend process (PID: %%a)
    taskkill /f /t /pid %%a >nul 2>&1
)

:: Kill Frontend
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":3000 :5173 :5174 :5175 :5176 :5177"') do (
    echo [!] Killing Frontend process (PID: %%a)
    taskkill /f /t /pid %%a >nul 2>&1
)

echo [DONE] Servers stopped.
pause
