# Piano creazione bot Discord per import membri su DB

## Obiettivo

Realizzare un bot Discord che legga i membri di una guild e li sincronizzi nel database MongoDB del backend, rispettando la struttura dati esistente (`Member`, con eventuale supporto a `DeletedMember` e `PromotedMember`).

## Stato attuale (baseline)

- Nel progetto esiste gia `backend/scripts/discord-bot.js` con:
  - connessione a Discord (`discord.js`);
  - fetch dei membri della guild;
  - inserimento base in collezione `Member`.
- Il modello principale da popolare e `backend/models/Member.js`.
- La logica attuale e utile come base, ma va resa piu robusta per sincronizzazione incrementale, idempotenza, audit e gestione edge case.

## Struttura dati da rispettare

Campi modello `Member`:
- `key` (Number, required)
- `index` (String)
- `tag` (String, default `LSE-P`)
- `name` (String, required)
- `id` (String, Discord user id)
- `date` (String, data ingresso)
- `idoneita` (Boolean)
- `watchdog` (Boolean)
- `promoted` (Boolean)
- `affiliazioniOrg` (String)
- `orgValidation` (Object/null)
- `note` (String)
- `richiami` (Number, default 0)
- `createdAt`, `updatedAt`

Mapping consigliato Discord -> Member:
- `id` <- `discordMember.user.id`
- `name` <- `discordMember.user.username` (o `displayName`, se preferito)
- `date` <- `discordMember.joinedAt` formattata `YYYY-MM-DD`
- `tag` <- default `LSE-P` (configurabile)
- altri campi business (`idoneita`, `watchdog`, `promoted`, `note`, `affiliazioniOrg`, `orgValidation`, `richiami`) inizializzati ai default di dominio

## Architettura proposta

### 1) Servizio di sync separato

Creare un servizio dedicato, ad esempio:
- `backend/lib/discord/discordSyncService.js`

Responsabilita:
- inizializzare client Discord;
- estrarre membri;
- normalizzare payload;
- sincronizzare DB in modo idempotente;
- produrre report finale (`added`, `updated`, `unchanged`, `errors`).

### 2) Entry point script

Creare/aggiornare script CLI:
- `backend/scripts/sync-discord-members.js`

Uso:
- esecuzione manuale (`npm run ...`);
- schedulazione esterna (cron/PM2/GitHub Actions).

### 3) Endpoint opzionale di trigger

Se serve trigger da pannello admin:
- endpoint protetto in backend (`POST /api/v1/admin/sync/discord-members`)
- accessibile solo a ruolo autorizzato.

## Strategia di sincronizzazione (raccomandata)

### Step A - Lettura e normalizzazione

- `guild.members.fetch()` con gestione paginazione/casi limite.
- Escludere bot (`member.user.bot`).
- Normalizzare ogni record in DTO interno `NormalizedDiscordMember`.

### Step B - Upsert su `Member`

Usare `bulkWrite` con `upsert: true` su chiave univoca logica `id`:
- se `id` non esiste -> crea nuovo membro (`added`);
- se esiste -> aggiorna campi non critici (`name`, `date`, metadata) senza sovrascrivere dati manuali sensibili (`note`, `richiami`, `idoneita`) salvo regola esplicita.

### Step C - Gestione membri non piu presenti in Discord

Opzioni:
- **Conservativa (v1)**: non eliminare nulla, solo report "missing in guild".
- **Estesa (v2)**: spostare in `DeletedMember` (soft delete tracciato) solo se approvato da policy business.

### Step D - Report finale e log

Output minimo:
- totale letti da Discord;
- `added`, `updated`, `unchanged`, `skippedBots`, `errors`;
- durata sync.

Log con `backend/lib/logger.ts`, senza token o dati sensibili.

## Variabili ambiente necessarie

- `DISCORD_BOT_TOKEN`
- `DISCORD_GUILD_ID`
- `MONGODB_URI`
- opzionali:
  - `DISCORD_SYNC_DEFAULT_TAG` (default `LSE-P`)
  - `DISCORD_SYNC_DRY_RUN` (`true/false`)
  - `DISCORD_SYNC_NAME_SOURCE` (`username|displayName`)

## Sicurezza e robustezza

- Mai loggare token Discord.
- Gestire retry/backoff su errori transient Discord API.
- Timeout controllati su connessione bot.
- Validare che `guild` sia trovata prima della sync.
- Aggiungere lock applicativo (anche semplice) per evitare doppie sync concorrenti.

## Piano implementativo a fasi

### Fase 1 - Hardening script esistente

- Rifattorizzare `discord-bot.js` in servizio + script CLI.
- Aggiungere report strutturato.
- Introdurre `dry-run`.

Deliverable:
- sync manuale affidabile e idempotente.

### Fase 2 - Upsert performante

- Sostituire `Member.create` in loop con `bulkWrite`.
- Definire chiaramente campi aggiornabili vs protetti.

Deliverable:
- sync veloce e stabile su guild grandi.

### Fase 3 - Audit e policy di disallineamento

- Report membri presenti su DB ma assenti su Discord.
- Opzione soft-delete verso `DeletedMember` (disabilitata di default).

Deliverable:
- governance dati e tracciabilita operazioni.

### Fase 4 - Automazione

- Schedulazione periodica (cron/PM2/GitHub Actions).
- Alert in caso di failure (log + eventuale webhook).

Deliverable:
- processo continuo senza intervento manuale.

## Test plan minimo

- Unit test normalizzazione DTO Discord.
- Test integrazione sync con DB test:
  - primo run: inserimenti;
  - secondo run: idempotenza (nessun duplicato);
  - rename utente: update campo `name`;
  - bot account: skip.
- Test errore token/guild non validi.

## Criteri di accettazione

- Nessun duplicato su `Member.id`.
- Sync ripetibile con stesso risultato (idempotenza).
- Tempo accettabile su dimensione guild reale.
- Report finale sempre disponibile anche in caso di errori parziali.
- Dati business sensibili non sovrascritti accidentalmente.

## Nota operativa

Il progetto ha gia dipendenza `discord.js` e uno script di base: conviene evolvere quell'implementazione invece di riscriverla da zero, mantenendo compatibilita con la struttura backend esistente.

