# Mappa logica Bot Discord ↔ Backend

```mermaid
flowchart TD
    A[Admin da Gestionale] -->|Trigger manuale sync| B[Backend API Admin]
    Z[Scheduler/Cron] -->|Trigger automatico| B

    B --> C[Job Queue / Job Runner]
    C --> D[DiscordMemberSyncService]

    D --> E[Discord API]
    E -->|guild.members.fetch| D

    D --> F[Normalizzazione dati]
    F --> G[Confronto con MongoDB]
    G --> H[bulkWrite upsert su Member]

    H --> I[Report sync]
    I --> J[(Collezione Sync History)]
    I --> K[Log applicativi]

    J --> L[Frontend Admin - storico run]
    B --> M[Endpoint status/job]
    L -->|poll jobId| M

    N[Flusso eventi bot - opzionale] --> O[Endpoint /api/sync/events]
    O --> P[(Event collection MongoDB)]
```

## Come funziona, in pratica

- Trigger: parte da UI admin (manuale) o scheduler (automatico).
- Orchestrazione backend: un endpoint avvia un job asincrono e restituisce `jobId`.
- Sync bot: il servizio si autentica su Discord, legge membri guild, esclude bot, normalizza.
- Persistenza: confronto per `Member.id`, poi `bulkWrite` con `added/updated/unchanged`.
- Output: report finale + log + storico esecuzioni.
- UI admin: legge stato job e mostra risultati (dry-run o reale).

## Blocchi chiave (responsabilita)

- `Discord API`: sorgente dati membri/eventi.
- `DiscordMemberSyncService`: logica di mapping e regole sync.
- `MongoDB Member`: stato canonico membri nel gestionale.
- `Admin API`: sicurezza/permessi, trigger job, lettura stato.
- `Frontend Admin`: controllo operativo e visibilita.
