# LSE Gestionale v2

Interfaccia web per visualizzare e gestire l'elenco dei membri dell'organizzazione LSE (Logistic Space Economy), con integrazione Discord, API RSI di Star Citizen e autenticazione JWT.

## 🚀 Avvio rapido

### Prerequisiti
- Node.js (v18 o superiore)
- npm (v9 o superiore)
- MongoDB (locale o remoto)

### Frontend (Next.js 16)
```bash
npm install
npm run dev
```
Il frontend sarà disponibile su http://localhost:3000

### Backend (Express.js)
```bash
cd backend
npm install
npm run dev
```
Il backend sarà disponibile su http://localhost:5000

## 📂 Struttura del progetto

```
lse_gestionale_v2/
├── src/                    # Frontend Next.js 16
│   ├── app/               # App Router (pagine Next.js)
│   ├── components/        # Componenti riutilizzabili
│   ├── context/           # Context providers
│   ├── hooks/             # Custom hooks
│   ├── services/          # API services
│   ├── bloc/calendar/     # Componenti calendario (TypeScript)
│   └── lib/               # Utility e configurazioni
├── backend/               # Backend Node.js/Express
│   ├── models/            # Modelli Mongoose
│   ├── lib/               # Librerie e utilità
│   ├── routes/            # Router Express
│   ├── scripts/           # Script manutenzione e bot Discord
│   ├── tests/             # Suite di test
│   └── server.ts          # Entry point del server
├── k3s/                   # Configurazioni Kubernetes
├── Dockerfile             # Build Docker multi-stage
├── public/                # Asset statici
└── docs/                  # Documentazione dettagliata
```

## 📚 Documentazione

La documentazione dettagliata è organizzata nella cartella `docs/`:
- [docs/index.md](docs/index.md): Indice e guida alla documentazione
- [docs/STATO_PROGETTO.md](docs/STATO_PROGETTO.md): Stato aggiornato del progetto
- [docs/FLOWCHART_COMPLETO.md](docs/FLOWCHART_COMPLETO.md): Flowchart completo di tutta la logica
- [docs/BACKEND_FLOWCHART.md](docs/BACKEND_FLOWCHART.md): Flowchart architettura backend
- [docs/MAPPA_LOGICA_BOT_BACKEND.md](docs/MAPPA_LOGICA_BOT_BACKEND.md): Mappa logica Bot Discord ↔ Backend
- [docs/DISCORD_ROLE_KICK_FLOW.md](docs/DISCORD_ROLE_KICK_FLOW.md): Flowchart gestione ruoli e kick Discord
- [backend/ANALISI_BACKEND_v2.md](backend/ANALISI_BACKEND_v2.md): Analisi tecnica del backend
- [backend/SECRETS.md](backend/SECRETS.md): Gestione delle variabili d'ambiente e dei segreti
- [backend/README-IMPORT.md](backend/README-IMPORT.md): Guida all'importazione degli eventi dal bot Discord

## ⚙️ Configurazione

Copiare i file di esempio delle variabili d'ambiente:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Modificare i file `.env` e `backend/.env` con le proprie configurazioni.

### Variabili principali
| Frontend | Backend |
|----------|---------|
| `NEXT_PUBLIC_RSI_API_URL` | `MONGODB_URI` |
| | `JWT_SECRET` |
| | `API_KEY` |
| | `DISCORD_BOT_TOKEN` |
| | `DISCORD_GUILD_ID` |
| | `DISCORD_WEBHOOK_URL` |
| | `REDIS_URL` (opzionale) |

## 🔧 Script disponibili

### Frontend
- `npm run dev`: Avvia Next.js in modalità sviluppo
- `npm run build`: Esegue il build per la produzione
- `npm start`: Avvia il server di produzione
- `npm run typecheck`: Verifica tipi TypeScript

### Backend
- `npm run dev`: Avvia il server in modalità sviluppo con nodemon
- `npm start`: Avvia il server in modalità produzione
- `npm run test`: Esegue i test con Jest
- `npm run smoke`: Esegue i test di smoke
- `npm run discord:sync`: Sincronizza membri da Discord
- `npm run discord:sync:dry`: Dry-run sync membri

## 🐳 Docker e Kubernetes

Il progetto supporta il deployment con Docker e Kubernetes:
- **Docker**: Build multi-stage che combina frontend e backend in un singolo container
- **Kubernetes**: Manifest disponibili in `k3s/` per orchestrazione produzione

## 🎯 Funzionalità principali

- **Gestione membri**: CRUD, import CSV/TXT, validazione org RSI, soft delete, promozioni
- **Autenticazione**: JWT, verifica identità RSI (codice bio + rank org + main org)
- **Calendario eventi**: Viste giorno/settimana/mese/anno, drag & drop, notifiche Discord
- **Integrazione Discord**: Bot persistente, sync membri, real-time role updates, kick
- **Admin panel**: Gestione bot, sync, visualizzazione storico job, lista utenti

## 💡 Contribuire

1. Forkare il repository
2. Creare un branch per la feature (`git checkout -b feature/nome-feature`)
3. Effettuare i cambiamenti e commitare (`git commit -m 'Aggiunta nome-feature'`)
4. Pushare sul branch (`git push origin feature/nome-feature`)
5. Aprire una Pull Request

## 📝 Licenza

Questo progetto è sotto licenza MIT - vedere il file [LICENSE](LICENSE) per i dettagli.
