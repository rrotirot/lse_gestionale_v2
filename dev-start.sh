#!/bin/bash

# =========================================================================
# LSE Gestionale v2 - Local Development Startup Script
# =========================================================================
# Questo script avvia sia il frontend che il backend in development mode
# Requisiti: Node.js 18+, Docker (per MongoDB/Redis)

set -e

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   LSE Gestionale v2 - Local Development Startup           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker not found - services will be started but MongoDB/Redis won't be available${NC}"
    echo -e "${YELLOW}  Install Docker from https://www.docker.com/products/docker-desktop${NC}"
else
    echo -e "${GREEN}✓ Docker $(docker --version)${NC}"
fi

# Function to check if Docker service is running
start_docker_services() {
    if command -v docker &> /dev/null; then
        echo -e "\n${YELLOW}Starting Docker services...${NC}"
        docker-compose up -d mongodb redis
        echo -e "${GREEN}✓ MongoDB running on localhost:27017${NC}"
        echo -e "${GREEN}✓ Redis running on localhost:6379${NC}"
        sleep 2 # Wait for services to be healthy
    fi
}

# Start services
start_docker_services

# Setup Frontend
echo -e "\n${YELLOW}Setting up Frontend...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

# Ensure .env.local exists
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local 2>/dev/null || echo "NEXT_PUBLIC_RSI_API_URL=http://localhost:5000" > .env.local
    echo -e "${GREEN}✓ Created .env.local${NC}"
fi

# Setup Backend
echo -e "\n${YELLOW}Setting up Backend...${NC}"
cd backend

if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi

# Copy development env file
if [ ! -f ".env" ]; then
    if [ -f ".env.development" ]; then
        cp .env.development .env
        echo -e "${GREEN}✓ Copied .env.development to .env${NC}"
    else
        echo -e "${RED}✗ .env.development not found!${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env already exists${NC}"
fi

cd ..

# Start Frontend and Backend
echo -e "\n${YELLOW}Starting services...${NC}"
echo -e "${YELLOW}────────────────────────────────────────────────────────────${NC}"

# Function to stop services on exit
cleanup() {
    echo -e "\n\n${YELLOW}Shutting down services...${NC}"
    pkill -f "next dev" || true
    pkill -f "ts-node server.ts" || true
    echo -e "${GREEN}✓ Services stopped${NC}"
}

trap cleanup EXIT

# Start backend in background
cd backend
echo -e "\n${YELLOW}Starting Backend (Port 5000)...${NC}"
npm run dev &
BACKEND_PID=$!
sleep 3

cd ..

# Start frontend
echo -e "\n${YELLOW}Starting Frontend (Port 3000)...${NC}"
npm run dev

wait
