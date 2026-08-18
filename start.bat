@echo off
REM Starts the RAGnosis API and the React dev server in separate windows.
REM Requires: .NET 8 SDK, Node 18+, and a running MongoDB on localhost:27017.
cd /d "%~dp0"

where dotnet >nul 2>nul || (echo ERROR: .NET 8 SDK not found. & pause & exit /b 1)
where npm    >nul 2>nul || (echo ERROR: Node.js not found. & pause & exit /b 1)

if not exist frontend\node_modules (
  echo Installing frontend dependencies ^(first run only^)...
  pushd frontend && call npm install && popd
)

start "RAGnosis API" cmd /k "cd backend\RAGnosis.Api && set ASPNETCORE_ENVIRONMENT=Development && dotnet run"
start "RAGnosis Web" cmd /k "cd frontend && npm run dev"

echo.
echo API:      http://localhost:5000
echo Frontend: http://localhost:5173
echo.
pause
