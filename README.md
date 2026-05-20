# LSE Members Interface

Interfaccia web React per visualizzare e gestire l'elenco dei membri dell'organizzazione LSE, con integrazione Discord e API RSI di Star Citizen.

## 🚀 Avvio rapido

### Prerequisiti
- Node.js (v18 o superiore)
- npm (v9 o superiore)
- MongoDB (locale o remoto)

### Frontend
```bash
npm install
npm run dev
```
Il frontend sarà disponibile su http://localhost:5173

### Backend
```bash
cd backend
npm install
npm run dev
```
Il backend sarà disponibile su http://localhost:3000

## 📂 Struttura del progetto

```
lse_gestionale_v2/
├── src/                    # Frontend React
│   ├── pages/             # Pagine principali
│   ├── components/        # Componenti riutilizzabili
│   ├── context/           # Context providers
│   ├── hooks/             # Custom hooks
│   ├── services/          # API services
│   └── utils/             # Utility functions
├── backend/               # Backend Node.js/Express
│   ├── models/            # Modelli Mongoose
│   ├── lib/               # Librerie e utilità
│   ├── tests/             # Suite di test
│   └── server.ts          # Entry point del server
├── public/                # Asset statici
└── docs/                  # Documentazione dettagliata
```

## 📚 Documentazione

La documentazione dettagliata è organizzata nella cartella `docs/`:
- [docs/index.md](docs/index.md): Indice e guida alla documentazione
- [docs/ANALISI.md](docs/ANALISI.md): Architettura e funzionalità del progetto
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

## 🔧 Script disponibili

### Frontend
- `npm run dev`: Avvia l'applicazione in modalità sviluppo
- `npm run build`: Esegue il build per la produzione
- `npm run preview`: Anteprima della build di produzione

### Backend
- `npm run dev`: Avvia il server in modalità sviluppo con nodemon
- `npm start`: Avvia il server in modalità produzione
- `npm run test`: Esegue i test con Jest
- `npm run smoke`: Esegue i test di smoke

## 🐳 Nota su Docker
Docker non è utilizzato in questo progetto (rimosso volontariamente).

## 💡 Contribuire

1. Forkare il repository
2. Creare un branch per la feature (`git checkout -b feature/nome-feature`)
3. Effettuare i cambiamenti e commitare (`git commit -m 'Aggiunta nome-feature'`)
4. Pushare sul branch (`git push origin feature/nome-feature`)
5. Aprire una Pull Request

## 📝 Licenza

Questo progetto è sotto licenza MIT - vedere il file [LICENSE](LICENSE) per i dettagli.