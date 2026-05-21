# Sviluppo Bot Discord - Guida Step by Step

## Obiettivo

Questa guida descrive tutti i passaggi per sviluppare un bot Discord integrato con il backend del gestionale LSE, con sincronizzazione membri e base pronta per sincronizzazione eventi.

## Prerequisiti

- Node.js installato (consigliato versione LTS).
- MongoDB raggiungibile dal backend.
- Applicazione Discord creata nel [Discord Developer Portal](https://discord.com/developers/applications).
- Bot invitato nella guild con permessi adeguati.
- Intent `Server Members Intent` abilitato nel pannello bot Discord.

## 1) Preparazione ambiente backend

1. Posizionati nella cartella backend:
   - `cd backend`
2. Installa dipendenze:
   - `npm install`
3. Crea o aggiorna `backend/.env` con:
   - `MONGODB_URI=...`
   - `DISCORD_BOT_TOKEN=...`
   - `DISCORD_GUILD_ID=...`
   - `DISCORD_SYNC_DEFAULT_TAG=LSE-P` (opzionale)
   - `DISCORD_SYNC_NAME_SOURCE=username` (opzionale: `username` o `displayName`)
   - `API_KEY=...` (opzionale, utile per endpoint sync API)

## 2) Correzioni tecniche iniziali (obbligatorie)

Prima di procedere con nuove feature, sistemare i blocchi runtime:

1. Verificare import in `backend/scripts/discord-bot.js`:
   - i path verso `lib` e `models` devono essere relativi alla cartella `scripts`.
2. Verificare logger in `backend/lib/discordMemberSync.js`:
   - il file usa `logger.ts`; garantire import compatibile in runtime Node per script JS.
3. Rieseguire script e confermare che partano senza `MODULE_NOT_FOUND`.

## 3) Architettura consigliata

Tenere separati i ruoli:

- `backend/lib/discordMemberSync.js`: logica di sync (servizio).
- `backend/scripts/sync-discord-members.js`: entrypoint CLI.
- `backend/scripts/discord-bot.js`: eventuali azioni bot live (kick, comandi, ecc.).

Regola: la logica di business deve stare in `lib`, non dentro gli script.

## 4) Implementazione sync membri

### 4.1 Lettura membri Discord

1. Login bot con `discord.js`.
2. Fetch guild tramite `DISCORD_GUILD_ID`.
3. `guild.members.fetch()` per ottenere membri.
4. Escludere account bot (`member.user.bot`).

### 4.2 Normalizzazione dati

Per ogni membro Discord mappare campi principali su modello `Member`:

- `id` <- Discord user id
- `name` <- `username` o `displayName`
- `date` <- data join `YYYY-MM-DD`
- `tag` <- default (`LSE-P` o env)

### 4.3 Upsert idempotente su MongoDB

1. Recuperare membri esistenti per `id`.
2. Distinguere:
   - `added`: non presenti su DB
   - `updated`: presenti ma con dati cambiati
   - `unchanged`: presenti e invariati
3. Usare `bulkWrite` con `upsert: true`.
4. Non sovrascrivere campi business sensibili senza regola esplicita (`note`, `richiami`, `idoneita`).

### 4.4 Report finale

Restituire sempre un report JSON con:

- `success`
- `readFromDiscord`
- `skippedBots`
- `added`
- `updated`
- `unchanged`
- `errors`
- `elapsedMs`

## 5) Script CLI operativi

Comandi previsti in `backend/package.json`:

- `npm run discord:sync` -> sync reale
- `npm run discord:sync:dry` -> dry-run (nessuna scrittura)

Flusso consigliato:

1. Eseguire dry-run.
2. Verificare report e numeri.
3. Eseguire sync reale.
4. Verificare dati su DB.

## 6) Hardening e affidabilita

1. Timeout di connessione Discord (es. 15s).
2. Retry limitato su errori transient.
3. Log strutturati con contesto (senza token o segreti).
4. Lock anti-concorrenza per evitare doppia sync in parallelo.

## 7) Endpoint API sync (opzionale ma consigliato)

Se vuoi sync bidirezionale bot <-> gestionale:

1. Ripristinare/implementare endpoint in `backend/server.ts`:
   - `GET /api/sync/test`
   - `GET /api/sync/members`
   - `POST /api/sync/members`
   - `GET /api/sync/events`
   - `POST /api/sync/events`
   - `GET /api/sync/status`
2. Proteggere endpoint con API key (`X-API-Key`).
3. Validare payload in ingresso.

## 8) Sincronizzazione eventi (fase successiva)

Passi minimi:

1. Definire mapping evento Discord -> `Event`.
2. Implementare import eventi (`backend/scripts/import-bot-events.js`) con deduplica.
3. Collegare evento DB e activity Discord con identificatori persistenti.
4. Aggiungere strategia fail-open: errore sync non deve bloccare operazioni bot.

## 9) Piano test

## 9.1 Test rapidi locali

1. `npm run discord:sync:dry`
2. Validare report (added/updated/unchanged coerenti).
3. `npm run discord:sync`
4. Verifica su MongoDB campi aggiornati.

### 9.2 Test di robustezza

1. Token mancante o invalido -> errore gestito.
2. Guild ID errato -> errore gestito.
3. Esecuzione ripetuta -> nessun duplicato.
4. Rename utente Discord -> update singolo campo name.

### 9.3 Test regressione backend

1. Avvio backend:
   - `npm run dev`
2. Smoke test:
   - `npm run smoke`

## 10) Automazione

Opzioni:

- Cron locale/server (ogni 5/15/60 minuti).
- PM2 scheduler.
- GitHub Actions self-hosted.

Linee guida:

1. Eseguire prima dry-run in ambienti critici.
2. Alert su failure (log monitoring o webhook Discord).
3. Conservare report di ogni run.

## 11) Sicurezza

1. Non committare token o API key.
2. Tenere `.env` fuori dal versionamento.
3. Usare HTTPS per endpoint pubblici.
4. Applicare rate limit agli endpoint `/api/sync/*`.
5. Ridurre permessi bot Discord al minimo necessario.

## 12) Interfaccia admin nel gestionale

Obiettivo: permettere agli admin di gestire il bot senza terminale, direttamente dal pannello web.

### 12.1 Funzioni UI consigliate

Creare una sezione `Bot Discord` nel pannello admin con:

1. Stato bot:
   - connesso/non connesso
   - guild attiva
   - ultimo heartbeat
2. Azioni manuali:
   - `Sync membri (dry-run)`
   - `Sync membri (reale)`
   - `Sync eventi` (quando disponibile)
   - `Riavvio processo bot` (opzionale)
3. Report e log:
   - output ultimo run
   - storico esecuzioni (timestamp, durata, esito, contatori)
4. Configurazione visibile:
   - mostrare solo parametri non sensibili (es. guild id, strategy, intervalli)
   - mascherare sempre token/API key

### 12.2 Endpoint backend per admin

Aggiungere endpoint protetti (solo ruolo admin), ad esempio:

- `GET /api/v1/admin/discord/status`
- `POST /api/v1/admin/discord/sync-members/dry-run`
- `POST /api/v1/admin/discord/sync-members`
- `GET /api/v1/admin/discord/sync-history`
- `POST /api/v1/admin/discord/restart` (se consentito in ambiente)

Requisiti:

1. Autorizzazione via JWT + role check admin.
2. Audit log obbligatorio su ogni azione amministrativa.
3. Rate limit dedicato alle azioni manuali di sync/restart.

### 12.3 Esecuzione job sicura

Per evitare timeout della request HTTP:

1. Endpoint `POST` accoda job asincrono.
2. Restituisce subito `jobId`.
3. Frontend fa polling su `GET /api/v1/admin/jobs/:jobId`.
4. A fine job salva report in DB (`DiscordSyncRun` o collezione equivalente).

Campi minimi report job:

- `jobId`
- `triggeredBy` (utente admin)
- `mode` (`dry-run` o `live`)
- `status` (`queued`, `running`, `completed`, `failed`)
- `result` (added, updated, unchanged, errors)
- `startedAt`, `finishedAt`

### 12.4 Struttura frontend suggerita

Possibile organizzazione:

- `src/app/admin/discord/page.jsx` (pagina admin)
- `src/services/discordAdminService.js` (chiamate API)
- `src/components/admin/discord/*` (card stato, azioni, tabella run)

Componenti minimi:

1. `DiscordBotStatusCard`
2. `DiscordSyncActions`
3. `DiscordSyncHistoryTable`
4. `DiscordSyncRunDrawer` (dettaglio errori/log)

### 12.5 Sicurezza e governance

1. Consentire solo utenti admin autorizzati.
2. Richiedere conferma esplicita prima di sync reale.
3. Bloccare esecuzioni concorrenti (`1 job attivo` per tipo).
4. Sanitizzare errori mostrati in UI (niente stack sensibili in chiaro).
5. Tracciare ogni azione con IP, user id, timestamp.

### 12.6 Roadmap implementativa admin

Fase A:

- sola lettura stato + bottone dry-run + report JSON.

Fase B:

- sync reale da UI + storico run persistente.

Fase C:

- scheduler configurabile da UI + alert errori + metriche.

## 13) Checklist finale

- [ ] Variabili ambiente configurate correttamente
- [ ] Script eseguibili senza errori import/logger
- [ ] Dry-run funzionante
- [ ] Sync reale funzionante
- [ ] Nessun duplicato su `Member.id`
- [ ] Logging e report completi
- [ ] Endpoint sync (se previsti) protetti da API key
- [ ] Test minimi superati
- [ ] Automazione schedulata

## 14) Comandi utili

Da `backend/`:

- `npm install`
- `npm run discord:sync:dry`
- `npm run discord:sync`
- `npm run dev`
- `npm run smoke`

---

Documento operativo per sviluppo progressivo: prima stabilita runtime, poi sync membri, poi sync eventi, infine automazione e hardening.
