@echo off
echo [*] Login Docker Hub...
docker login
if %errorlevel% neq 0 (
    echo [ERRORE] Login fallito.
    pause
    exit /b 1
)

echo [*] Build frontend multi-platform in corso...
docker buildx build ^
  --platform linux/amd64,linux/arm64 ^
  -t alexkill536ita/lse-gestionale-frontend:1.0.0 ^
  --push ^
  .

if %errorlevel% neq 0 (
    echo [ERRORE] Build frontend fallita.
    pause
    exit /b 1
)

echo [OK] Build e push frontend completati con successo!

echo [*] Build backend multi-platform in corso...
docker buildx build ^
  --platform linux/amd64,linux/arm64 ^
  -t alexkill536ita/lse-gestionale-backend:1.0.0 ^
  --push ^
  ./backend

if %errorlevel% neq 0 (
    echo [ERRORE] Build backend fallita.
    pause
    exit /b 1b
)

echo [OK] Build e push backend completati con successo!
pause
