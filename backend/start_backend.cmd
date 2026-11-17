@echo off
setlocal

REM Stop only the process currently listening on Ledger's backend port.
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":5001" ^| findstr "LISTENING"') do taskkill /PID %%P /F >nul 2>&1

REM Always launch with this project's virtual environment.
"%~dp0venv\Scripts\python.exe" "%~dp0run.py"
