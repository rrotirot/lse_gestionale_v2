# Flowchart Completo - LSE Gestionale v2

## Panoramica Architettura

```mermaid
flowchart TD
    subgraph Client["Client Browser"]
        Browser["Browser"]
    end

    subgraph Frontend["Frontend - Next.js 16 (:3000)"]
        AppRouter["App Router\nsrc/app/*"]
        Pages["Pagine\npage.jsx"]
        Context["Context Providers\nAuth, Members, Events"]
        Services["API Services\nauthService, membersService,\neventsService, discordAdminService"]
        Components["Componenti UI\nui/*, members/*, events/*,\nbloc/calendar/*"]
        Hooks["Custom Hooks\nuseAuth, useMembers,\nuseEvents, useDiscordAvatar"]
        
        AppRouter --> Pages
        Pages --> Context
        Context --> Hooks
        Hooks --> Services
        Services --> Components
    end

    subgraph Backend["Backend - Express.js (:5000)"]
        Middleware["Middleware Chain\nHelmet → CORS → Rate Limit →\nJSON → Versioning → Logger"]
        Router["Route Handler"]
        Auth["Auth Module\nJWT + bcrypt"]
        Members["Members Module\nCRUD + Import + Validation"]
        Events["Events Module\nCRUD + Discord Webhook"]
        RSI["RSI Scraper\nCheerio + Redis Cache"]
        DiscordAdmin["Discord Admin\nBot Start/Stop/Sync"]
        Sync["Bot Sync API\n/api/v1/sync/*"]
        
        Middleware --> Router
        Router --> Auth
        Router --> Members
        Router --> Events
        Router --> RSI
        Router --> DiscordAdmin
        Router --> Sync
    end

    subgraph DataLayer["Data Layer"]
        MongoDB["MongoDB\nMember, DeletedMember,\nPromotedMember, User, Event,\nDiscordSyncRun"]
        Redis["Redis Cache\nRSI org results"]
    end

    subgraph External["External Services"]
        DiscordAPI["Discord API\nBot + Webhooks"]
        RSIWebsite["RSI Website\nrobertsspaceindustries.com"]
    end

    Browser --> AppRouter
    Services -->|"fetch() API calls"| Middleware
    Auth --> MongoDB
    Members --> MongoDB
    Events --> MongoDB
    Events -->|"webhook"| DiscordAPI
    RSI -->|"scrape"| RSIWebsite
    RSI --> Redis
    DiscordAdmin -->|"start/stop/sync"| DiscordAPI
    Sync -->|"API key auth"| MongoDB
    DiscordAPI -->|"guildMemberUpdate"| Members
    MongoDB -->|"JSON Response"| Services
    Redis -->|"cached data"| RSI
```

## Flusso di Autenticazione

```mermaid
flowchart TD
    Start([Utente accede /login]) --> Register{"Nuovo utente?"}
    
    Register -->|Si| RegFlow["POST /api/v1/auth/register\nusername + password"]
    Register -->|No| LoginFlow["POST /api/v1/auth/login\nusername + password"]
    
    RegFlow --> HashPwd["bcrypt hash password"]
    HashPwd --> SaveUser["Salva User in MongoDB"]
    SaveUser --> LoginFlow
    
    LoginFlow --> VerifyCreds["Verifica credenziali"]
    VerifyCreds --> Valid{"Credenziali valide?"}
    
    Valid -->|No| ErrorLogin["Errore 401"]
    Valid -->|Si| GenJWT["Genera JWT token (24h)"]
    GenJWT --> ReturnToken["Restituisci token + user data"]
    
    ReturnToken --> StoreToken["Frontend: sessionStorage\n(o localStorage se remember me)"]
    StoreToken --> AuthCheck["GET /api/v1/auth/verify\ncon Bearer token"]
    
    AuthCheck --> TokenValid{"Token valido?"}
    TokenValid -->|No| RedirectToLogin["Redirect a /login"]
    TokenValid -->|Si| CheckRSI{"RSI verificato?"}
    
    CheckRSI -->|No| ShowVerifyUI["Mostra UI verifica RSI"]
    CheckRSI -->|Si| CheckAdmin{"Admin? (rank >= 4)"}
    
    CheckAdmin -->|Si| AdminAccess["Accesso admin completo\n(bot, sync, utenti)"]
    CheckAdmin -->|No| UserAccess["Accesso utente standard\n(membri, eventi, profilo)"]
    
    ShowVerifyUI --> GenCode["POST /api/v1/auth/verification-code\nGenera codice [LSE:XXXXXX]"]
    GenCode --> AddToBio["Utente aggiunge codice\na bio RSI"]
    AddToBio --> VerifyRSI["POST /api/v1/auth/verify-rsi-code"]
    
    VerifyRSI --> ScrapeBio["Scrape profilo RSI\ncerca codice in bio"]
    ScrapeBio --> CodeFound{"Codice trovato?"}
    CodeFound -->|No| RSIFail["Verifica fallita"]
    CodeFound -->|Si| CheckRank["Scrape pagina org\nverifica rank >= 4"]
    
    CheckRank --> RankOK{"Rank >= 4?"}
    RankOK -->|No| RSIFail
    RankOK -->|Si| CheckMainOrg["Scrape main org\n= Logistic Space Economy?"]
    
    CheckMainOrg --> OrgOK{"Main org corretta?"}
    OrgOK -->|No| RSIFail
    OrgOK -->|Si| UpdateUser["Aggiorna User:\nrsiVerified=true,\norganizationRank,\nrsiHandle, rsiAvatar"]
    
    UpdateUser --> GrantAccess["Accesso completo"]
    
    ErrorLogin --> Start
    RSIFail --> ShowVerifyUI
    RedirectToLogin --> Start
```

## Flusso Gestione Membri

```mermaid
flowchart TD
    Start([Admin/User accede\npagina membri]) --> LoadMembers["GET /api/v1/members"]
    
    LoadMembers --> QueryDB["MongoDB: find tutti i membri\nfiltra DeletedMember"]
    QueryDB --> ReturnMembers["Restituisci lista membri"]
    ReturnMembers --> RenderUI["Frontend: render lista\ncon filtri e ricerca"]
    
    RenderUI --> Action{"Azione?"}
    
    Action -->|Import| ImportFlow["POST /api/v1/members/import\nupload file .txt/.csv"]
    Action -->|Create| CreateFlow["POST /api/v1/members\nbulk save/upsert"]
    Action -->|Update| UpdateFlow["PUT /api/v1/members/:key"]
    Action -->|Delete| DeleteFlow["DELETE /api/v1/members/:key"]
    Action -->|Validate| ValidateFlow["POST /api/v1/members/:key/validate"]
    Action -->|Reset Val| ResetFlow["PUT /api/v1/members/:key/reset-validation"]
    Action -->|Discord Sync| SyncFlow["POST /api/v1/admin/discord/sync-members"]
    
    ImportFlow --> ParseFile["parseMembers.js:\nparser CSV/TXT"]
    ParseFile --> Dedup["Deduplicazione per key"]
    Dedup --> BulkUpsert["bulkWrite upsert\nin MongoDB"]
    BulkUpsert --> ReturnCount["Restituisci count:\nadded, updated, errors"]
    ReturnCount --> RenderUI
    
    CreateFlow --> BulkUpsert
    
    UpdateFlow --> UpdateDB["findOneAndUpdate\nper key"]
    UpdateDB --> CheckRichiami{"richiami >= 1?"}
    CheckRichiami -->|Si| SetWatchdog["watchdog=true\nidoneita=false"]
    CheckRichiami -->|No| NormalUpdate["Aggiorna campi"]
    SetWatchdog --> UpdateComplete["Aggiorna updatedAt"]
    NormalUpdate --> UpdateComplete
    UpdateComplete --> RenderUI
    
    DeleteFlow --> AuthCheck{"JWT valido?"}
    AuthCheck -->|No| AuthError["Errore 401"]
    AuthCheck -->|Si| SoftDelete["Sposta in DeletedMember\ncon deletedAt, deletedBy"]
    SoftDelete --> RemoveFromActive["Rimuovi da Member"]
    RemoveFromActive --> RenderUI
    
    ValidateFlow --> ScrapeRSI["Scrape RSI org\nper member.affiliazioniOrg"]
    ScrapeRSI --> OrgCheck{"Validazione:\n1 org sola?\nmain org = LSE?"}
    OrgCheck -->|Si| ValidOrg["orgValidation.isValid=true"]
    OrgCheck -->|No| InvalidOrg["orgValidation.isValid=false\nissues[]"]
    ValidOrg --> UpdateMember["Aggiorna Member"]
    InvalidOrg --> UpdateMember
    UpdateMember --> RenderUI
    
    ResetFlow --> ResetDB["Reset orgValidation\na null"]
    ResetDB --> RenderUI
    
    SyncFlow --> CheckMode{"Dry-run o Live?"}
    CheckMode -->|Dry-run| DryRun["Leggi Discord\nnon scrivere DB"]
    CheckMode -->|Live| LiveSync["DiscordMemberSyncService:\nfetch guild members"]
    
    LiveSync --> Normalize["Normalizza dati Discord\nescludi bot"]
    Normalize --> Compare["Confronta con MongoDB\nper Member.id"]
    Compare --> BulkWrite["bulkWrite upsert"]
    BulkWrite --> SaveJob["Salva DiscordSyncRun\ncon result stats"]
    
    DryRun --> Report["Report:\nreadFromDiscord,\nskippedBots, added,\nupdated, unchanged"]
    SaveJob --> Report
    Report --> RenderUI
```

## Flusso Gestione Eventi

```mermaid
flowchart TD
    Start([Utente accede\ncalendario]) --> LoadEvents["GET /api/v1/events\ncon filtri opzionali"]
    
    LoadEvents --> QueryDB["MongoDB: find eventi\nfiltri: upcoming, type,\ndate range"]
    QueryDB --> ReturnEvents["Restituisci lista eventi"]
    ReturnEvents --> RenderCalendar["Frontend: render calendario\nbloc/calendar/*"]
    
    RenderCalendar --> Action{"Azione?"}
    
    Action -->|Create| CreateEvent["POST /api/v1/events\ntitle, date, time, type, location"]
    Action -->|Update| UpdateEvent["PUT /api/v1/events/:id"]
    Action -->|Delete| DeleteEvent["DELETE /api/v1/events/:id"]
    Action -->|Drag&Drop| MoveEvent["PUT /api/v1/events/:id\naggiorna date/time"]
    
    CreateEvent --> ValidateEvent["Valida input"]
    ValidateEvent --> SaveEvent["Salva in MongoDB"]
    SaveEvent --> DiscordWebhook["Invia Discord webhook\nembed notifica nuovo evento"]
    DiscordWebhook --> RefreshUI["Aggiorna UI"]
    
    UpdateEvent --> UpdateDB["findOneAndUpdate"]
    UpdateDB --> DiscordWebhookUpdate["Invia Discord webhook\nembed aggiornamento"]
    DiscordWebhookUpdate --> RefreshUI
    
    DeleteEvent --> DeleteDB["findOneAndDelete"]
    DeleteDB --> DiscordWebhookDelete["Invia Discord webhook\nembed cancellazione"]
    DiscordWebhookDelete --> RefreshUI
    
    MoveEvent --> UpdateDB
```

## Flusso Discord Bot Integration

```mermaid
flowchart TD
    Start([Admin da UI\npannello Discord]) --> Action{"Azione?"}
    
    Action -->|Start Bot| StartBot["POST /api/v1/admin/discord/start"]
    Action -->|Stop Bot| StopBot["POST /api/v1/admin/discord/stop"]
    Action -->|Sync Membri| SyncMembers["POST /api/v1/admin/discord/sync-members"]
    Action -->|Stato Bot| BotStatus["GET /api/v1/admin/discord/status"]
    Action -->|Storico Sync| SyncHistory["GET /api/v1/admin/discord/sync-history"]
    
    StartBot --> CheckEnv{"DISCORD_BOT_TOKEN\npresente?"}
    CheckEnv -->|No| EnvError["Errore: token mancante"]
    CheckEnv -->|Si| InitBot["Inizializza discord.js client"]
    InitBot --> LoginBot["client.login()"]
    LoginBot --> Ready["Bot ready\nconnesso a guild"]
    Ready --> StartListener["Avvia guildMemberUpdate listener"]
    
    StopBot --> DestroyBot["client.destroy()"]
    DestroyBot --> BotStopped["Bot disconnesso"]
    
    SyncMembers --> CreateJob["Crea job asincrono\nrestituisci jobId"]
    CreateJob --> PollJob["Frontend: polling\nGET /api/v1/admin/jobs/:jobId"]
    
    PollJob --> RunSync["DiscordMemberSyncService.syncMembers()"]
    RunSync --> FetchGuild["guild.members.fetch()"]
    FetchGuild --> ExcludeBots["Filtra user.bot=false"]
    ExcludeBots --> Normalize["Normalizza: id, name, date, tag"]
    Normalize --> CompareDB["Confronta con MongoDB"]
    CompareDB --> BulkWrite["bulkWrite upsert"]
    BulkWrite --> SaveRun["Salva DiscordSyncRun"]
    SaveRun --> Complete["Job completed"]
    
    StartListener --> OnRoleChange["guildMemberUpdate event"]
    OnRoleChange --> MapRoles["Map Discord roles → Member tags\nOPERATORE/LSE → LSE\nP-LSE/LSE-P → LSE-P"]
    MapRoles --> UpdateMemberDB["Aggiorna Member.tag"]
    UpdateMemberDB --> NotifyUI["Notifica frontend\n(update in real-time)"]
    
    BotStopped --> UpdateStatus["Aggiorna stato bot\nin memoria"]
    Complete --> UpdateStatus
    NotifyUI --> UpdateStatus
    EnvError --> UpdateStatus
```

## Flusso RSI Web Scraper

```mermaid
flowchart TD
    Start([Richiesta org\nmembro]) --> CheckCache["GET /api/v1/rsi/orgs/:handle"]
    
    CheckCache --> RedisLookup["Redis: cerca cache\ncon key versionata"]
    RedisLookup --> CacheHit{"Cache hit?"}
    
    CacheHit -->|Si| ReturnCached["Restituisci dati cached"]
    CacheHit -->|No| ScrapeRSI["Scrape RSI website\nrobertsspaceindustries.com"]
    
    ScrapeRSI --> FetchPage["HTTP GET profilo utente"]
    FetchPage --> ParseHTML["Cheerio: parse HTML"]
    ParseHTML --> ExtractOrgs["Estrai organizzazioni"]
    
    ExtractOrgs --> Fallback{"Fallback strategy\nse parse fallisce?"}
    Fallback -->|Si| AltParse["Parser alternativo\nregex/selector diversi"]
    Fallback -->|No| ValidateOrgs["Validazione:\n1. Solo 1 org?\n2. Main org = LSE/ALSE?"]
    
    AltParse --> ValidateOrgs
    
    ValidateOrgs --> Result{"Validazione OK?"}
    Result -->|Si| ValidOrg["isValid=true\nhasOnlyOneOrg=true\nmainOrgName=LSE"]
    Result -->|No| InvalidOrg["isValid=false\nissues[] dettagliati"]
    
    ValidOrg --> CacheResult["Salva in Redis\ncon TTL + version key"]
    InvalidOrg --> CacheResult
    
    CacheResult --> ReturnResult["Restituisci orgValidation\ncon issues se presenti"]
    ReturnCached --> End([Fine])
    ReturnResult --> End
```

## Struttura Database

```mermaid
erDiagram
    Member {
        Number key PK
        String index
        String tag
        String name
        String id "Discord ID"
        String date
        Boolean idoneita
        Boolean watchdog
        Boolean promoted
        String affiliazioniOrg
        Object orgValidation
        String note
        Number richiami
        DateTime createdAt
        DateTime updatedAt
    }
    
    DeletedMember {
        Number key PK
        String index
        String tag
        String name
        String id
        String date
        Boolean idoneita
        Boolean watchdog
        Boolean promoted
        String affiliazioniOrg
        Object orgValidation
        String note
        Number richiami
        DateTime deletedAt
        String deletedBy
        DateTime originalCreatedAt
        DateTime originalUpdatedAt
        Array deletionReasons
    }
    
    PromotedMember {
        Number key PK
        String index
        String tag
        String name
        String id
        String date
        Boolean idoneita
        Boolean watchdog
        Boolean promoted
        String affiliazioniOrg
        Object orgValidation
        String note
        Number richiami
        DateTime promotedAt
        String promotedBy
        String originalMemberId FK
        String promotionReason
    }
    
    User {
        String username PK
        String password "hashed"
        String rsiHandle
        Boolean rsiVerified
        String rsiAvatar
        Number organizationRank
        Boolean verificationCodeFound
        Boolean verificationRankVerified
        Boolean verificationMainOrgVerified
        String mainOrgName
        DateTime createdAt
        DateTime updatedAt
    }
    
    Event {
        String _id PK
        String title
        String description
        Date date
        String startTime
        String endTime
        String location
        String type
        String createdBy
        DateTime createdAt
        DateTime updatedAt
    }
    
    DiscordSyncRun {
        String jobId PK
        String triggeredBy
        String mode
        String status
        Object result
        DateTime startedAt
        DateTime finishedAt
    }
    
    Member ||--o{ DeletedMember : "soft delete"
    Member ||--o{ PromotedMember : "promotion"
    User ||--o{ Member : "manages"
    User ||--o{ Event : "creates"
    User ||--o{ DiscordSyncRun : "triggers"
```

## Middleware Chain Dettagliato

```mermaid
flowchart LR
    A["1. dotenv\nenv variables"] --> B["2. Helmet\nsecurity headers"]
    B --> C["3. CORS\nallowed origins"]
    C --> D["4. HTTPS Redirect\nprod only"]
    D --> E["5. Global Rate Limiter\n100K/15min per IP"]
    E --> F["6. Login Rate Limiter\n5/15min"]
    F --> G["7. Register Rate Limiter\n5/hour"]
    G --> H["8. Strict Rate Limiter\n10/hour DELETE"]
    H --> I["9. express.json()\nbody parsing"]
    I --> J["10. Debug Endpoint\ndev only"]
    J --> K["11. API Versioning\nextract v1/v2"]
    K --> L["12. Legacy Redirect\n/api/* → /api/v1/*"]
    L --> M["13. Winston Logger\nrequest logging"]
    M --> N["14. MongoDB Check\non DB routes"]
    N --> O["15. JWT Auth\nprotected routes"]
    O --> P["16. API Key Auth\nbot sync routes"]
    P --> Q["17. Admin Auth\nrequireAdmin"]
    Q --> R["Route Handler"]
```

## Flusso Dati Completo: Request → Response

```mermaid
flowchart TD
    User["Utente Browser"] -->|"Naviga URL"| NextJS["Next.js App Router\nsrc/app/*"]
    
    NextJS -->|"Server-side render"| Layout["layout.jsx\nproviders + metadata"]
    Layout --> Page["page.jsx\ncontenuto pagina"]
    
    Page -->|"Client-side"| Context["Context Providers\nAuth, Members, Events"]
    Context -->|"useState/useEffect"| Hooks["Custom Hooks\nlogica di dominio"]
    Hooks -->|"fetch()"| Services["API Services\nchiamate HTTP"]
    
    Services -->|"HTTPS"| Backend["Express.js Backend\n:5000"]
    
    Backend --> Middleware["Middleware Chain\n17 layer"]
    Middleware --> Router["Route Handler"]
    
    Router -->|"auth routes"| AuthModule["Auth: JWT, bcrypt,\nRSI verification"]
    Router -->|"members routes"| MembersModule["Members: CRUD,\nimport, validation"]
    Router -->|"events routes"| EventsModule["Events: CRUD,\nDiscord webhook"]
    Router -->|"rsi routes"| RSIModule["RSI: scrape,\nRedis cache"]
    Router -->|"discord routes"| DiscordModule["Discord: bot,\nsync, admin"]
    
    AuthModule --> MongoDB["MongoDB\npersistenza"]
    MembersModule --> MongoDB
    EventsModule --> MongoDB
    EventsModule --> DiscordWebhook["Discord Webhook\nnotifiche"]
    RSIModule --> Redis["Redis\ncache"]
    RSIModule --> RSIExternal["RSI Website\nscraping"]
    DiscordModule --> DiscordAPI["Discord API\nbot + guild"]
    DiscordModule --> MongoDB
    
    MongoDB -->|"JSON"| Backend
    Redis -->|"cached"| Backend
    DiscordWebhook -->|"notification"| DiscordAPI
    DiscordAPI -->|"data"| Backend
    
    Backend -->|"JSON Response"| Services
    Services -->|"update state"| Hooks
    Hooks -->|"re-render"| Context
    Context -->|"UI update"| Page
    Page -->|"render"| User
```

## Riepilogo Endpoint API

| Metodo | Percorso | Auth | Descrizione |
|--------|----------|------|-------------|
| GET | `/` | Nessuna | Index API |
| GET | `/api/v1/health` | Nessuna | Health check |
| GET | `/api/v1/rsi/orgs/:handle` | Nessuna | Scraper org RSI |
| POST | `/api/v1/auth/register` | Nessuna + Rate Limit | Registrazione utente |
| POST | `/api/v1/auth/login` | Nessuna + Rate Limit | Login (JWT) |
| GET | `/api/v1/auth/verify` | JWT | Verifica token |
| POST | `/api/v1/auth/logout` | JWT | Logout |
| PUT | `/api/v1/auth/change-password` | JWT | Cambio password |
| POST | `/api/v1/auth/verification-code` | JWT | Genera codice RSI |
| POST | `/api/v1/auth/verify-rsi-code` | JWT | Verifica identità RSI |
| PUT | `/api/v1/auth/profile` | JWT | Aggiorna profilo |
| POST | `/api/v1/members` | Nessuna | Bulk save membri |
| GET | `/api/v1/members` | Nessuna | Lista membri |
| PUT | `/api/v1/members/:key` | Nessuna | Aggiorna membro |
| DELETE | `/api/v1/members/:key` | JWT + Rate Limit | Soft delete membro |
| POST | `/api/v1/members/:key/validate` | JWT | Validazione org RSI |
| PUT | `/api/v1/members/reset-validation/all` | JWT | Reset tutte le validazioni |
| PUT | `/api/v1/members/:key/reset-validation` | JWT | Reset validazione singola |
| POST | `/api/v1/members/import` | Nessuna | Import CSV/TXT |
| GET | `/api/v1/deleted-members` | Nessuna | Lista membri eliminati |
| POST | `/api/v1/deleted-members/:key/restore` | Nessuna | Ripristina membro |
| GET | `/api/v1/events` | Nessuna | Lista eventi |
| GET | `/api/v1/events/:id` | Nessuna | Singolo evento |
| POST | `/api/v1/events` | Nessuna | Crea evento |
| PUT | `/api/v1/events/:id` | Nessuna | Aggiorna evento |
| DELETE | `/api/v1/events/:id` | Nessuna | Elimina evento |
| GET/POST | `/api/v1/sync/members` | API Key o JWT | Sync bot membri |
| GET/POST | `/api/v1/sync/events` | API Key o JWT | Sync bot eventi |
| POST | `/api/v1/import/bot-events` | Nessuna | Import eventi bot |
| GET | `/api/v1/discord/avatar/:userId` | JWT | Avatar Discord |
| GET | `/api/v1/admin/discord/status` | JWT + Admin | Stato bot |
| POST | `/api/v1/admin/discord/start` | JWT + Admin | Avvia bot |
| POST | `/api/v1/admin/discord/stop` | JWT + Admin | Ferma bot |
| POST | `/api/v1/admin/discord/sync-members` | JWT + Admin | Sync membri |
| GET | `/api/v1/admin/jobs/:jobId` | JWT + Admin | Stato job |
| GET | `/api/v1/admin/discord/sync-history` | JWT + Admin | Storico sync |
| GET | `/api/v1/admin/users` | JWT + Admin | Lista utenti |

## Regole di Business

| Regola | Descrizione |
|--------|-------------|
| **Richiami** | Quando `richiami >= 1` → `watchdog=true`, `idoneita=false` |
| **Soft Delete** | Membri eliminati spostati in `DeletedMember` (audit trail) |
| **RSI Validation** | 1 sola org, main org = "Logistic Space Economy" o "ALSE" |
| **Discord Webhook** | Notifiche su create/update/delete eventi |
| **Redis Cache** | Cache risultati RSI scraper con key versionate |
| **Rate Limiting** | Global: 100K/15min, Login: 5/15min, Register: 5/hour, DELETE: 10/hour |
| **JWT Expiry** | Token scade dopo 24 ore |
| **Admin Access** | Richiede `rsiVerified=true` AND `organizationRank >= 4` |
| **Bot Access** | Supporta JWT Bearer o X-API-Key header |
| **Sync Mode** | Dry-run (sola lettura) o Live (scrittura DB) |
