# 🔧 Development vs Production Configuration

This document explains the differences between development and production configurations in LSE Gestionale v2.

## Configuration Files

### Backend

| Environment | File | Purpose |
|------------|------|---------|
| **Development** | `.env.development` | Development mode with disabled security |
| **Production** | `.env` | Production mode with full security |

**How to use:**
```bash
# Development (local machine)
cp backend/.env.development backend/.env
npm run dev

# Production (server)
# Configure .env with production values
npm start
```

### Frontend

| Environment | File | Purpose |
|------------|------|---------|
| **Development** | `.env.local` | Local development (Next.js ignores in git) |
| **Production** | `.env.production.local` (optional) | Production build settings |

---

## Feature Comparison

### Security

| Feature | Development | Production |
|---------|-------------|------------|
| **Rate Limiting** | ❌ Disabled | ✅ Enabled (10 req/15min for login) |
| **Helmet** | ⚠️ Reduced | ✅ Full security headers |
| **CORS** | `*` (all origins) | 🔒 Restricted to domain |
| **HTTPS** | ❌ Not required | ✅ Required |
| **JWT Secret** | Public dev value | 🔐 Strong random secret |

### Logging

| Level | Development | Production |
|-------|-------------|------------|
| **Verbosity** | 📣 Debug mode on | 📝 Info/Error only |
| **Output** | Console + file | File only |
| **Debug Endpoints** | ✅ Enabled | ❌ Disabled |
| **Stack Traces** | ✅ Full | ⚠️ Minimal |

### Database

| Config | Development | Production |
|--------|-------------|------------|
| **MongoDB** | `localhost:27017` | MongoDB Atlas (remote) |
| **Redis** | `localhost:6379` | Redis Cloud (or managed) |
| **Connection Pool** | Small | Large |
| **Timeout** | Lenient | Strict |

### Features

| Feature | Development | Production |
|---------|-------------|------------|
| **Validation** | Lenient | Strict |
| **Caching** | Optional | Enabled |
| **Compression** | No | Yes |
| **API Versioning** | v1 only | Multiple versions |

---

## Environment Variables

### Development (.env.development)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lse-members
REDIS_URL=redis://localhost:6379
RATE_LIMIT_DISABLED=true
HELMET_DISABLED=false
CORS_ORIGIN=*
JWT_SECRET=dev-jwt-secret-key-for-development
DEBUG=lse:*
LOG_LEVEL=debug
ENABLE_DEBUG_ENDPOINTS=true
```

### Production (.env)
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/lse
REDIS_URL=redis://redis-prod:6379
RATE_LIMIT_DISABLED=false
HELMET_DISABLED=false
CORS_ORIGIN=https://app.example.com
JWT_SECRET=<strong-random-secret-from-vault>
DEBUG=
LOG_LEVEL=info
ENABLE_DEBUG_ENDPOINTS=false
```

---

## Startup Commands

### Development
```bash
# With auto-reload
npm run dev

# With debugging
DEBUG=lse:* npm run dev

# Both services (from root)
./dev-start.sh  # macOS/Linux
dev-start.bat   # Windows
```

### Production
```bash
# Build first
npm run build

# Start server
npm start

# With process manager (PM2)
pm2 start ecosystem.config.js
```

---

## Database Setup

### Development (Local)
```bash
# Start MongoDB locally
docker-compose up -d mongodb

# Or if using local installation
mongod --dbpath /path/to/data

# Connect
mongosh localhost:27017
```

### Production
```bash
# Use managed MongoDB Atlas
# Connection string in .env:
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/database
```

---

## Switching Modes

### To Development
```bash
cd backend
cp .env.development .env
npm install
npm run dev
```

### To Production
```bash
cd backend
# Edit .env with production values
vi .env
npm run build
NODE_ENV=production npm start
```

---

## Safety Checks

Before deploying to production:

1. **JWT_SECRET**
   ```bash
   # ✅ NOT this:
   JWT_SECRET=dev-jwt-secret-key-for-development
   
   # ✅ Use random secret:
   openssl rand -base64 32
   ```

2. **CORS_ORIGIN**
   ```bash
   # ✅ NOT this:
   CORS_ORIGIN=*
   
   # ✅ Use specific domain:
   CORS_ORIGIN=https://app.example.com
   ```

3. **Database**
   ```bash
   # ✅ NOT this:
   MONGODB_URI=mongodb://localhost:27017
   
   # ✅ Use Atlas or managed service:
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net
   ```

4. **Rate Limiting**
   ```bash
   # ✅ NOT this:
   RATE_LIMIT_DISABLED=true
   
   # ✅ Enable in production:
   RATE_LIMIT_DISABLED=false
   ```

---

## Monitoring Production

Check logs:
```bash
# Backend logs
tail -f backend/logs/app.log

# MongoDB
mongosh --eval "db.adminCommand('ping')"

# Redis
redis-cli ping

# Health endpoint
curl https://app.example.com/api/health
```

Monitor JWT tokens:
```bash
# Check token expiry in logs
grep "Token verification" backend/logs/app.log

# Long-lived tokens should be re-verified periodically
```

---

## Common Issues

### Development

**Rate limiting too strict:**
```env
RATE_LIMIT_DISABLED=true
```

**CORS errors:**
```env
CORS_ORIGIN=*
```

**JWT validation failing:**
```env
JWT_SECRET=dev-jwt-secret-key-for-development
```

### Production

**Can't connect to database:**
- Check `MONGODB_URI` format
- Verify IP whitelist in MongoDB Atlas
- Check credentials

**Rate limiting rejecting legitimate requests:**
- Increase limits in `backend/routes/auth.js`
- Use whitelist for trusted IPs

**CORS errors from frontend:**
- Add frontend domain to `CORS_ORIGIN`
- Use `https://` not `http://`

---

## Deployment Checklist

- [ ] Generate strong JWT_SECRET
- [ ] Update MONGODB_URI to production Atlas
- [ ] Set REDIS_URL to production Redis
- [ ] Set CORS_ORIGIN to frontend domain
- [ ] Disable rate limit disabled flag
- [ ] Enable helmet security
- [ ] Set NODE_ENV=production
- [ ] Disable debug endpoints
- [ ] Set LOG_LEVEL=info
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy for MongoDB
- [ ] Test health endpoint: `/api/health`
- [ ] Test authentication flow with real users
- [ ] Document all configuration in team wiki

---

## Questions?

Refer to:
- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Local development guide
- [QUICK_START.md](QUICK_START.md) - Quick start script
- [FIXJWT_PRODUCTION.md](FIXJWT_PRODUCTION.md) - JWT production configuration
