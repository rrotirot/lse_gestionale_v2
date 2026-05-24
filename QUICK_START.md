# 🎯 Quick Start Guide for Local Development

This guide provides the fastest way to get **LSE Gestionale v2** running on your machine.

## ⚡ Ultra-Quick Start (Choose Your OS)

### Windows Users
1. **Double-click:** `dev-start.bat`
2. **Wait** for two terminal windows to open (Frontend & Backend)
3. **Open browser:** http://localhost:3000

### macOS / Linux Users
```bash
# Make script executable
chmod +x dev-start.sh

# Run it
./dev-start.sh
```

That's it! The script will:
- ✅ Check prerequisites (Node.js, Docker)
- ✅ Start MongoDB & Redis (Docker)
- ✅ Install dependencies
- ✅ Configure environment files
- ✅ Start Frontend (port 3000) & Backend (port 5000)

---

## 📋 Manual Setup (If Script Doesn't Work)

### Step 1: Start Databases
```bash
docker-compose up -d
```

### Step 2: Frontend
```bash
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

### Step 3: Backend (in another terminal)
```bash
cd backend
cp .env.development .env  # Important!
npm install
npm run dev
# Backend runs on http://localhost:5000
```

---

## 🔐 Configuration Files

### Frontend `.env.local`
```env
NEXT_PUBLIC_RSI_API_URL=http://localhost:5000
NEXT_PUBLIC_DEV_MODE=true
```

### Backend `.env.development` (COPY TO `.env`)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lse-members
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-key-for-development
RATE_LIMIT_DISABLED=true
CORS_ORIGIN=*
```

**Key differences from production:**
- ✅ Rate limiting disabled
- ✅ CORS wide open
- ✅ Helmet security reduced
- ✅ Debug logging enabled

---

## 🧪 Testing the Setup

### Browser Check
- **Frontend:** http://localhost:3000
- **API Health:** http://localhost:5000/api/health  
- **API Docs:** http://localhost:5000/api/docs

### Create Test User
```bash
# In browser: Register new account at http://localhost:3000
# OR via database:

mongosh --host localhost -u root -p rootpassword

use lse-members
db.users.insertOne({
  username: "testuser",
  email: "test@example.com",
  rsiVerified: true,
  organizationRank: 4
})
```

### Login
- Username: `testuser`  
- Password: (same as you set during registration)

---

## 🚨 Common Issues

| Problem | Solution |
|---------|----------|
| **Port 3000 already in use** | `lsof -ti:3000 \| xargs kill -9` (macOS/Linux) |
| **Port 5000 already in use** | `lsof -ti:5000 \| xargs kill -9` (macOS/Linux) |
| **MongoDB connection error** | `docker-compose up -d mongodb` |
| **Redis connection error** | `docker-compose up -d redis` |
| **.env file not found** | `cp backend/.env.development backend/.env` |
| **node_modules issues** | `rm -rf node_modules package-lock.json && npm install` |

---

## 📚 Full Documentation

For detailed setup, configuration, and troubleshooting, see:
- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Complete local development guide
- [FIXJWT_PRODUCTION.md](FIXJWT_PRODUCTION.md) - Production JWT configuration

---

## 🎓 Development Commands

### Frontend
```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run typecheck  # Check TypeScript
```

### Backend
```bash
npm run dev        # Start with auto-reload
npm run build      # Compile TypeScript
npm test           # Run tests
npm run smoke      # Run smoke tests
```

### Docker Services
```bash
docker-compose up -d      # Start all services
docker-compose down       # Stop all services
docker-compose logs -f    # View logs
docker-compose ps         # List running containers
```

---

## 🚀 Ready to Code!

Your local environment is configured to:
- ✅ Disable production security restrictions
- ✅ Enable verbose logging
- ✅ Allow wide CORS access
- ✅ Disable rate limiting
- ✅ Use development JWT secret

**⚠️ IMPORTANT:** These settings are for development only. Never use in production!

Happy coding! 🎉
