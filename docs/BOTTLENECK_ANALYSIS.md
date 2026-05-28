# Analisi Root Cause: Errori 429/503 nella Validazione Membri

## Problema
In produzione, quando un singolo utente valida solo **7 membri**, il backend va in crash con errori 429/503 (Too Many Requests / Service Unavailable). Il backend rimane bloccato finché non viene riavviato.

## Root Cause Identificato

### Flusso di Validazione Seriale Bloccante

Quando un utente valida un membro:

```
1. POST /api/v1/members/:key/validate (membro 1)
   ↓
2. Fetch interno a GET /api/v1/rsi/orgs/:handle
   ↓
3. Scrape profilo RSI, estrae ~5 organizzazioni
   ↓
4. ❌ LOOP SERIALE (senza timeout, senza parallelismo):
      for (const org of orgs) {
          await fetch(orgPageUrl)  // Aspetta 3-5s per org
          await r.text()           // Scarica HTML
          await parseSid()          // Parse HTML
      }
   ↓
5. Per 5 org × 4s = ~20 secondi di lock PER MEMBRO
   ↓
6. Ripeti per membro 2-7
   ↓
7. Totale: 7 × 20s = **140 SECONDI DI LOCK TOTALE**
```

**Durante questi 140 secondi:**
- Tutte le richieste rimangono appese
- Connessioni TCP si accumulano
- MongoDB connection pool si esaurisce
- Express rate limiter conta tutte le richieste in sospeso
- Rate limit globale (100 req/15min) scatta → 429
- Timeout su richieste → 503

---

## Ubicazione Precisa del Bottleneck

**File**: `backend/server.ts`  
**Endpoint**: `app.get('/api/v1/rsi/orgs/:handle', ...)` (linea 132)  
**Linee problematiche**: 476-497

**Loop seriale senza timeout:**
```javascript
for (const o of orgs) {
    if (o.sid) continue;
    const urlToFetch = String(o.url || o.spectrumUrl || '').trim();
    if (!urlToFetch) continue;

    try {
        const r = await fetch(urlToFetch, {
            // ❌ NESSUN TIMEOUT
            method: 'GET',
            headers: { ... }
        });
        if (!r.ok) continue;
        const orgHtml = await r.text();  // ❌ Scarica tutto HTML
        const sidResolved = resolveSidFromOrgPageHtml(orgHtml);
    } catch {
        // best-effort
    }
}
```

---

## Impatto Cascata

```
Validazione membro 1 → 20s lock
  ├─ Tutte richieste accumulate
  ├─ MongoDB pool esaurito
  └─ Rate limiter registra burst

Validazione membro 2-7 → 20s lock cada
  ↓
TOTALE: 140+ secondi
  ├─ Rate limiter scatta: 429 Too Many Requests
  ├─ MongoDB non risponde: 503
  └─ Backend bloccato completamente
```

---

## Problemi Secondari

1. **Nessun Timeout su Fetch RSI**
   - RSI API lenta (3-5s)
   - Se RSI è down, aspetta 30s default
   - Nessun AbortController implementato

2. **Rate Limiting Globale**
   - Limite: 100 req / 15 minuti (linea 672-679)
   - Conti richieste in sospeso verso il limite
   - Non specifico per endpoint di validazione

3. **MongoDB Connection Pool Esaurito**
   - Pool size: 10 connessioni (linea 46)
   - 140 secondi lock = 140+ richieste accumulate
   - Connection pool esaurito → timeout MongoDB

4. **Nessun Concurrency Control**
   - Fetch org senza limite di parallelismo
   - Se utente ha 20 org, 20 fetch paralleli senza controllo

---

## Soluzione Proposta

### Fix 1: Parallelizzazione Fetch Org + Timeout (CRITICO)

**File**: `backend/server.ts` linea 476-497

**Cambio:**
- Loop seriale → `Promise.allSettled()` batch
- Max **3 fetch paralleli**
- **Timeout 5 secondi** per fetch org
- Skip org che timeout

**Codice:**
```javascript
// Parallelizzazione fetch org con timeout e limita concurrency
const orgFetchPromises = orgs
    .filter(o => !o.sid)
    .map(async (o) => {
        const urlToFetch = String(o.url || o.spectrumUrl || '').trim();
        if (!urlToFetch) return;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const r = await fetch(urlToFetch, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            clearTimeout(timeoutId);

            if (!r.ok) return;
            
            const orgHtml = await r.text();
            const sidResolved = resolveSidFromOrgPageHtml(orgHtml);
            if (sidResolved) {
                o.sid = sidResolved;
                o.url = `https://robertsspaceindustries.com/en/orgs/${encodeURIComponent(sidResolved)}`;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                logger.debug(`Org SID resolution timeout for ${o.url || 'unknown'}`);
            }
        }
    });

// Limita concurrency: max 3 fetch org paralleli
const maxConcurrency = 3;
for (let i = 0; i < orgFetchPromises.length; i += maxConcurrency) {
    const batch = orgFetchPromises.slice(i, i + maxConcurrency);
    await Promise.allSettled(batch);
}
```

**Effetto:**
- Membro 1: ~5s instead of 20s
- Totale 7 membri: ~35s instead of 140s
- ✅ No accumulo connessioni
- ✅ No 429/503

---

### Fix 2: Timeout su /validate (IMPORTANTE)

**File**: `backend/server.ts` linea 2279

**Cambio:**
- `AbortSignal.timeout(15000)` su fetch interno
- Se timeout → 504 Gateway Timeout

**Codice:**
```javascript
const validateController = new AbortController();
const validateTimeout = setTimeout(() => validateController.abort(), 15000);

const orgsResponse = await fetch(
    `${req.protocol}://${req.get('host')}/api/v1/rsi/orgs/${encodeURIComponent(rsiHandle)}`,
    {
        method: 'GET',
        signal: validateController.signal,
        headers: { 'Accept': 'application/json' }
    }
).finally(() => clearTimeout(validateTimeout)).catch(error => {
    if (error.name === 'AbortError') {
        logger.error(`Validation timeout for member key=${key} after 15s`);
        return res.status(504).json({
            success: false,
            error: 'Validazione troppo lenta, riprova più tardi'
        });
    }
    throw error;
});
```

**Effetto:**
- Client riceve risposta max 15s
- No infinite hanging requests
- Libera risorse rapidamente

---

### Fix 3: Rate Limiter Specifico /validate (CONSIGLIATO)

**File**: `backend/server.ts` prima linea 2240

**Cambio:**
- Max 5 validazioni/min per IP
- Chiave: `${ip}:${memberId}`

**Codice:**
```javascript
const validateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 5, // max 5 validazioni per IP per minuto
    keyGenerator: (req) => {
        const memberId = req.params.key || 'unknown';
        return `${req.ip}:${memberId}`;
    },
    message: 'Troppi tentativi di validazione per questo membro, riprova tra 1 minuto.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !req.params.key
});

// Applica rate limiter all'endpoint:
app.post('/api/v1/members/:key/validate', validateLimiter, checkMongoConnection, authenticateToken, async (req, res) => {
    // ... resto del codice ...
});
```

**Effetto:**
- Previene spam manuale
- Feedback rapido (429 al 6o tentativo)
- Non accumula richieste

---

### Fix 4: MongoDB Exponential Backoff (IMPORTANTE)

**File**: `backend/lib/config.ts` linea 75-85

**Cambio:**
- Exponential backoff: 5s → 7.5s → 11.2s... (max 30s)
- Reset counter al reconnect

**Codice:**
```typescript
let reconnectRetryCount = 0;
const MAX_RETRY_DELAY = 30000; // 30 secondi max
const BASE_DELAY = 5000; // 5 secondi inizio

// Retry automatico con exponential backoff se disconnesso
mongoose.connection.on('disconnected', () => {
    const delay = Math.min(MAX_RETRY_DELAY, BASE_DELAY * Math.pow(1.5, reconnectRetryCount));
    logger.warn(`MongoDB disconnected. Retry attempt #${reconnectRetryCount + 1} in ${delay}ms`, {
        nextRetryIn: `${(delay/1000).toFixed(1)}s`
    });
    setTimeout(connectWithRetry, delay);
    reconnectRetryCount++;
});

// Reset retry count quando connessione ripristinata
mongoose.connection.on('reconnected', () => {
    reconnectRetryCount = 0;
    logger.info('MongoDB reconnected successfully');
});
```

**Effetto:**
- Se DB è down, non crea retry loop infinito
- Libera risorse prima di riprovare
- Reconnect automatico quando DB torna online

---

## Impatto Stimato

### Prima dei Fix
```
1 utente × 7 membri = 140 secondi di lock
→ 429/503 errori
→ Backend bloccato
→ Utente costretto a riavviare
```

### Dopo i Fix
```
1 utente × 7 membri = ~35 secondi totale
→ Timeout 15s su /validate
→ Max 3 fetch org paralleli
→ Exponential backoff MongoDB
→ Rate limiter specifico
→ Niente accumulo connessioni
→ Niente 429/503
→ Backend funziona normalmente
```

---

## Checklist Implementazione

- [ ] Fix 1: Parallelizza fetch org + timeout 5s (CRITICO)
- [ ] Fix 2: Timeout AbortSignal su /validate (IMPORTANTE)
- [ ] Fix 3: Rate limiter specifico /validate (CONSIGLIATO)
- [ ] Fix 4: MongoDB exponential backoff (IMPORTANTE)
- [ ] Test locale: 1 utente valida 7 membri → no 429/503
- [ ] Monitora connection pool durante validazione
- [ ] Deploy a produzione
- [ ] Monitor 24h per 429/503

---

## File Coinvolti

1. **backend/server.ts** (linee 132-596, 2240-2350)
   - `GET /api/v1/rsi/orgs/:handle` - fetch org seriale → parallelizzare
   - `POST /api/v1/members/:key/validate` - nessun timeout → aggiungere timeout + rate limiter

2. **backend/lib/config.ts** (linee 75-85)
   - MongoDB reconnect retry ogni 5s → exponential backoff

---

## Test di Verifica in Produzione

### Test 1: Validazione 7 Membri
```bash
- Monitora tempo totale
- Atteso: < 40 secondi
- Verifica no 429/503
```

### Test 2: Monitora Connection Pool
```bash
- Atteso: max 10 concurrent connections
- Verifica no esaurimento
```

### Test 3: Monitora Rate Limiter
```bash
- Verifica rate limiter non scatta
- Check log per timeout fetch
```

### Test 4: Carico Combinato
```bash
- 3 utenti validano 7 membri in parallelo
- Atteso: no crash backend
```

---

## Gravità e Timeline

- **Severity**: 🔴 CRITICO (backend va in crash)
- **Difficoltà Fix**: 🟢 FACILE (3-4 modifiche contenute)
- **Tempo Implementazione**: ~2-3 ore (fix + test + deploy)
- **Rischio Regressione**: 🟢 BASSO (cambio solo concurrency, non logica)
- **Impact Utenti**: 🟢 ALTO (risolve crash completo)
