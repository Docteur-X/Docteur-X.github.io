@echo off
REM Start a small local web server so the browser can load JavaScript ES modules.
REM Open http://localhost:8000 after the server starts. Press Ctrl+C to stop it.
cd /d "%~dp0"
py -m http.server 8000
if errorlevel 1 (
  echo.
  echo Python launcher was not found. Install Python or use VS Code Live Server.
  pause
)
