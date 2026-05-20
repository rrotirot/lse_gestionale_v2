## Stato del Progetto "LSE Gestionale v2"

### Panoramica generale

Il repository contiene:
- **Frontend** in `src/` basato su **Next.js 16**, **React 19**, **Tailwind CSS 4** e componenti UI Radix.
- **Backend** in `backend/` basato su **Node.js + Express + MongoDB**, con logica applicativa per membri, eventi, autenticazione e integrazione con RSI/Discord.
- **Documentazione** già presente (`docs/ANALISI.md`, `backend/ANALISI_BACKEND*.md`, `backend/SECRETS.md`, ecc.) che descrive in dettaglio la prima versione dell’architettura.

Il frontend storico React/Vite è stato migrato (o è in corso di migrazione) al nuovo **app router di Next.js** (`src/app/...`), mantenendo gran parte della logica e dei componenti esistenti in `src/components`, `src/views`, `src/context`, `src/hooks` e `src/services`.

### Frontend (Next.js)

- **Entry points Next**:
  - `src/app/layout.jsx`: layout root dell’app.
  - `src/app/page.jsx`: home/dashboard principale.
  - `src/app/login/page.jsx`: pagina di login.
  - `src/app/members/page.jsx`: pagina gestione membri.
  - `src/app/calendar/page.jsx`: pagina calendario eventi.
- **Routing legacy**:
  - Restano presenti i vecchi “route components” (`components/app/*-route.jsx`) e le `views` (`views/*.jsx`) compatibili con l’architettura precedente; possono essere gradualmente sostituiti da pagine Next native.
- **Gestione stato frontend**:
  - `context/MembersContext.jsx`, `context/EventsContext.jsx`, più vari custom hooks (`hooks/useMembers.js`, `useEvents.js`, `useAuth.js`, ecc.) per incapsulare l’accesso ai servizi API.
- **Servizi HTTP**:
  - `services/authService.js`, `membersService.js`, `eventsService.js`, `userService.js` orchestrano le chiamate al backend.
  - `config/api.js` centralizza le base URL e la configurazione di base delle richieste.
- **UI & Design system**:
  - Componenti base in `components/ui/*.tsx` (button, input, dialog, form, select, badge, skeleton, ecc.) costruiti sopra Radix/UI e Tailwind.
  - Componenti di dominio:
    - Membri: `components/members/*` (liste, card, modali di aggiunta/eliminazione, filtri, help, vista promossi).
    - Eventi/Calendario: blocco in TypeScript sotto `bloc/calendar/*` con viste mensili/settimanali/giornaliere/agenda, drag & drop, header di navigazione, dialog di dettaglio e modifica eventi.
- **Altre utilità frontend**:
  - `lib/runtime-config.js` e `lib/utils.js` per configurazioni runtime e funzioni di supporto.
  - `hooks/useDiscordAvatar.js`, `hooks/usePromotedMembers.js`, `hooks/useMemberFilters.js`, ecc. per logiche specifiche del dominio.

### Backend (Node.js + Express)

- **Entrypoint**:
  - `backend/server.ts`: server HTTP Express che:
    - gestisce healthcheck (`/api/health`, `/api/v1/health`);
    - implementa un proxy/integrazione con l’API pubblica RSI (scraping HTML con `cheerio`, caching via `backend/lib/cache.js`);
    - usa middleware di sicurezza (`helmet`, `cors`, rate limiting), logging (`backend/lib/logger.ts`), versioning API (`backend/lib/versioning.ts`) e configurazione MongoDB (`backend/lib/config.ts`).
- **Modelli dati (MongoDB/Mongoose)**:
  - `backend/models/Member.js`, `PromotedMember.js`, `DeletedMember.js`, `User.js`, `Event.js`.
- **Routing applicativo**:
  - `backend/routes/members.js`: gestione CRUD e logiche relative ai membri.
  - `backend/routes/auth.js`: flusso di autenticazione basato su JWT/ruoli.
- **Script di manutenzione / import** (`backend/scripts/*.js`):
  - Import e deduplicazione membri (`import-members.js`, `deduplicate-members.js`, `clear-members.js`, `delete-test-members.js`).
  - Integrazione con bot Discord (`discord-bot.js`, `test-bot-logic.js`, `restart-backend.js`).
  - Import eventi da bot (`import-bot-events.js`).
- **Testing backend**:
  - `backend/tests/*.js` con test di fumo, integrazione base e test sui modelli/lib.
- **Documentazione backend**:
  - `backend/ANALISI_BACKEND.md` e `backend/ANALISI_BACKEND_v2.md` descrivono più in dettaglio flussi API, sicurezza e decisioni architetturali.

### Stato attuale (branch `feat/nextjs-migration`)

- Il branch corrente (`feat/nextjs-migration`) è **ahead di 1 commit** rispetto a `origin/feat/nextjs-migration` e rappresenta la migrazione in corso a **Next.js**:
  - `package.json` già aggiornato a:
    - `"next": "^16.2.1"`, `"react": "^19.2.4"`, `"react-dom": "^19.2.4"`;
    - stack moderno con Tailwind 4 e Radix UI.
  - Presenza simultanea di:
    - vecchia struttura React SPA (`App.jsx`, `views/*`, route components sotto `components/app/*`);
    - nuova struttura Next app router (`src/app/...`).
- Il file `docs/ANALISI.md` fotografa ancora il frontend come app React + Vite; concettualmente è corretto sulla logica di dominio, ma **non è aggiornato sul framework di rendering (ora Next.js)**.

### Cosa è già funzionante (in base al codice)

- **Gestione membri**:
  - Caricamento file `.txt/.csv` via backend Express (upload con `multer` in memory).
  - Parsificazione file in `backend/lib/parseMembers.js`.
  - Persistenza in MongoDB (`Member`, `PromotedMember`, `DeletedMember`) con logiche per promozioni, soft-delete, deduplicazione.
  - Nel frontend: componenti per lista, filtri, ricerche, dettagli, dialog di conferma e modali per aggiunta/cancellazione.
- **Sistema di autenticazione**:
  - Backend con JWT (`JWT_SECRET`), utenti in `User.js`, middleware di protezione route.
  - Frontend con `useAuth`, `authService.js` e route/pagine di login integrate (`app/login/page.jsx`, `components/app/login-route.jsx`).
- **Calendario ed eventi**:
  - Modello `Event.js` nel backend più script di import.
  - Blocco frontend `bloc/calendar/*` molto strutturato (tipizzato TypeScript) con:
    - viste giorno/settimana/mese/anno, agenda;
    - drag & drop (`dnd/*`), dialog per aggiunta/modifica/dettaglio;
    - navigazione temporale e header personalizzabile.
- **Integrazioni esterne**:
  - RSI: endpoint `/api/v1/rsi/orgs/:handle` con scraping HTML, normalizzazione e caching.
  - Discord: bot/script per sincronizzazione membri ed eventi, consumo integrato nei flussi di import.

### Lavori in corso / punti aperti

- **Migrazione completa a Next.js**:
  - Portare tutte le route utente effettive (`Home`, `Members`, `Calendar`, `Login`) sotto `src/app/...`, eliminando gradualmente i vecchi “route components” non più necessari.
  - Aggiornare `docs/ANALISI.md` per allinearla all’uso di Next.js (o linkare questo file come “fonte aggiornata”).
- **Pulizia tecnica**:
  - `backend/server.ts` usa un mix di sintassi CommonJS (`require`) e TypeScript `import = require`; a lungo termine converrebbe uniformare a ES modules o puro CommonJS per coerenza.
  - Verificare ed allineare variabili d’ambiente secondo `backend/SECRETS.md` e `backend/lib/config.ts` (soprattutto in ambienti non di sviluppo).
- **Qualità e test**:
  - Ampliare la suite di test frontend (attualmente il focus dei test è sul backend).
  - Verificare che i flussi critici (login, caricamento membri, calendario) siano coperti da smoke test end-to-end o almeno integrazione.

### Prossimi passi suggeriti

- **Frontend**:
  - Consolidare l’uso di `src/app/*` come unica fonte di routing e rimuovere step by step componenti legacy non più usati.
  - Estrarre/riusare le `views/*` dove hanno ancora senso, ma come puro “page content” chiamato dalle pagine Next.
- **Backend**:
  - Valutare se esporre un endpoint “/version” o simile sfruttando `backend/lib/versioning.ts` per tracciare meglio lo stato della API.
  - Rifinire la documentazione Swagger (`backend/lib/swagger.js`) per tenere aggiornate le specifiche.

Questo file rappresenta lo **snapshot aggiornato** (maggio 2026) dello stato del progetto e può essere esteso in futuro con sezioni dedicate a deployment, monitoraggio e flussi operativi.

