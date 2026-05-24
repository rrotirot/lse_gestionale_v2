@echo off
REM =========================================================================
REM LSE Gestionale v2 - Local Development Startup Script (Windows)
REM =========================================================================
REM Questo script avvia sia il frontend che il backend in development mode
REM Requisiti: Node.js 18+, Docker Desktop (per MongoDB/Redis)

setlocal enabledelayedexpansion

cls
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   LSE Gestionale v2 - Local Development Startup           ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check Node.js
echo Checking prerequisites...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION%

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION%

REM Check Docker (optional)
docker --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Docker not found - MongoDB/Redis won't be available
    echo Download Docker from: https://www.docker.com/products/docker-desktop
    echo.
    set USE_DOCKER=0
) else (
    for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VERSION=%%i
    echo [OK] !DOCKER_VERSION!
    set USE_DOCKER=1
)

REM Start Docker services
if %USE_DOCKER% equ 1 (
    echo.
    echo Starting Docker services...
    docker-compose up -d mongodb redis
    if errorlevel 1 (
        echo [WARNING] Failed to start Docker services
    ) else (
        echo [OK] MongoDB running on localhost:27017
        echo [OK] Redis running on localhost:6379
        timeout /t 2 /nobreak
    )
)

REM Setup Frontend
echo.
echo Setting up Frontend...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies already installed
)

REM Ensure .env.local exists
if not exist ".env.local" (
    (
        echo # Frontend environment variables
        echo NEXT_PUBLIC_RSI_API_URL=http://localhost:5000
        echo NEXT_PUBLIC_DEV_MODE=true
    ) > .env.local
    echo [OK] Created .env.local
) else (
    echo [OK] .env.local already exists
)

REM Setup Backend
echo.
echo Setting up Backend...
cd backend
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo [OK] Backend dependencies installed
) else (
    echo [OK] Backend dependencies already installed
)

REM Copy development env file
if not exist ".env" (
    if exist ".env.development" (
        copy .env.development .env >nul
        echo [OK] Copied .env.development to .env
    ) else (
        echo [ERROR] .env.development not found!
        cd ..
        pause
        exit /b 1
    )
) else (
    echo [OK] .env already exists
)

cd ..

REM Start services
echo.
echo ════════════════════════════════════════════════════════════
echo Starting services...
echo ════════════════════════════════════════════════════════════
echo.

REM Create temporary batch files for parallel execution
echo @echo off > start_backend.bat
echo cd backend >> start_backend.bat
echo echo Starting Backend... >> start_backend.bat
echo npm run dev >> start_backend.bat
echo pause >> start_backend.bat

echo @echo off > start_frontend.bat
echo timeout /t 3 /nobreak >> start_frontend.bat
echo echo Starting Frontend... >> start_frontend.bat
echo npm run dev >> start_frontend.bat
echo pause >> start_frontend.bat

REM Start in new windows
start "LSE Backend (Port 5000)" cmd /k call start_backend.bat
start "LSE Frontend (Port 3000)" cmd /k call start_frontend.bat

echo.
echo ════════════════════════════════════════════════════════════
echo Services are starting in separate windows...
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo API Docs: http://localhost:5000/api-docs
echo.
echo Close the terminal windows to stop the services.
echo ════════════════════════════════════════════════════════════
echo.

REM Wait a bit before closing
timeout /t 5 /nobreak

REM Cleanup
del start_backend.bat start_frontend.bat >nul 2>&1

endlocal
