# 🚀 Local Development Setup Guide

Questa guida ti aiuta a lanciare **LSE Gestionale v2** in locale con esclusione delle regole di produzione.

## Prerequisites

Assicurati di avere installato:
- **Node.js** v18+ (scarica da https://nodejs.org/)
- **npm** v8+ o **yarn**
- **Docker** e **Docker Compose** (per MongoDB e Redis) - opzionale se hai database locali

Verifica l'installazione:
```bash
node --version      # v18.x.x
npm --version       # 8.x.x
docker --version    # Docker version 20.x.x
docker-compose --version  # Docker Compose version 2.x.x
```

---

## ⚡ Quick Start (5 minuti)

### 1. Start Database Services
```bash
# Da root del progetto, lancia MongoDB e Redis
docker-compose up -d

# Verifica che i servizi siano in esecuzione
docker-compose ps

# Output atteso:
# NAME                IMAGE              STATUS
# lse-mongodb-dev     mongo:7.0-alpine   Up (healthy)
# lse-redis-dev       redis:7-alpine     Up (healthy)
```

### 2. Setup Frontend
```bash
# Installa dipendenze
npm install

# Avvia Next.js dev server
npm run dev

# Output atteso:
# ▲ Next.js 16.2.1
# - Local:        http://localhost:3000
```

### 3. Setup Backend (in un altro terminale)
```bash
# Vai nella cartella backend
cd backend

# Installa dipendenze
npm install

# Copia file di sviluppo (importante!)
cp .env.development .env

# Avvia il server
npm run dev

# Output atteso:
# ✓ JWT_SECRET loaded from environment (length: 43 chars)
# Server running on port 5000
# ✓ MongoDB connected
```

### 4. Test Application
Apri il browser:
- Frontend: **http://localhost:3000**
- Backend health: **http://localhost:5000/api/health**
- Swagger docs (opzionale): **http://localhost:5000/api-docs**

---

## 🔧 Configuration Details

### Frontend (.env.local)
```env
# Backend API URL
NEXT_PUBLIC_RSI_API_URL=http://localhost:5000

# Development mode
NEXT_PUBLIC_DEV_MODE=true
```

L'app caricherà il file `.env.local` per il development locale.

### Backend (.env.development)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lse-members
REDIS_URL=redis://localhost:6379
RATE_LIMIT_DISABLED=true
JWT_SECRET=dev-jwt-secret-key-for-development
```

Disabilita automaticamente:
- ✅ Rate limiting
- ✅ Strict CORS checking
- ✅ Helmet security headers (partial)
- ✅ Input validation strictness

---

## Database Setup

### MongoDB

#### Opzione A: Docker Compose (Raccomandato)
```bash
# Avvia MongoDB con docker-compose
docker-compose up -d mongodb

# Connetti tramite CLI
mongosh --host localhost --port 27017 -u root -p rootpassword

# Creare database e collection
use lse-members
db.users.insertOne({ username: "test", email: "test@example.com" })
```

#### Opzione B: MongoDB Local Installation
Se preferisci MongoDB locale (senza Docker):
```bash
# Scarica da https://www.mongodb.com/try/download/community

# Avvia il servizio
mongod --dbpath /path/to/data/dir

# In .env.development, usa:
MONGODB_URI=mongodb://localhost:27017/lse-members
```

### Redis

#### Opzione A: Docker Compose
```bash
docker-compose up -d redis

# Test della connessione
redis-cli -h localhost -p 6379 ping
# Output: PONG
```

#### Opzione B: Redis Local Installation
```bash
# Scarica da https://redis.io/download

# Avvia il servizio
redis-server

# In .env.development, usa:
REDIS_URL=redis://localhost:6379
```

---

## 📝 Login & Testing

### Create Test User (Backend MongoDB)
```bash
mongosh --host localhost --port 27017 -u root -p rootpassword

use lse-members

# Inserisci un utente di test
db.users.insertOne({
  username: "testuser",
  email: "test@example.com",
  password: "$2a$10$...", // bcryptjs hash
  rsiVerified: true,
  organizationRank: 4
})
```

**OPPURE** usa il frontend per registrare un nuovo account:
1. Vai http://localhost:3000
2. Clicca "Register"
3. Crea account: `testuser` / `Password123`
4. Login

### Admin Panel Access
- L'utente deve avere `rsiVerified: true` e `organizationRank >= 4`
- In dev, puoi modificare direttamente nel MongoDB:

```bash
db.users.updateOne(
  { username: "testuser" },
  { $set: { rsiVerified: true, organizationRank: 4 } }
)
```

---

## 🛠️ Useful Commands

### Frontend
```bash
# Start dev server
npm run dev

# Build
npm run build

# Start production build
npm run start

# Type check
npm run typecheck
```

### Backend
```bash
# Start dev server (with auto-reload)
npm run dev

# Build TypeScript
npm run build

# Start production build
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Smoke test
npm run smoke

# Clear test members from DB
npm run clear-members
```

### Docker Services
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f mongodb
docker-compose logs -f redis

# Remove volumes (⚠️ deletes data)
docker-compose down -v

# Rebuild images
docker-compose up -d --build
```

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Soluzione:**
```bash
# Check if MongoDB is running
docker-compose ps

# Start MongoDB
docker-compose up -d mongodb

# Or if using local MongoDB
mongod --dbpath /path/to/data/dir
```

### Redis Connection Error
```
Error: Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Soluzione:**
```bash
# Check if Redis is running
docker-compose ps

# Start Redis
docker-compose up -d redis

# Or if using local Redis
redis-server
```

### JWT_SECRET Warning
```
⚠️  WARNING: JWT_SECRET is using default value "change_me_in_prod"
```
**Esperato in development!** Se vedi `✓ JWT_SECRET loaded` in production, il warning è solo una conferma di safety.

### Port Already in Use
```
Error: listen EADDRINUSE :::3000
```
**Soluzione:**
```bash
# Kill processo on port (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Kill processo on port (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Node_modules Issues
```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Local Machine                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend                Backend              Services      │
│  ──────────────         ──────────────       ──────────── │
│  http://3000/    ←→     http://5000/    ←→   MongoDB  │
│  (Next.js)              (Express)           Redis      │
│  - React                - Node.js                        │
│  - TailwindCSS          - TypeScript                     │
│  - API client           - JWT Auth                       │
│                         - Rate Limit (disabled)          │
│                         - CORS (open)                    │
│                         - Helmet (reduced)               │
│                                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Next Steps

1. **Frontend Development**: Check `src/` folder for React components
2. **Backend Development**: Check `backend/` folder for Express routes
3. **Database**: Inspect and modify data via MongoDB CLI or MongoDB Express
4. **Testing**: Run test suites with `npm test` in backend

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [JWT Authentication](https://jwt.io/introduction)

---

## ⚠️ Important Notes

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Rate Limiting | ❌ Disabled | ✅ Enabled |
| CORS | ✅ Open (*) | 🔒 Restricted |
| Helmet | ⚠️ Reduced | ✅ Full |
| JWT Secret | 🔓 Dev value | 🔐 Prod secret |
| Logging | 📣 Verbose | 📝 Normal |
| Debug Endpoints | ✅ Enabled | ❌ Disabled |

**When deploying to production, you MUST:**
1. Change `.env.development` to `.env.production`
2. Update `JWT_SECRET` with a secure random value
3. Update `MONGODB_URI` to production database
4. Update `CORS_ORIGIN` to your domain
5. Enable all security features (Helmet, rate limiting, etc)

### Security Disclaimer

⚠️ **This development configuration intentionally disables security features for ease of testing.**
- Rate limiting is disabled
- CORS is wide open
- JWT secret is publicly known
- Debug endpoints are enabled

**NEVER use these settings in production!**

---

## 🤝 Contributing

Se riscontri problemi o suggerimenti:
1. Check logs: `docker-compose logs`
2. Check backend logs: `npm run dev` output
3. Check browser console (F12)
4. Create issue with error message and reproduction steps

---

## 📝 License

Questo progetto è privato. Non distribuire le credenziali di database.
