$PORT=5173
Set-Location $PSScriptRoot
Write-Host "Servidor local em http://localhost:$PORT (Ctrl+C para sair)"
try { py -m http.server $PORT } catch { python -m http.server $PORT }
