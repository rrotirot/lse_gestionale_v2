## Stato del Progetto "LSE Gestionale v2"

### Panoramica generale

Il repository contiene:
- **Frontend** in `src/` basato su **Next.js 16**, **React 19**, **Tailwind CSS 4** e componenti UI Radix.
- **Backend** in `backend/` basato su **Node.js + Express + MongoDB**, con logica applicativa per membri, eventi, autenticazione e integrazione con RSI/Discord.
- **Documentazione** in `docs/` con flowchart architettura, mappa logica bot, stato progetto e archivio documenti storici.

La migrazione da React/Vite a Next.js è **completata**. Il progetto è pronto per il deployment con Docker + Kubernetes.

---

### Frontend (Next.js)

- **Routing (App Router)**:
  - `src/app/layout.jsx`: layout root dell'app.
  - `src/app/page.jsx`: home/dashboard principale.
  - `src/app/login/page.jsx`: pagina di login.
  - `src/app/members/page.jsx`: pagina gestione membri.
  - `src/app/calendar/page.jsx`: pagina calendario eventi.
  - `src/app/admin/`: sezione admin (gestione Discord bot, sync, utenti).
- **Routing legacy (ancora presente, da pulire)**:
  - `src/App.jsx`: view router SPA (state-based, non Next).
  - `src/views/*.jsx`: pagine legacy (HomePage, MembersPage, CalendarPage, LoginPage, AdminDiscordPage).
  - `src/components/app/*-route.jsx`: wrapper route compatibili con la vecchia architettura.
- **Gestione stato frontend**:
  - `context/AuthContext.jsx`, `context/MembersContext.jsx`, `context/EventsContext.jsx`.
  - Custom hooks: `hooks/useMembers.js`, `hooks/useEvents.js`, `hooks/useAuth.js`, `hooks/useDiscordAvatar.js`, `hooks/usePromotedMembers.js`, `hooks/useMemberFilters.js`.
- **Servizi HTTP**:
  - `services/authService.js`, `membersService.js`, `eventsService.js`, `userService.js`, `discordAdminService.js`.
  - `config/api.js` centralizza le base URL e la configurazione delle richieste.
  - `lib/runtime-config.js` per configurazioni runtime (API URL, token storage).
- **UI & Design system**:
  - Componenti base in `components/ui/*.tsx` (button, input, dialog, form, select, badge, skeleton, tooltip, popover, scroll-area, accordion, avatar, switch, textarea, time-input, calendar) costruiti sopra Radix/UI e Tailwind.
  - Componenti di dominio:
    - Membri: `components/members/*` (liste, card, modali di aggiunta/eliminazione, filtri, help, vista promossi).
    - Eventi/Calendario: blocco TypeScript sotto `bloc/calendar/*` con viste mensili/settimanali/giornaliere/agenda, drag & drop, header di navigazione, dialog di dettaglio e modifica eventi.
- **Dipendenze principali**:
  - `next: ^16.2.1`, `react: ^19.2.4`, `react-dom: ^19.2.4`
  - `tailwindcss: ^4.1.17`, `@radix-ui/*` (11 pacchetti)
  - `react-dnd`, `react-day-picker`, `react-hook-form`, `zod`, `lucide-react`

---

### Backend (Node.js + Express)

- **Entrypoint**:
  - `backend/server.ts` (~3753 righe): server HTTP Express su porta 5000 che:
    - gestisce healthcheck (`/api/health`, `/api/v1/health`);
    - implementa proxy/scraping RSI (`/api/v1/rsi/orgs/:handle` con `cheerio`, caching Redis);
    - gestisce autenticazione JWT (`/api/v1/auth/*`);
    - gest CRUD membri, eventi, deleted members, promoted members;
    - gestisce admin Discord (start/stop bot, sync membri, storico job);
    - espone endpoint sync per bot (`/api/v1/sync/*`);
    - usa middleware: helmet, cors, rate limiting, JSON parser, versioning API, Winston logger.
- **Modelli dati (MongoDB/Mongoose)**:
  - `Member.js`: membri attivi (key, index, tag, name, id Discord, date, idoneita, watchdog, promoted, affiliazioniOrg, orgValidation, note, richiami).
  - `DeletedMember.js`: audit trail soft-delete (con deletedAt, deletedBy, deletionReasons).
  - `PromotedMember.js`: membri promossi a LSE/OPERATORE (promotedAt, promotedBy, promotionReason).
  - `User.js`: utenti web app (username, password hash, rsiHandle, rsiVerified, organizationRank).
  - `Event.js`: eventi calendario (title, description, date, startTime, endTime, location, type).
  - `DiscordSyncRun.js`: storico esecuzioni sync (jobId, mode, status, result, startedAt, finishedAt).
- **Librerie utility**:
  - `lib/config.ts`: setup MongoDB, validazione env.
  - `lib/logger.ts`: Winston logger strutturato con rotazione file.
  - `lib/cache.js`: wrapper Redis (fallback graceful se non disponibile).
  - `lib/versioning.ts`: middleware versioning API (v1, v2...).
  - `lib/parseMembers.js`: parser CSV/TXT per import membri.
  - `lib/discordMemberSync.js`: `DiscordMemberSyncService` per sync batch membri Discord.
  - `lib/swagger.js`: generazione specifiche OpenAPI.
- **Script**:
  - `scripts/discord-bot.js`: bot persistente (start/stop da UI, real-time sync su `guildMemberUpdate`, kick membri).
  - `scripts/sync-discord-members.js`: script CLI per sync manuale (dry-run/live).
  - `scripts/import-bot-events.js`: import eventi da formato bot Discord.
  - Script manutenzione: `import-members.js`, `deduplicate-members.js`, `clear-members.js`, `delete-test-members.js`.
- **Testing**:
  - `backend/tests/*.js` con Jest (smoke test, integrazione, modelli/lib).
- **Dipendenze principali**:
  - `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `redis`
  - `discord.js`, `cheerio`, `multer`, `winston`
  - `helmet`, `cors`, `express-rate-limit`, `express-validator`
  - `swagger-jsdoc`, `swagger-ui-express`

---

### Deployment

- **Docker**: build multi-stage che produce un singolo container con Next.js (porta 3000) + Express (porta 5000).
- **Kubernetes**: manifest presenti in `k3s/` per orchestrazione container.
- **Variabili ambiente chiave**:
  - `MONGODB_URI`, `JWT_SECRET`, `API_KEY`
  - `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_WEBHOOK_URL`
  - `REDIS_URL` (opzionale), `CORS_ORIGIN`, `NODE_ENV`, `PORT`

---

### Cosa è già funzionante

- **Gestione membri**:
  - Upload file `.txt/.csv` con multer + parsing in `parseMembers.js`.
  - Persistenza MongoDB (`Member`, `PromotedMember`, `DeletedMember`) con promozioni, soft-delete, deduplicazione.
  - Frontend: lista, filtri, ricerca, dettagli, modali aggiunta/cancellazione, vista promossi.
- **Sistema di autenticazione**:
  - JWT backend, bcrypt password hashing, rate limiting su login/register.
  - Verifica identità RSI (codice in bio, rank org >= 4, main org = "Logistic Space Economy").
  - Frontend: login, gestione profilo, cambio password, verifica RSI.
- **Calendario ed eventi**:
  - Modello `Event.js` + CRUD API con notifiche Discord webhook.
  - Frontend: blocco `bloc/calendar/*` con viste giorno/settimana/mese/anno, drag & drop, dialog aggiunta/modifica.
- **Integrazioni esterne**:
  - **RSI**: scraping HTML con Cheerio, caching Redis, validazione org.
  - **Discord**: bot persistente con sync membri (dry-run/live), real-time sync su cambio ruoli, kick membri, storico job.
- **Admin Discord**:
  - Pannello admin per start/stop bot, trigger sync, visualizzazione storico esecuzioni, lista utenti registrati.

---

### Lavori in corso / punti aperti

- **Pulizia codice legacy**:
  - Rimuovere `src/App.jsx`, `src/views/*`, `src/components/app/*` (sostituiti da `src/app/*`).
  - Uniformare sintassi backend: `backend/server.ts` usa mix CommonJS (`require`) e TypeScript `import = require`.
- **Qualità e test**:
  - Ampliare suite test frontend (focus attuale sul backend).
  - Coprire flussi critici (login, upload membri, calendario) con smoke test end-to-end.
- **Documentazione API**:
  - Rifinire Swagger (`backend/lib/swagger.js`) per tenere specifiche aggiornate.
  - Valutare endpoint `/version` tramite `backend/lib/versioning.ts`.
- **Sicurezza**:
  - Verificare e allineare variabili d'ambiente secondo `backend/SECRETS.md` e `backend/lib/config.ts` (soprattutto produzione).

---

### Prossimi passi suggeriti

- **Frontend**:
  - Consolidare `src/app/*` come unica fonte di routing.
  - Rimuovere componenti legacy non più usati.
- **Backend**:
  - Uniformare moduli a ES modules o puro CommonJS.
  - Espandere copertura test.
- **Infrastruttura**:
  - Configurare CI/CD per build Docker automatico.
  - Setup monitoring e alerting per produzione.
  - Configurare backup automatici MongoDB.

---

Questo file rappresenta lo **snapshot aggiornato** (maggio 2026) dello stato del progetto.
Branch corrente: `disocrd_role_edit_and_kick`.
