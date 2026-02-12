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

## Configurazione e avvio
- File di configurazione atteso: `backend/.env` (contiene `MONGODB_URI`, `PORT`, `JWT_SECRET`, `API_KEY`, ecc.).
- Script principali (`backend/package.json`):
  - `start`: `node server.js`
  - `dev`: `node server.js` (attualmente non usa `nodemon` nella versione in repo)
  - `import-events`: `node import-bot-events.js`

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
- `POST /api/auth/register` — registrazione utente
- `POST /api/auth/login` — login (genera JWT)
- `GET /api/members` — recupera membri
- `POST /api/members` — salva/aggiorna membri
- `PUT /api/members/:key` — aggiorna singolo membro
- `DELETE /api/members/:key` — elimina membro (protetto da JWT)
- `PUT /api/members/:key/reset-validation` & `PUT /api/members/reset-validation/all` — reset validation
- `GET /api/rsi/orgs/:handle` — proxy per recuperare affiliazioni org RSI

Autenticazione e middleware:
- `authenticateToken` — verifica JWT
- `authenticateAPI` — supporta API Key (`X-API-Key` o header Authorization form `ApiKey`) e Bearer JWT (per bot/servizi)

## Osservazioni di sicurezza e rischi
- `JWT_SECRET` ha fallback nel codice: rischio se non impostato in produzione — deve essere obbligatorio.
- `app.use(cors())` senza restrizioni lascia l'API esposta a tutti gli origin.
- Mancanza di rate-limiting (es. login, endpoint sensibili) e di `helmet` per header di sicurezza.
- Nessuna validazione strutturata degli input (es. `express-validator` o `Joi`) — rischio di dati non validi o NoSQL injection.
- Logging su console: utile in sviluppo ma non adatto a produzione (usare `winston`/`pino`).
- Mancanza di test automatici e CI per smoke-tests.

## Raccomandazioni prioritarie (quick wins)
1. Fallire l'avvio in `production` se `JWT_SECRET` o altre variabili critiche non sono impostate.
2. Limitare CORS in produzione (configurare whitelist degli origin consentiti).
3. Aggiungere `helmet` e `express-rate-limit` (almeno per login e endpoint critici).
4. Implementare validazione input su tutti gli endpoint che scrivono su DB (`express-validator` o `Joi`).
5. Introdurre logging strutturato (`winston`/`pino`) e non loggare segreti.
6. Aggiungere `backend/.env.example` e assicurarsi che `.env` sia ignorato dal VCS (`.gitignore`).
7. Aggiungere uno script di smoke-test (es. `npm run smoke`) che esegua una richiesta a `/api/health`.

## Miglioramenti a medio termine
- Introdurre test automatici e GitHub Actions per smoke-tests (build frontend + health-check backend).
- Considerare protezioni antibrute-force per login e endpoint di import.
- Valutare deployment con Docker + `docker-compose` (incluso MongoDB per dev).
- Rotazione delle API keys e gestione segreti con Vault/Secrets Manager in produzione.

## Roadmap implementazione (priorità)

### Fase 1: Hardening di sicurezza (Quick Wins - 1-2 settimane) ✅ **COMPLETATA**
- [x] **Task 1.1**: Aggiungere `helmet` e `express-rate-limit` alle dipendenze ✅
  - File: `backend/package.json`
  - Dipendenze: `helmet`, `express-rate-limit`, `express-validator`
  - Impatto: ↓ vulnerabilità header, protezione brute-force su login
  
- [x] **Task 1.2**: Integrare `helmet` e rate-limiting nel middleware di `server.js` ✅
  - Implementato: `helmet()`, CORS configurabile, rate limiting globale + specifico
  - Proteggere: login (5/15min), registrazione (5/60min), DELETE (10/60min)
  - Impatto: protezione da DoS e brute-force attivo
  
- [x] **Task 1.3**: Aggiungere validazione input su login e registrazione ✅
  - Implementato: `express-validator` con regole rigorose
  - Password: min 6 caratteri, maiuscole + minuscole + numeri obbligatorie
  - Username: 3-30 caratteri, alfanumerici + trattini/underscore
  - Impatto: ↓ rischio NoSQL injection, protezione brute-force password deboli
  
- [x] **Task 1.4**: Rendere `JWT_SECRET` obbligatorio in produzione ✅
  - Implementato: controllo all'avvio con exit(1) se mancante in `NODE_ENV=production`
  - Messaggio esplicito: "ERRORE: Variabili d'ambiente critiche mancanti in PRODUZIONE"
  - Impatto: nessun fallback di default in produzione
  
- [x] **Task 1.5**: Aggiungere `.env.example` al repo ✅
  - File: `backend/.env.example` (template di configurazione con NOTE)
  - Contenuto: `MONGODB_URI`, `PORT`, `JWT_SECRET`, `API_KEY`, `DISCORD_WEBHOOK_URL`, `CORS_ORIGIN`
  - Impatto: chiarezza e best-practices di sicurezza

**Risultato Fase 1**: API hardened con validazione rigorosa, rate-limiting, CORS, helmet e controlli produzione ✅

### Fase 2: Logging e Monitoring (1-2 settimane) ✅ **COMPLETATA**
- [x] **Task 2.1**: Aggiungere `winston` per logging strutturato ✅
  - Dipendenza: `npm install winston` ✅
  - File: `backend/lib/logger.js` (configurazione) ✅
  - Transports: console (real-time) + file (error.log, combined.log) ✅
  - Rotazione automatica: maxsize 5MB, maxFiles 5 ✅
  - Impatto: logging strutturato e persistente
  
- [x] **Task 2.2**: Integrare logging nei middleware critici ✅
  - Middleware: `requestLogger` che loga metodo, URL, statusCode, duration, IP ✅
  - Log level: info per successi, warn per errori 4xx, error per 5xx ✅
  - Debug mode: log dettagliati se `NODE_ENV=development` ✅
  - Impatto: visibility completa su richieste e errori

**Risultato Fase 2**: Logging strutturato con Winston, file rotation e HTTP request tracking ✅

### Fase 3: Test e CI/CD (2-3 settimane) 🔄 **PROSSIMA**
- [ ] **Task 3.1**: Aggiungere script `smoke` e `test` in `backend/package.json`
  - Script `smoke`: `npm run smoke` che chiama `GET /api/health`
  - Script `test`: esegue test base con `jest` o `mocha`
  - Impatto: validazione rapida pre-commit
  
- [ ] **Task 3.2**: Aggiungere test unitari per modelli e utilità
  - Framework: `jest` o `mocha`
  - Coverage: modelli (User, Member), funzioni di validazione RSI
  - Impatto: qualità e refactoring sicuro
  
- [ ] **Task 3.3**: Aggiungere GitHub Actions per smoke-test e build check
  - File: `.github/workflows/backend-test.yml`
  - Trigger: on push/PR a `backend/**`
  - Comandi: `npm install`, `npm run smoke`, `npm run lint` (se linter configurato)
  - Impatto: PRs non possono mergiare se smoke-test fallisce

### Fase 4: Deployment e Secrets Management (2-3 settimane)
- [ ] **Task 4.1**: Aggiungere `Dockerfile` e `docker-compose.yml` per backend
  - Dockerfile: Node 18+, installa dipendenze, espone porta 5000
  - docker-compose: backend + MongoDB (per dev/test)
  - Impatto: deployment replicabile e consistent
  
- [ ] **Task 4.2**: Configurare secrets su GitHub (se usar Actions)
  - Segreti: `MONGODB_URI`, `JWT_SECRET`, `API_KEY` (per staging/production)
  - Impatto: non committare segreti nel repo
  
- [ ] **Task 4.3**: Aggiungere `.env.production` e logica per caricamento env
  - Validazione all'avvio: tutte le variabili critiche presenti
  - Impatto: fail-fast se config incompleta

### Fase 5: Miglioramenti avanzati (medio termine)
- [ ] **Task 5.1**: Implementare backup automatico MongoDB
  - Script: `npm run backup` (backup locale o cloud)
  - Impatto: disaster recovery
  
- [ ] **Task 5.2**: Aggiungere cache (Redis) per RSI org queries
  - Dipendenza: `redis` (client)
  - Impatto: ↓ latenza query RSI ripetute
  
- [ ] **Task 5.3**: Implementare API versioning (es. `/api/v1/`)
  - Impatto: retrocompatibilità durante evoluzioni
  
- [ ] **Task 5.4**: Aggiungere API documentation (Swagger/OpenAPI)
  - Tool: `swagger-jsdoc` + `swagger-ui-express`
  - Impatto: clarity e autodoc per frontend/bot

---

## Timeline suggerito (allineato a progetto)

**Stato attuale frontend**: FASE 6-7 (ristrutturazione completata, testing in corso)
**Stato attuale backend**: FASE 1-2 completate, FASE 3 prossima

### Roadmap backend integrata
- ✅ **Settimana 1 (COMPLETATA)**: Fase 1 (hardening quick wins) — **FATTO**
  - Aggiunto `helmet`, `express-rate-limit`, `express-validator`
  - Rendere `JWT_SECRET` obbligatorio in prod — FATTO
  - Aggiunto `.env.example` — FATTO
  - Impatto: API pronta per staging/test con frontend
  
- ✅ **Settimana 2 (COMPLETATA)**: Fase 2 (logging strutturato) — **FATTO**
  - Integrato `winston` per logging strutturato
  - Aggiunto middleware di logging HTTP
  - Impatto: visibility in produzione — FATTO
  
- 🔄 **Settimane 3-4 (PROSSIME)**: Fase 3 (test + CI/CD)
  - Smoke-test e GitHub Actions
  - Impatto: qualità assurance
  
- **Settimana 5 (PIANIFICATA)**: Fase 4 (Docker + secrets)
  - Dockerfile, docker-compose, secrets management
  - Impatto: deployment scalabile e replicabile
  
- **Dopo settimana 5 (ITERATIVO)**: Fase 5 (ottimizzazioni)
  - Cache, API versioning, Swagger docs
  - Impatto: API maturity
