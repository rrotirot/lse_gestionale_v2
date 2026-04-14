# Analisi vulnerabilità backend

## Panoramica
Questa analisi di vulnerabilità è stata condotta sul backend Node.js dell'applicazione LSE (Logistic Space Economy). L'obiettivo era identificare potenziali rischi di sicurezza nel codice, nelle configurazioni e nelle dipendenze.

**Data analisi**: 2025-11-13  
**Ultimo aggiornamento stato dipendenze**: 2026-04-14  
**Ambiente**: Backend Node.js con Express, MongoDB, JWT  
**Metodologia**: Revisione manuale del codice, controllo dipendenze, analisi configurazioni sicurezza

## Metodologia Utilizzata

### 1. Controllo dipendenze
- Eseguito `npm audit` per identificare vulnerabilità nelle dipendenze
- Applicato `npm audit fix` quando disponibile

### 2. Revisione Configurazioni Sicurezza
- Esaminato `server.js` per middleware di sicurezza (Helmet, CORS, Rate Limiting)
- Verificato configurazione MongoDB e connessioni esterne
- Controllato gestione segreti e variabili d'ambiente

### 3. Analisi Autenticazione e Autorizzazione
- Revisione meccanismi JWT e API key
- Controllo modello User per hashing password
- Verifica validazione input e sanitizzazione

### 4. Controllo Modelli Database
- Esaminati schemi Mongoose per prevenzione injection
- Verificato uso sicuro delle query MongoDB

### 5. Gestione Errori e Logging
- Controllato se errori leakano informazioni sensibili
- Verificato logging sicuro

## Risultati dell'Analisi

## Stato attuale (2026-04-14)

Al momento l’audit dipendenze backend risulta **pulito**:

- `cd backend && npm audit` → **0 vulnerabilità**

### 🟡 Vulnerabilità Medie (Medium Severity)

#### Configurazione CORS Permissiva
- **Problema**: CORS impostato su `*` (tutti gli origin accettati)
- **Rischio**: Permette richieste cross-origin da qualsiasi dominio
- **Contesto**: In produzione dovrebbe essere limitato a domini trusted
- **File**: `backend/server.js:188-193`
- **Risoluzione**: Impostare `CORS_ORIGIN` a URL specifici in produzione

#### Token JWT con Scadenza Lunga
- **Problema**: JWT scade dopo 7 giorni
- **Rischio**: Token compromessi rimangono validi per lungo tempo
- **Contesto**: Per dati sensibili, considerare scadenza 1-24 ore
- **File**: `backend/server.js:504`
- **Risoluzione**: Ridurre `expiresIn` o implementare refresh token

#### API Key Potenzialmente Esposta
- **Problema**: API_KEY caricata da variabili ambiente con fallback
- **Rischio**: Esposizione se env non protette correttamente
- **Contesto**: Usata per autenticazione bot Discord
- **File**: `backend/server.js:46`
- **Risoluzione**: Usare secrets manager in produzione

### 🟢 Sicurezza Implementata Correttamente

#### Autenticazione e Autorizzazione
- ✅ Password hashate con bcrypt (10 salt rounds)
- ✅ JWT per sessioni web con verifica token
- ✅ API key per bot con autenticazione duale
- ✅ Rate limiting su login (5 tentativi/15min) e registrazione (5/ora)
- ✅ Validazione input con express-validator (username, password)
- ✅ Regole password: min 6 caratteri, maiuscole/minuscole/numeri

#### Configurazioni di Sicurezza
- ✅ Helmet per header HTTP sicuri
- ✅ Rate limiting globale (100.000 richieste/15min)
- ✅ Rate limiting stretto per operazioni critiche (10/ora)
- ✅ Middleware connessione MongoDB con retry automatico

#### Sicurezza Database
- ✅ Mongoose previene injection MongoDB
- ✅ Schema validation lato server
- ✅ Query parametrizzate (es. `{ key: parseInt(key) }`)
- ✅ Connessione MongoDB sicura con timeout e retry

#### Gestione Errori
- ✅ Errori non leakano stack trace in produzione
- ✅ Messaggi errore controllati e sicuri
- ✅ Logging con Winston (request logger)

## Raccomandazioni di Sicurezza

## Raccomandazioni operative
1. Eseguire periodicamente:
   ```bash
   cd backend
   npm audit
   ```

2. **Configurare CORS restrittivo in produzione**
   ```javascript
   const corsOptions = {
       origin: process.env.CORS_ORIGIN || 'https://tuodominio.com',
       credentials: true
   };
   ```

### Priorità Media (Implementare entro 1-2 settimane)
3. **Ridurre scadenza JWT**
   ```javascript
   const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
   ```

4. **Implementare HTTPS obbligatorio**
   ```javascript
   // Aggiungere middleware per forzare HTTPS
   app.use((req, res, next) => {
       if (req.header('x-forwarded-proto') !== 'https') {
           res.redirect(`https://${req.header('host')}${req.url}`);
       } else {
           next();
       }
   });
   ```

5. **Timeout richieste esterne**
   - Nel backend è presente un helper con `AbortController` per gestire timeout sulle chiamate esterne (RSI).

### Priorità Bassa (Miglioramenti Futuri)
6. **Implementare 2FA per utenti admin**
7. **Aggiungere limitazione dimensione payload**
   ```javascript
   app.use(express.json({ limit: '10mb' }));
   ```
8. **Usare secrets manager (AWS Secrets Manager, etc.)**
9. **Implementare monitoraggio sicurezza (alert su tentativi falliti)**
10. **Aggiungere Content Security Policy headers**

## Conclusioni

Il backend presenta una **buona base di sicurezza** con implementazioni solide per autenticazione, rate limiting e prevenzione injection. Tuttavia, richiede attenzione immediata per:

- Aggiornamento dipendenze vulnerabili
- Configurazione CORS in produzione
- Gestione sicura dei segreti

**Punteggio sicurezza complessivo**: 7.5/10 (Buono, ma migliorabile)

**Stato raccomandato**: Pronto per produzione dopo fix critici, con monitoraggio continuo delle dipendenze e configurazioni.

## File esaminati (indicativi)
- `backend/server.ts`
- `backend/models/*`
- `backend/package.json` / `backend/package-lock.json`

## Strumenti Utilizzati
- npm audit - Controllo vulnerabilità dipendenze
- Lettura manuale codice - Revisione configurazioni
- Analisi statica - Controllo pattern sicurezza comuni