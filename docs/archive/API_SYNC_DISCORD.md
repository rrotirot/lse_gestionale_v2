# API di Sincronizzazione per Bot Discord

Questo documento descrive come sincronizzare i dati tra la web app e un bot Discord esistente.

## 🔐 Autenticazione

Tutti gli endpoint di sincronizzazione richiedono autenticazione. Sono supportati due metodi:

### 1. API Key (Consigliato per bot)
```
Header: X-API-Key: <your-api-key>
```
oppure
```
Header: Authorization: ApiKey <your-api-key>
```

### 2. JWT Token (Per utenti web)
```
Header: Authorization: Bearer <jwt-token>
```

### Configurazione

Aggiungi nel file `.env` del backend:
```env
API_KEY=your-secret-api-key-here
# oppure
DISCORD_BOT_API_KEY=your-secret-api-key-here
```

## 📋 Endpoint Disponibili

### 0. Test Autenticazione

#### GET `/api/sync/test`
Testa la connessione e verifica che l'autenticazione funzioni correttamente.

**Esempio Richiesta:**
```bash
curl -X GET "http://localhost:5000/api/sync/test" \
  -H "X-API-Key: your-api-key"
```

**Risposta:**
```json
{
  "success": true,
  "message": "Autenticazione valida",
  "authType": "api-key",
  "isBot": true,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### 1. Sincronizzazione Membri

#### GET `/api/sync/members`
Ottiene la lista dei membri dal database.

**Query Parameters:**
- `since` (opzionale): Timestamp ISO o timestamp per sincronizzazione incrementale
  - Esempio: `?since=2025-01-01T00:00:00.000Z`
- `tag` (opzionale): Filtra per tag specifico
  - Esempio: `?tag=LSE-P`
- `limit` (opzionale): Limita il numero di risultati
  - Esempio: `?limit=100`

**Esempio Richiesta:**
```bash
curl -X GET "http://localhost:5000/api/sync/members?since=2025-01-01T00:00:00.000Z&tag=LSE-P" \
  -H "X-API-Key: your-api-key"
```

**Risposta:**
```json
{
  "success": true,
  "count": 25,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "members": [
    {
      "key": 12345,
      "name": "Nome Membro",
      "id": "discord-id",
      "tag": "LSE-P",
      "index": "1",
      "date": "2024-01-01",
      "idoneita": true,
      "watchdog": false,
      "promoted": false,
      "affiliazioniOrg": "...",
      "orgValidation": {
        "isValid": true,
        "hasOnlyOneOrg": true,
        "hasMainName": true,
        "mainOrgName": "LSE",
        "issues": []
      },
      "note": "Note del membro",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

#### POST `/api/sync/members`
Sincronizza membri dal bot al database (bulk update).

**Body:**
```json
{
  "members": [
    {
      "key": 12345,
      "name": "Nome Membro",
      "id": "discord-id",
      "tag": "LSE-P",
      "index": "1",
      "date": "2024-01-01",
      "idoneita": true,
      "watchdog": false,
      "promoted": false,
      "affiliazioniOrg": "...",
      "orgValidation": {...},
      "note": "Note del membro"
    }
  ],
  "syncMode": "merge" // opzionale: "merge" o "replace"
}
```

**Esempio Richiesta:**
```bash
curl -X POST "http://localhost:5000/api/sync/members" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "members": [
      {
        "key": 12345,
        "name": "Nome Membro",
        "tag": "LSE-P"
      }
    ]
  }'
```

**Risposta:**
```json
{
  "success": true,
  "message": "Sincronizzazione completata",
  "inserted": 5,
  "updated": 20,
  "total": 25
}
```

### 2. Sincronizzazione Eventi

#### GET `/api/sync/events`
Ottiene la lista degli eventi dal database.

**Query Parameters:**
- `since` (opzionale): Timestamp per sincronizzazione incrementale
- `upcoming` (opzionale): Solo eventi futuri (`true`/`false`)
- `type` (opzionale): Filtra per tipo (`evento`, `riunione`, `attività`, `altro`)
- `limit` (opzionale): Limita il numero di risultati

**Esempio Richiesta:**
```bash
curl -X GET "http://localhost:5000/api/sync/events?upcoming=true&type=riunione" \
  -H "X-API-Key: your-api-key"
```

**Risposta:**
```json
{
  "success": true,
  "count": 10,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "events": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Riunione Generale",
      "description": "Descrizione evento",
      "date": "2025-02-01T00:00:00.000Z",
      "startTime": "20:00",
      "endTime": "22:00",
      "location": "Discord",
      "type": "riunione",
      "createdBy": "system",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

#### POST `/api/sync/events`
Sincronizza eventi dal bot al database (bulk update).

**Body:**
```json
{
  "events": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Riunione Generale",
      "description": "Descrizione evento",
      "date": "2025-02-01",
      "startTime": "20:00",
      "endTime": "22:00",
      "location": "Discord",
      "type": "riunione"
    }
  ]
}
```

**Nota:** Questo endpoint aggiorna solo eventi esistenti (non crea nuovi eventi).

### 3. Stato Sincronizzazione

#### GET `/api/sync/status`
Ottiene lo stato della sincronizzazione (utile per verificare quando è stata l'ultima modifica).

**Esempio Richiesta:**
```bash
curl -X GET "http://localhost:5000/api/sync/status" \
  -H "X-API-Key: your-api-key"
```

**Risposta:**
```json
{
  "success": true,
  "status": {
    "members": {
      "total": 150,
      "lastUpdate": "2025-01-15T10:00:00.000Z"
    },
    "events": {
      "total": 25,
      "lastUpdate": "2025-01-15T09:30:00.000Z"
    },
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

## 🔄 Strategia di Sincronizzazione

### Sincronizzazione Incrementale (Consigliata)

1. **Prima sincronizzazione:**
   ```bash
   GET /api/sync/members
   GET /api/sync/events
   ```
   Salva il timestamp della risposta.

2. **Sincronizzazioni successive:**
   ```bash
   GET /api/sync/members?since=<ultimo-timestamp>
   GET /api/sync/events?since=<ultimo-timestamp>
   ```
   Ottieni solo i dati modificati dall'ultima sincronizzazione.

### Sincronizzazione Completa

Per una sincronizzazione completa, omettere il parametro `since`:
```bash
GET /api/sync/members
GET /api/sync/events
```

## 📝 Esempio di Integrazione Python (Discord.py)

```python
import aiohttp
import asyncio
from datetime import datetime

API_BASE_URL = "http://localhost:5000"
API_KEY = "your-api-key"

async def sync_members():
    headers = {"X-API-Key": API_KEY}
    
    async with aiohttp.ClientSession() as session:
        # Ottieni membri modificati nell'ultima ora
        since = (datetime.now() - timedelta(hours=1)).isoformat()
        async with session.get(
            f"{API_BASE_URL}/api/sync/members",
            params={"since": since},
            headers=headers
        ) as response:
            data = await response.json()
            if data["success"]:
                members = data["members"]
                # Processa i membri nel bot
                for member in members:
                    print(f"Membro: {member['name']} ({member['tag']})")

async def sync_events():
    headers = {"X-API-Key": API_KEY}
    
    async with aiohttp.ClientSession() as session:
        # Ottieni solo eventi futuri
        async with session.get(
            f"{API_BASE_URL}/api/sync/events",
            params={"upcoming": "true"},
            headers=headers
        ) as response:
            data = await response.json()
            if data["success"]:
                events = data["events"]
                # Processa gli eventi nel bot
                for event in events:
                    print(f"Evento: {event['title']} - {event['date']}")

# Esegui sincronizzazione ogni 5 minuti
async def periodic_sync():
    while True:
        await sync_members()
        await sync_events()
        await asyncio.sleep(300)  # 5 minuti

# Avvia sincronizzazione
asyncio.run(periodic_sync())
```

## 📝 Esempio di Integrazione JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';
const API_KEY = 'your-api-key';

const headers = {
  'X-API-Key': API_KEY,
  'Content-Type': 'application/json'
};

// Sincronizza membri
async function syncMembers(since = null) {
  try {
    const params = since ? { since } : {};
    const response = await axios.get(`${API_BASE_URL}/api/sync/members`, {
      headers,
      params
    });
    
    if (response.data.success) {
      console.log(`Ricevuti ${response.data.count} membri`);
      return response.data.members;
    }
  } catch (error) {
    console.error('Errore sincronizzazione membri:', error.message);
  }
}

// Sincronizza eventi
async function syncEvents(upcoming = true) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/sync/events`, {
      headers,
      params: { upcoming: upcoming.toString() }
    });
    
    if (response.data.success) {
      console.log(`Ricevuti ${response.data.count} eventi`);
      return response.data.events;
    }
  } catch (error) {
    console.error('Errore sincronizzazione eventi:', error.message);
  }
}

// Invia membri al database
async function sendMembers(members) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/sync/members`, {
      members
    }, { headers });
    
    if (response.data.success) {
      console.log(`Sincronizzati ${response.data.total} membri`);
    }
  } catch (error) {
    console.error('Errore invio membri:', error.message);
  }
}

// Esegui sincronizzazione ogni 5 minuti
setInterval(async () => {
  const members = await syncMembers();
  const events = await syncEvents();
  // Processa i dati nel bot
}, 5 * 60 * 1000);
```

## ⚠️ Note Importanti

1. **Rate Limiting**: Attualmente non c'è rate limiting, ma è consigliato non fare più di una richiesta al secondo.

2. **Sincronizzazione Bidirezionale**: 
   - La web app può modificare i dati tramite l'interfaccia
   - Il bot può sincronizzare i dati tramite questi endpoint
   - Usa la sincronizzazione incrementale per evitare conflitti

3. **Timestamp**: Usa sempre il formato ISO 8601 per i timestamp (`YYYY-MM-DDTHH:mm:ss.sssZ`).

4. **Error Handling**: Tutti gli endpoint restituiscono `success: false` in caso di errore. Gestisci sempre gli errori nel bot.

5. **Bulk Operations**: Gli endpoint POST supportano operazioni bulk per migliorare le performance.

## 🔒 Sicurezza

- Mantieni l'API Key segreta e non committarla nel repository
- Usa HTTPS in produzione
- Considera l'aggiunta di rate limiting per prevenire abusi
- Valida sempre i dati prima di inviarli al database

## 📞 Supporto

Per problemi o domande, consulta i log del backend o contatta il team di sviluppo.

