#!/usr/bin/env bash
# Starts the RAGnosis API and the React dev server together.
# Requires: .NET 8 SDK, Node 18+, and a running MongoDB on localhost:27017.
set -euo pipefail
cd "$(dirname "$0")"

command -v dotnet >/dev/null || { echo "ERROR: .NET 8 SDK not found. https://dotnet.microsoft.com/download"; exit 1; }
command -v npm    >/dev/null || { echo "ERROR: Node.js not found. https://nodejs.org"; exit 1; }

if ! (echo > /dev/tcp/127.0.0.1/27017) 2>/dev/null; then
  echo "WARNING: nothing is listening on 127.0.0.1:27017 — start MongoDB first."
  echo "         (or run 'docker compose up' to start everything together)"
fi

cleanup() { echo; echo "Shutting down..."; kill 0; }
trap cleanup EXIT INT TERM

echo "Starting API on http://localhost:5000 ..."
(cd backend/RAGnosis.Api && ASPNETCORE_ENVIRONMENT=Development dotnet run) &

if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies (first run only)..."
  (cd frontend && npm install)
fi

echo "Starting frontend on http://localhost:5173 ..."
(cd frontend && npm run dev) &

wait
