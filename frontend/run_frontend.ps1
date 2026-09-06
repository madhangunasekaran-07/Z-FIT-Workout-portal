$ErrorActionPreference = "Stop"
$nodeDir = "$env:LOCALAPPDATA\Programs\nodejs"
$env:Path = "$nodeDir;$env:Path"
Set-Location -Path $PSScriptRoot
Write-Host "Starting Z Fit React/Vite Frontend on http://localhost:5173..."
& "$nodeDir\npm.cmd" run dev
