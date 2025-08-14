@echo off
setlocal
set PORT=5173
cd /d %~dp0
echo Servidor local em http://localhost:%PORT%  (Ctrl+C para sair)
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server %PORT%
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python -m http.server %PORT%
  ) else (
    echo Nao encontrei Python. Instale Python ou use VS Code Live Server.
    pause
  )
)
