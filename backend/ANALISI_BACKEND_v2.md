# Analisi Backend — RSI API Proxy

Data: 2025-11-13

Questo documento sintetizza l'analisi del backend presente nella cartella `backend/` del progetto `gentionale-lse`.

## Panoramica
- Tipo: Node.js + Express (CommonJS)
- Scopo: proxy per API RSI di Star Citizen, gestione membri/eventi e integrazione con bot Discord/webhook
- Persistenza: MongoDB tramite `mongoose`

## Dipendenze principali
- `express`, `cors` — server HTTP e CORS
- `mongoose` — ORM per MongoDB
- `dotenv` — gestione variabili d'ambiente
- `bcryptjs` — hashing password
- `jsonwebtoken` — JWT per autenticazione
- `node-fetch`, `cheerio` — chiamate HTTP e parsing HTML (proxy RSI)
- `helmet` — security headers ✅
- `express-rate-limit` — rate limiting ✅
- `express-validator` — input validation ✅
- `winston` — structured logging ✅
- `jest`, `supertest` — testing framework ✅

## Configurazione e avvio
- File di configurazione atteso: `backend/.env` (contiene `MONGODB_URI`, `PORT`, `JWT_SECRET`, `API_KEY`, ecc.).
- Script principali (`backend/package.json`):
  - `start`: `node server.js`
  - `dev`: `nodemon server.js` (auto-reload in sviluppo)
  - `import-events`: `node import-bot-events.js`
  - `smoke`: `node tests/smoke.test.js` (health check test)
  - `test`: `jest --coverage` (unit tests)
  - `test:watch`: `jest --watch` (watch mode)

Comandi di avvio (PowerShell):
```
cd backend
npm install
npm start
```

## Modelli (schemi Mongoose)
- `User`:
  - Username unico, password hashata (`bcryptjs`), campi per verifica RSI (handle, avatar, flags)
- `Member`:
  - `key`, `name`, `id`, `tag`, `idoneita`, `affiliazioniOrg`, `orgValidation` (oggetto con dettagli), indici su `name/id` e `tag/idoneita`
- `DeletedMember`:
  - Stessi campi di `Member` più `deletedAt`, `deletedBy`, `deletionReasons`
- `Event`:
  - Titolo, data, orari, tipologia, indici su `date` e `createdAt`

## Endpoint chiave (mappatura)
- `GET /api/health` — health-check
- `POST /api/auth/register` — registrazione utente (validato + rate-limited)
- `POST /api/auth/login` — login (genera JWT, rate-limited)
- `GET /api/members` — recupera membri
- `POST /api/members` — salva/aggiorna membri
- `PUT /api/members/:key` — aggiorna singolo membro
- `DELETE /api/members/:key` — elimina membro (protetto da JWT, rate-limited)
- `PUT /api/members/:key/reset-validation` & `PUT /api/members/reset-validation/all` — reset validation
- `GET /api/rsi/orgs/:handle` — proxy per recuperare affiliazioni org RSI

Autenticazione e middleware:
- `authenticateToken` — verifica JWT
- `authenticateAPI` — supporta API Key (`X-API-Key` o header Authorization form `ApiKey`) e Bearer JWT (per bot/servizi)
- `helmet` — security headers ✅
- `requestLogger` — winston logging di tutte le richieste HTTP ✅

## Sicurezza implementata ✅
- ✅ `JWT_SECRET` obbligatorio in produzione (exit(1) se mancante)
- ✅ CORS configurabile (limitare a URL specifici in produzione)
- ✅ Rate limiting globale (100 req/15min)
- ✅ Rate limiting login (5 tentativi/15min)
- ✅ Rate limiting registrazione (5 registrazioni/60min)
- ✅ Rate limiting DELETE (10 operazioni/60min)
- ✅ Validazione password forte (maiuscole + minuscole + numeri)
- ✅ Validazione username (3-30 char, alfanumerici + trattini/underscore)
- ✅ Helmet security headers
- ✅ Winston structured logging

## Miglioramenti a medio termine
- Considerare protezioni antibrute-force avanzate per login
- Rotazione delle API keys e gestione segreti con Vault/Secrets Manager in produzione
- Implementare API versioning (es. `/api/v1/`)
- Aggiungere API documentation (Swagger/OpenAPI)

## Roadmap implementazione (priorità)

### Fase 1: Hardening di sicurezza (Quick Wins - 1-2 settimane) ✅ **COMPLETATA**
- [x] **Task 1.1**: Aggiungere `helmet` e `express-rate-limit` alle dipendenze ✅
- [x] **Task 1.2**: Integrare `helmet` e rate-limiting nel middleware di `server.js` ✅
- [x] **Task 1.3**: Aggiungere validazione input su login e registrazione ✅
- [x] **Task 1.4**: Rendere `JWT_SECRET` obbligatorio in produzione ✅
- [x] **Task 1.5**: Aggiungere `.env.example` al repo ✅

**Risultato Fase 1**: API hardened con validazione rigorosa, rate-limiting, CORS, helmet e controlli produzione ✅

### Fase 2: Logging e Monitoring (1-2 settimane) ✅ **COMPLETATA**
- [x] **Task 2.1**: Aggiungere `winston` per logging strutturato ✅
  - File: `backend/lib/logger.js` con transports console + file
  - Rotazione automatica: maxsize 5MB, maxFiles 5
- [x] **Task 2.2**: Integrare logging nei middleware critici ✅
  - Middleware `requestLogger` che loga metodo, URL, statusCode, duration, IP
  - Log level: info per successi, warn per errori 4xx, error per 5xx

**Risultato Fase 2**: Logging strutturato con Winston, file rotation e HTTP request tracking ✅

### Fase 3: Test e CI/CD (2-3 settimane) ✅ **COMPLETATA**
- [x] **Task 3.1**: Aggiungere script `smoke` e `test` in `backend/package.json` ✅
  - Script `smoke`: `npm run smoke` → `tests/smoke.test.js`
  - Script `test`: `npm test` → `jest --coverage`
  - Script `test:watch`: `npm run test:watch` per sviluppo
  - Smoke Test Result: 2/2 test passati ✅
    - `GET /api/health` → 200 OK ✅
    - `GET /` → 200 OK ✅

- [x] **Task 3.2**: Aggiungere test unitari per modelli e utilità ✅
  - Framework: `jest` (config in `jest.config.js`)
  - File test: `tests/models.test.js` (User, Member schema validation)
  - Dipendenze: `jest`, `supertest`
  - Coverage: modelli schema e validazioni

- [x] **Task 3.3**: Aggiungere GitHub Actions per smoke-test e build check ✅
  - File: `.github/workflows/backend-test.yml`
  - Trigger: on push/PR a `backend/**` su branch main/develop/prova-integrazione
  - Jobs: test (Node 16/18/20), lint (npm audit), smoke-production
  - Comandi: `npm install`, `npm run smoke`, `npm test`

**Risultato Fase 3**: Test framework integrato, smoke test funzionante, CI/CD pipeline con GitHub Actions ✅

### Fase 4: Deployment e Secrets Management (2-3 settimane) ✅ **COMPLETATA**
- [x] **Task 4.2**: Aggiornare `.env.example` e aggiungere validazione env in avvio ✅
  - Aggiunto `validateRequiredEnv()` in `server.js` che fa fail-fast in `NODE_ENV=production`
  - Creato `backend/.env.production.example` con variabili consigliate per la produzione ✅
  - Impatto: avvio sicuro in produzione, errori di configurazione terminano l'app (fail-fast)
  
- [x] **Task 4.3**: Documentare gestione segreti e GitHub Secrets ✅
  - Creato `backend/SECRETS.md` con istruzioni per GitHub Secrets
  - Workflow CI aggiornato per usare `secrets.JWT_SECRET` e `secrets.API_KEY`
  - Impatto: CI/CD sicuro, no segreti nel repo
  
- [x] **Task 4.4**: Aggiungere script npm per build/avvio ✅
  - Script di build/avvio standard

**Risultato Fase 4**: Hardening + configurazione env + documentazione base ✅

### Fase 5: Miglioramenti avanzati (medio termine) 🔄 **QUASI COMPLETATA**

### Fase 5: Miglioramenti avanzati (medio termine) 🔄 **QUASI COMPLETATA**
- [x] **Task 5.1**: Aggiungere Redis cache per RSI org queries ✅
  - Creato `backend/lib/cache.js` con client Redis e graceful fallback
  - Redis supportato via `REDIS_URL` (opzionale; fallback se non configurato)
  - Cache su endpoint `GET /api/rsi/orgs/:handle` (TTL: 24h)
  - Aggiunto `redis` package.json e `REDIS_URL` env var
  - Impatto: riduce carico RSI scraper, migliora response time

- [x] **Task 5.2**: Implementare API versioning (`/api/v1/`) ✅
  - Creato `backend/lib/versioning.js` con middleware di versioning
  - Setup automatico: tutti gli endpoint `/api/v1/*` supportati
  - Backward-compatibility: vecchi endpoint `/api/*` redirigono a `/api/v1/*` con deprecation header
  - Aggiornati principali endpoint: health, auth, members, events, rsi/orgs
  - Response include `_apiVersion` header
  - Impatto: evoluzione API senza breaking changes

- [x] **Task 5.3**: Aggiungere Swagger/OpenAPI documentation ✅
   - Creato `backend/lib/swagger.js` con configurazione OpenAPI 3.0
   - Integrato swagger-ui-express e swagger-jsdoc in `server.js`
   - Endpoint `/api/docs` con documentazione interattiva
   - Schema definiti per User, Member, Event, ErrorResponse
   - Sicurezza Bearer JWT configurata
   - Impatto: API autodocumentata e testabile via browser

- [ ] **Task 5.4**: Configurare MongoDB backup automatico 🔄 **POSTICIPATO**
   - Priorità bassa: MongoDB Atlas già offre backup automatici
   - Setup backup a S3/storage remoto (per deployment self-hosted)
   - Schedule cronjob giornaliero con `mongodump`
   - Impatto: disaster recovery e compliance
   - Nota: Per produzione si raccomanda MongoDB Atlas con backup automatici inclusi

- [ ] **Task 5.5**: Aggiungere monitoring (Prometheus/health metrics) 🔄 **FUTURO**
   - Priorità bassa: Winston logging già fornisce observability base
   - Endpoint `/api/metrics` con metriche Prometheus
   - Request count, latency, cache hit rate, error rates
   - Dipendenze: `prom-client`
   - Impatto: observability avanzata per produzione
   - Nota: Implementare quando necessario per scaling orizzontale

---

## Timeline suggerito (allineato a progetto)

**Stato attuale frontend**: FASE 6-7 (ristrutturazione completata, testing in corso)
**Stato attuale backend**: FASE 1-4 completate, FASE 5 in corso

### Roadmap backend
- ✅ **Settimana 1 (COMPLETATA)**: Fase 1 (hardening quick wins)
- ✅ **Settimana 2 (COMPLETATA)**: Fase 2 (logging strutturato)
- ✅ **Settimane 3 (COMPLETATA)**: Fase 3 (test + CI/CD)
- ✅ **Settimana 4 (COMPLETATA)**: Fase 4 (secrets + deployment guide)
- 🔄 **Fase 5 (IN CORSO)**: Miglioramenti avanzati (Redis cache ✅, versioning API ✅, Swagger ✅, backup 🔄, monitoring 🔄)
