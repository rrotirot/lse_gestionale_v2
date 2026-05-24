# 🎯 Development Setup - Complete Guide

Welcome to the **LSE Gestionale v2** development setup. This directory contains everything you need to run the full-stack application locally with minimal production constraints for faster development.

## 📖 Documentation

Choose your starting point:

### 🚀 For Impatient Developers (5 minutes)
→ [QUICK_START.md](QUICK_START.md)
- Double-click a script to start everything
- Minimal configuration needed
- Immediate feedback

### 📚 For Complete Setup Guide (15 minutes)
→ [LOCAL_SETUP.md](LOCAL_SETUP.md)
- Detailed prerequisites checking
- Database setup options
- Troubleshooting guide
- Full configuration reference

### 🔧 For Development vs Production Understanding
→ [DEVELOPMENT.md](DEVELOPMENT.md)
- Configuration differences
- Feature comparison table
- Switching between modes
- Safety checklists for production

### 🔐 For JWT Token Issues (Production)
→ [FIXJWT_PRODUCTION.md](FIXJWT_PRODUCTION.md)
- Diagnosis commands
- Token verification debugging
- Secret management
- Complete troubleshooting

---

## ⚡ TL;DR Quick Commands

### Windows
```batch
dev-start.bat
```

### macOS / Linux
```bash
chmod +x dev-start.sh
./dev-start.sh
```

### Or Manual Setup
```bash
# Terminal 1: Start databases
docker-compose up -d

# Terminal 2: Start frontend
npm install && npm run dev

# Terminal 3: Start backend
cd backend
cp .env.development .env
npm install && npm run dev
```

---

## 🎓 What You Get

### Development Configuration
- ✅ **Rate limiting disabled** - No throttling on API calls
- ✅ **CORS wide open** - No origin restrictions
- ✅ **Reduced security** - Easier testing
- ✅ **Debug logging** - Verbose output for troubleshooting
- ✅ **Hot reload** - Changes auto-refresh

### Local Services
- 🗄️ **MongoDB** - Local database for testing
- 🚀 **Redis** - Cache and session management
- 📝 **Swagger UI** - API documentation
- 🧪 **Health endpoints** - Service monitoring

### Tools & Scripts
- 🔧 `dev-start.sh` / `dev-start.bat` - One-click startup
- 📊 `docker-compose.yml` - Local service orchestration
- 🔐 `.env.development` - Development configuration
- 📖 Comprehensive documentation

---

## 🔄 Development Workflow

### Daily Workflow
```bash
# Morning: Start everything
./dev-start.sh  # or dev-start.bat

# Code
# Edit files, hot-reload applies changes automatically

# Lunch: Keep services running
# (They're still running in background)

# Evening: Stop everything
# Press Ctrl+C in terminal windows
# Or: docker-compose down
```

### Testing New Features
```bash
# Frontend changes auto-reload
# Backend changes: Just save and restart terminal (Ctrl+C, npm run dev)

# Database changes
mongosh --host localhost -u root -p rootpassword
use lse-members
db.users.find()
```

### Database Reset
```bash
# Backup first
mongodump --uri="mongodb://root:rootpassword@localhost:27017/lse-members"

# Clear data
docker-compose down -v
docker-compose up -d

# Reimport or start fresh
```

---

## 🛑 Common Operations

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f mongodb
docker-compose logs -f redis
```

### Access Databases

#### MongoDB
```bash
# CLI access
mongosh --host localhost --port 27017 -u root -p rootpassword
use lse-members
db.users.find()
```

#### Redis
```bash
# CLI access
redis-cli -h localhost -p 6379
PING
keys *
```

---

## 📂 Project Structure

```
lse_gestionale_v2/
├── src/                      # Frontend (Next.js + React)
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   ├── context/            # React context state
│   ├── views/              # Page components
│   └── ...
├── backend/                  # Backend (Express + Node.js)
│   ├── routes/             # API routes
│   ├── models/             # MongoDB models
│   ├── lib/                # Utilities
│   ├── scripts/            # Automation scripts
│   ├── server.ts           # Express app
│   ├── .env.development    # Dev config ← USE THIS
│   └── package.json
├── docker-compose.yml       # Local services config
├── package.json            # Frontend scripts
├── QUICK_START.md          # Fast setup guide ← START HERE
├── LOCAL_SETUP.md          # Detailed setup
├── DEVELOPMENT.md          # Dev vs Prod explained
└── FIXJWT_PRODUCTION.md    # Production JWT issues
```

---

## 🚀 Services

### Frontend (Port 3000)
- **URL:** http://localhost:3000
- **Framework:** Next.js 16.2
- **Language:** JavaScript + TypeScript
- **Hot Reload:** ✅ Yes
- **Built with:** React, TailwindCSS, Radix UI

### Backend (Port 5000)
- **URL:** http://localhost:5000
- **Framework:** Express.js
- **Language:** TypeScript
- **Hot Reload:** ✅ Yes (with ts-node)
- **API Docs:** http://localhost:5000/api-docs

### MongoDB (Port 27017)
- **Image:** mongo:7.0-alpine
- **User:** root
- **Password:** rootpassword
- **Database:** lse-members
- **Data Persistence:** ✅ Yes (volume)

### Redis (Port 6379)
- **Image:** redis:7-alpine
- **Authentication:** None (local only)
- **Data Persistence:** ✅ Yes (volume)

---

## 🐛 Debugging

### Enable Debug Logging
```bash
# Backend
DEBUG=lse:* npm run dev

# Frontend
NEXT_PUBLIC_DEBUG=true npm run dev
```

### Check Service Status
```bash
# Docker services
docker-compose ps

# Ports in use
# Windows: netstat -ano | findstr :3000
# macOS/Linux: lsof -i :3000

# API health check
curl http://localhost:5000/api/health
```

### Database Debugging
```bash
# List all databases
mongosh --host localhost
> show dbs

# List collections in lse-members
> use lse-members
> show collections

# Check documents
> db.users.find().pretty()
```

---

## 📦 Dependencies

### Frontend
- Next.js 16.2.1
- React 19.2.4
- TailwindCSS 3.4
- TypeScript 5.x

### Backend
- Express.js 4.18
- MongoDB (Mongoose 8.0)
- Redis 4.6
- TypeScript 5.x
- JWT for authentication

### DevOps
- Docker & Docker Compose
- Node.js 18+
- MongoDB Docker image
- Redis Docker image

---

## ✅ Checklist

After setup, verify everything works:

- [ ] `npm run dev` starts frontend on port 3000
- [ ] `npm run dev:backend` starts backend on port 5000
- [ ] `curl http://localhost:5000/api/health` returns `{"status":"ok"}`
- [ ] MongoDB connection shows `✓ MongoDB connected`
- [ ] Can register new user at http://localhost:3000
- [ ] Can login with created account
- [ ] Can navigate to different pages
- [ ] Browser console has no errors (F12)
- [ ] Backend logs show requests (no 401/403 errors)

---

## 🆘 Need Help?

1. **Quick start fails?** → See [QUICK_START.md](QUICK_START.md)
2. **Setup stuck?** → See [LOCAL_SETUP.md](LOCAL_SETUP.md) troubleshooting
3. **Production issues?** → See [FIXJWT_PRODUCTION.md](FIXJWT_PRODUCTION.md)
4. **Config confused?** → See [DEVELOPMENT.md](DEVELOPMENT.md)

---

## 📝 Notes

⚠️ **This development configuration is NOT secure for production:**
- Rate limiting is disabled
- CORS is wide open
- Security headers are reduced
- JWT secret is publicly known
- Debug endpoints are enabled

**For production deployment,** always:
- Use `.env` with production values
- Generate strong secrets
- Enable all security features
- Use proper SSL certificates
- Configure proper CORS origins

---

## 🎉 Ready?

```bash
# Choose your path:
./dev-start.sh          # Fast (macOS/Linux)
dev-start.bat           # Fast (Windows)
npm run dev:db          # Start just databases
npm run dev:backend     # Start just backend
npm run dev             # Start just frontend
npm run dev:full        # Start both (if concurrently is installed)
```

Happy coding! 🚀
