# Dialogo Webapp ↔ Discord Bot — Flowchart

Questo documento contiene il flowchart dettagliato (Mermaid) che descrive il dialogo strutturato tra la webapp amministrativa, il backend e il bot Discord per la gestione ruoli e l'esecuzione di kick con motivazione.

## Panoramica
- Azioni gestite: `assignRole`, `removeRole`, `kickMember`.
- Autorizzazione: `Admin organizzazione` (API protette).
- Audit: `RoleChangeAudit` e `DeletedMember` con motivo e actor.

## Flowchart (Mermaid)

```mermaid
flowchart TD
  %% Legend: UI = Webapp admin, API = Backend, BOT = Discord bot, DB = MongoDB/audit
  Start([Start])
  UI[\"Admin UI: seleziona azione\n(assign/remove/kick)\"]
  SelectMember{{\"Seleziona membro(i)\"}}
  SelectRole["Seleziona ruolo (se applicabile)\nSeleziona motivo (kick)"]
  Confirm{"Conferma azione?"}
  Auth{"Autorizzazione?\n(Admin organizzazione)"}
  CreateJob["Crea job in DB\n(DiscordSyncRun / Job record)"]
  Validate["Validate payload JSON\n(schema)"]
  API_Endpoint["POST /api/v1/discord/actions\n(assign|remove|kick)"]
  MapRole["Map ruoli -> Discord Role ID\n(controllo mapping)"]
  Enqueue["Enqueue job / immediate call\n(Depending on mode)"]
  BOT_Receive["Bot riceve job\n(via API direct call / queue)"]
  ApplyRole["Apply role change\n`guild.members.roles.add/remove()`"]
  Kick["Esegui kick\n`guild.members.kick(id, reason)`"]
  Success{"Azione riuscita?"}
  DB_UpdateAssign["Aggiorna `Member` (tag/ruoli)\nAggiungi RoleChangeAudit"]
  DB_UpdateKick["Rimuovi `Member` → crea `DeletedMember`\nSalva motivo + actor"]
  NotifyFrontend["Aggiorna job status / push\nWebsocket o polling"]
  RetryPolicy{"Errore temporaneo?\n(apply retry/backoff)"}
  LogError["Log errore (winston)\nCrea audit fallito"]
  FailNotify["Notifica admin: fallimento"]
  End([Fine])

  %% Real-time discord->DB path
  BOT_Listener["Bot: guildMemberUpdate listener\n(change di ruolo)"]
  UpdateDB_OnEvent["Aggiorna `Member.tag` nel DB\nCrea RoleChangeAudit"]
  NotifyUI_Event["Notifica UI / push di update"]

  %% Bulk sync path
  UI_Bulk["UI: Trigger bulk sync"]
  API_Bulk["POST /api/v1/admin/discord/sync-members"]
  SyncService["DiscordMemberSyncService.syncMembers()\nfetch guild.members -> bulkWrite"]
  SyncDB["bulkWrite su `Member`\nCrea `DiscordSyncRun` record"]

  %% Flow connections
  Start --> UI
  UI --> SelectMember
  SelectMember --> SelectRole
  SelectRole --> Confirm
  Confirm -->|No| End
  Confirm -->|Si| Auth
  Auth -->|Auth OK| CreateJob
  Auth -->|Auth NOK| FailNotify
  CreateJob --> Validate
  Validate --> API_Endpoint
  API_Endpoint --> MapRole
  MapRole --> Enqueue
  Enqueue --> BOT_Receive
  BOT_Receive -->|assign/remove| ApplyRole
  BOT_Receive -->|kick| Kick
  ApplyRole --> Success
  Kick --> Success
  Success -->|yes & assign| DB_UpdateAssign
  Success -->|yes & kick| DB_UpdateKick
  DB_UpdateAssign --> NotifyFrontend
  DB_UpdateKick --> NotifyFrontend
  NotifyFrontend --> End

  Success -->|no| RetryPolicy
  RetryPolicy -->|retry OK| BOT_Receive
  RetryPolicy -->|exhausted| LogError
  LogError --> FailNotify
  FailNotify --> End

  %% Real-time listener connections
  BOT_Listener --> UpdateDB_OnEvent
  UpdateDB_OnEvent --> NotifyUI_Event
  NotifyUI_Event --> End

  %% Bulk sync connections
  UI_Bulk --> API_Bulk
  API_Bulk --> SyncService
  SyncService --> SyncDB
  SyncDB --> NotifyFrontend

  %% Notes as clickable nodes (visual)
  subgraph NOTES [ ]
    note1[[Auth: `X-API-Key` + requireAdmin]]
    note2[[Audit: RoleChangeAudit + DeletedMember with reason + actor]]
    note3[[Retry: exponential backoff, rate-limit handling]]
  end

  Auth --- note1
  DB_UpdateKick --- note2
  RetryPolicy --- note3
```

---

File creato: `docs/DISCORD_ROLE_KICK_FLOW.md`.
