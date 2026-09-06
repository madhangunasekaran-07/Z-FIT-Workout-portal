$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot
Write-Host "Starting Z Fit FastAPI Backend Server on http://127.0.0.1:8000..."
& ".\venv\Scripts\uvicorn.exe" app.main:app --host 127.0.0.1 --port 8000 --reload
