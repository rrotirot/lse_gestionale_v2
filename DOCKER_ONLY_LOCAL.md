# 🐳 Docker-Only Local Development

This setup is **Docker-only, no Kubernetes required** for local development.

## Architecture

```
┌─────────────────────────────────────────┐
│     Your Local Machine (Docker)         │
├─────────────────────────────────────────┤
│                                         │
│  Frontend        Backend     Services   │
│  localhost:3000  localhost:5000         │
│  (Next.js)       (Express)              │
│     ↔️              ↔️                   │
│              MongoDB (Docker)           │
│              Redis (Docker)             │
│                                         │
│  Everything runs in Docker containers   │
│  NO Kubernetes required                 │
│                                         │
└─────────────────────────────────────────┘
```

## What You Need

✅ **Only:**
- Docker Desktop (Windows/macOS) or Docker (Linux)
- Docker Compose (included in Docker Desktop)
- Node.js 18+
- npm

❌ **NOT needed:**
- Kubernetes (k3s, minikube, etc)
- kubectl
- Helm charts
- Docker registry

## Configuration Files (Local Development)

### Docker Services
- **`docker-compose.yml`** - Pure Docker Compose
  - MongoDB container
  - Redis container
  - No Kubernetes manifests

### Backend
- **`backend/.env.development`** → Copy to `backend/.env`
  - `MONGODB_URI=mongodb://localhost:27017/lse-members`
  - `REDIS_URL=redis://localhost:6379`
  - Everything connects to local Docker services

### Frontend
- **`.env.local`** - Already configured
  - `NEXT_PUBLIC_RSI_API_URL=http://localhost:5000`
  - Connects to local backend

## Quick Start (Docker Only)

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Check services are running
docker-compose ps
# Output:
# NAME             IMAGE           STATUS
# lse-mongodb-dev  mongo:7-alpine  Up (healthy)
# lse-redis-dev    redis:7-alpine  Up (healthy)

# 3. Start frontend (Terminal 2)
npm install && npm run dev

# 4. Start backend (Terminal 3)
cd backend
cp .env.development .env
npm install && npm run dev

# Done! Open http://localhost:3000
```

## Docker Commands (No kubectl!)

### View Status
```bash
# List running containers
docker-compose ps

# View logs
docker-compose logs -f mongodb
docker-compose logs -f redis

# Check if services are healthy
docker-compose ps --format "table {{.Service}}\t{{.Status}}"
```

### Database Access (No kubectl!)
```bash
# Connect to MongoDB directly
docker exec -it lse-mongodb-dev mongosh -u root -p rootpassword

# Or use CLI
mongosh --host localhost --port 27017 -u root -p rootpassword
```

### Stop Everything
```bash
# Stop and keep data
docker-compose down

# Stop and DELETE data (careful!)
docker-compose down -v
```

## File Locations (Local)

```
lse_gestionale_v2/
├── docker-compose.yml          ← Docker Compose (ONLY Docker!)
├── backend/
│   ├── .env.development        ← Copy to .env
│   ├── server.ts               ← Backend app
│   └── ...
├── src/                        ← Frontend app
├── .env.local                  ← Frontend config
└── dev-start.sh / .bat         ← Launch script
```

## Port Mapping (Local Docker)

| Service | Port | Docker | Local |
|---------|------|--------|-------|
| Frontend | 3000 | N/A | http://localhost:3000 |
| Backend | 5000 | N/A | http://localhost:5000 |
| MongoDB | 27017 | 27017→27017 | mongodb://localhost:27017 |
| Redis | 6379 | 6379→6379 | redis://localhost:6379 |

## Network (Docker)

All services are in the same Docker Compose network (`lse-network`):
- Frontend talks to Backend at `http://localhost:5000`
- Backend talks to MongoDB at `mongodb://localhost:27017`
- Backend talks to Redis at `redis://localhost:6379`

No Kubernetes networking needed!

## Data Persistence (Local Docker)

Data survives `docker-compose down`:
```bash
# Volumes created by docker-compose
docker volume ls
# lse_gestionale_v2_mongodb_data
# lse_gestionale_v2_mongodb_config
# lse_gestionale_v2_redis_data

# Data persists until you run:
docker-compose down -v  # Deletes volumes!
```

## Environment Variables (Development)

### Backend `.env.development`
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lse-members    ← Local Docker MongoDB
REDIS_URL=redis://localhost:6379                      ← Local Docker Redis
JWT_SECRET=dev-jwt-secret-key-for-development
RATE_LIMIT_DISABLED=true
CORS_ORIGIN=*
```

### Frontend `.env.local`
```env
NEXT_PUBLIC_RSI_API_URL=http://localhost:5000         ← Local Docker Backend
NEXT_PUBLIC_DEV_MODE=true
```

All point to `localhost` (Docker Compose handles port forwarding automatically).

## Troubleshooting (Docker Only)

### Port Already in Use
```bash
# Check what's using port 3000
docker ps -a  # See all containers
lsof -i :3000  # Check port (macOS/Linux)

# Kill the container
docker-compose down
```

### MongoDB Connection Error
```bash
# Check if MongoDB container is running
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Redis Connection Error
```bash
# Check Redis
docker-compose ps redis

# Test Redis connection
docker exec -it lse-redis-dev redis-cli ping
# Should output: PONG
```

### Reset Everything
```bash
# Stop and delete all containers and volumes
docker-compose down -v

# Restart fresh
docker-compose up -d
```

## Production vs Local

### Local Development (Docker)
```
docker-compose up -d
├─ MongoDB (Docker container)
└─ Redis (Docker container)

✅ No Kubernetes
✅ No kubectl
✅ Super simple
✅ Perfect for development
```

### Production (k3s/Kubernetes)
```
k3s cluster
├─ Backend (Pod)
├─ MongoDB (External Atlas)
├─ Redis (External service)
└─ Ingress

📚 Separate setup in k3s/ folder
🔐 Production-grade security
```

## Key Takeaway

**Local Development = Docker Only**
- ✅ `docker-compose up -d` starts everything
- ✅ `docker-compose down` stops everything
- ✅ No Kubernetes, no kubectl, no complexity
- ✅ Perfect for coding and testing

**Production = k3s (Different Setup)**
- Covered in `k3s/` folder (separate from this)
- Uses kubectl and Kubernetes manifests
- Not needed for local development

## One Command to Remember

```bash
# Start everything in Docker
docker-compose up -d

# Stop everything
docker-compose down

# That's it! ✅
```

Happy coding! 🚀 Everything is running in pure Docker, no Kubernetes involved.
