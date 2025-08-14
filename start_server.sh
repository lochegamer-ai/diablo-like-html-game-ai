#!/usr/bin/env bash
PORT=5173
cd "$(dirname "$0")"
echo "Servidor local em http://localhost:$PORT  (Ctrl+C para sair)"
python3 -m http.server $PORT
