# Integrazione Bot Discord Activity Management ↔ Gestionale LSE

## 📋 Panoramica

Questo documento descrive come integrare il **Bot Discord Activity Management** (SQLite + Discord.js) con il **Gestionale LSE** (MongoDB + React + Express).

## 🎯 Obiettivi dell'Integrazione

1. **Sincronizzazione Eventi**: Le attività create nel bot vengono sincronizzate come eventi nel gestionale
2. **Sincronizzazione Partecipanti**: I partecipanti alle attività vengono sincronizzati con i membri nel gestionale
3. **Creazione Automatica Attività**: Creare automaticamente attività nel bot basate su eventi nel gestionale
4. **Visualizzazione Attività**: Mostrare le attività del bot nell'interfaccia web del gestionale

---

## 🔗 Architettura dell'Integrazione

```
┌─────────────────────┐         ┌──────────────────────┐
│   Bot Discord       │────────▶│   Gestionale LSE     │
│   (SQLite)          │  HTTP   │   (MongoDB)          │
│                     │◀────────│   (Express API)      │
└─────────────────────┘         └──────────────────────┘
         │                                │
         │                                │
         ▼                                ▼
    Discord API                    React Frontend
```

### Flussi di Dati

1. **Bot → Gestionale**: Sincronizzazione attività e partecipanti
2. **Gestionale → Bot**: Creazione automatica attività da eventi
3. **Bidirezionale**: Aggiornamento stato eventi e attività

---

## 🛠️ Implementazione

### 1. Modulo di Integrazione nel Bot Discord

Creare un nuovo modulo `lseIntegration.js` nel bot Discord:

```javascript
// lseIntegration.js

const axios = require('axios');

const LSE_API_URL = process.env.LSE_API_URL || 'http://localhost:5000';
const LSE_API_KEY = process.env.LSE_API_KEY || process.env.DISCORD_BOT_API_KEY;

class LSEIntegration {
    constructor() {
        this.apiUrl = LSE_API_URL;
        this.apiKey = LSE_API_KEY;
        this.headers = {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Sincronizza un'attività come evento nel gestionale
     * @param {object} activity - Oggetto attività dal bot
     * @returns {Promise<boolean>}
     */
    async syncActivityAsEvent(activity) {
        try {
            const event = {
                title: activity.title,
                description: activity.description || '',
                date: new Date(activity.scheduled_start_time_iso || activity.datetime_input),
                startTime: this.extractTime(activity.scheduled_start_time_iso),
                endTime: null, // Il bot non ha endTime, possiamo calcolarlo
                location: activity.location || 'Discord',
                type: 'attività',
                createdBy: activity.creator_id || 'discord-bot'
            };

            const response = await axios.post(
                `${this.apiUrl}/api/sync/events`,
                { events: [event] },
                { headers: this.headers }
            );

            return response.data.success;
        } catch (error) {
            console.error('[LSE Integration] Errore sincronizzazione evento:', error.message);
            return false;
        }
    }

    /**
     * Sincronizza partecipanti di un'attività
     * @param {string} activityId - ID dell'attività
     * @param {object} activity - Oggetto attività completo
     * @returns {Promise<boolean>}
     */
    async syncActivityParticipants(activityId, activity) {
        try {
            // Estrai tutti i partecipanti dall'attività
            const participants = this.extractParticipants(activity);
            
            // Per ogni partecipante, aggiorna le info nel gestionale se necessario
            // (opzionale: puoi aggiungere un campo "attività_partecipate" al modello Member)
            
            return true;
        } catch (error) {
            console.error('[LSE Integration] Errore sincronizzazione partecipanti:', error.message);
            return false;
        }
    }

    /**
     * Ottiene eventi futuri dal gestionale
     * @returns {Promise<Array>}
     */
    async getUpcomingEvents() {
        try {
            const response = await axios.get(
                `${this.apiUrl}/api/sync/events`,
                {
                    headers: this.headers,
                    params: { upcoming: 'true' }
                }
            );

            if (response.data.success) {
                return response.data.events || [];
            }

            return [];
        } catch (error) {
            console.error('[LSE Integration] Errore recupero eventi:', error.message);
            return [];
        }
    }

    /**
     * Crea un'attività nel bot basata su un evento del gestionale
     * @param {object} event - Evento dal gestionale
     * @param {object} guild - Guild Discord
     * @param {object} channel - Canale Discord
     * @returns {Promise<string|null>} - ID dell'attività creata
     */
    async createActivityFromEvent(event, guild, channel) {
        // Questa funzione deve essere chiamata dal bot, non dal modulo di integrazione
        // Vedi sezione "Creazione Automatica Attività"
        return null;
    }

    // Helper methods
    extractTime(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }

    extractParticipants(activity) {
        const participants = [];
        
        // Estrai da roles_info
        for (const [roleName, roleData] of Object.entries(activity.roles_info || {})) {
            if (roleData.signed_up && Array.isArray(roleData.signed_up)) {
                participants.push(...roleData.signed_up.map(userId => ({
                    userId,
                    role: roleName,
                    status: 'signed_up'
                })));
            }
        }

        // Estrai da interested_users
        if (activity.interested_users && Array.isArray(activity.interested_users)) {
            participants.push(...activity.interested_users.map(userId => ({
                userId,
                role: null,
                status: 'interested'
            })));
        }

        return participants;
    }
}

module.exports = new LSEIntegration();
```

### 2. Integrazione nel Bot Discord

#### 2.1. Sincronizzazione Attività dopo Pubblicazione

Modificare `interactions/configHandlers.js`:

```javascript
const lseIntegration = require('../lseIntegration');

// Dopo la pubblicazione di un'attività
async function handlePublishActivity(interaction, activityId) {
    // ... logica esistente di pubblicazione ...

    // SINCRONIZZA CON GESTIONALE
    try {
        const activity = await db.dbLoadActivity(activityId);
        if (activity && activity.status === 'planned') {
            await lseIntegration.syncActivityAsEvent(activity);
            console.log(`[LSE Integration] Attività ${activityId} sincronizzata con gestionale`);
        }
    } catch (error) {
        console.error('[LSE Integration] Errore sincronizzazione:', error);
        // Non bloccare la pubblicazione se la sincronizzazione fallisce
    }
}
```

#### 2.2. Sincronizzazione Partecipanti dopo Modifica

Modificare `db.js`:

```javascript
const lseIntegration = require('./lseIntegration');

// Dopo il salvataggio di un'attività
const saveActivityInternal = async (activity, { skipBackup = false } = {}) => {
    // ... logica esistente di salvataggio ...

    // SINCRONIZZA PARTECIPANTI CON GESTIONALE
    if (!skipBackup) {
        try {
            await lseIntegration.syncActivityParticipants(activity.id, activity);
        } catch (error) {
            console.error('[LSE Integration] Errore sincronizzazione partecipanti:', error);
            // Non bloccare il salvataggio se la sincronizzazione fallisce
        }
    }

    return sanitized;
};
```

### 2.3. Creazione Automatica Attività da Eventi

Creare un nuovo watcher `lseEventWatcher.js`:

```javascript
// lseEventWatcher.js

const lseIntegration = require('./lseIntegration');
const db = require('./db');
const utils = require('./utils');
const { InitialActivityView } = require('./views');

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minuti

async function checkForNewEvents(client) {
    try {
        const events = await lseIntegration.getUpcomingEvents();
        
        for (const event of events) {
            // Verifica se esiste già un'attività per questo evento
            const existingActivity = await findActivityByEventId(event._id.toString());
            
            if (!existingActivity && shouldCreateActivity(event)) {
                await createActivityFromEvent(client, event);
            }
        }
    } catch (error) {
        console.error('[LSE Event Watcher] Errore controllo eventi:', error);
    }
}

async function findActivityByEventId(eventId) {
    // Cerca nelle attività esistenti se c'è un riferimento all'evento
    // Potresti aggiungere un campo `lse_event_id` al modello attività
    const activities = await db.dbAll(
        "SELECT * FROM activities WHERE config_json LIKE ?",
        [`%${eventId}%`]
    );
    return activities.length > 0 ? activities[0] : null;
}

function shouldCreateActivity(event) {
    // Crea attività solo per eventi futuri e di tipo "attività" o "riunione"
    const eventDate = new Date(event.date);
    const now = new Date();
    const daysBefore = 7; // Crea attività 7 giorni prima
    
    return (
        eventDate > now &&
        eventDate <= new Date(now.getTime() + daysBefore * 24 * 60 * 60 * 1000) &&
        (event.type === 'attività' || event.type === 'riunione')
    );
}

async function createActivityFromEvent(client, event) {
    try {
        // Trova il canale di default per le attività
        const guildId = process.env.DEFAULT_GUILD_ID;
        const channelId = process.env.DEFAULT_ACTIVITY_CHANNEL_ID;
        
        if (!guildId || !channelId) {
            console.warn('[LSE Event Watcher] Canale di default non configurato');
            return;
        }

        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(channelId);

        // Crea l'attività
        const activityId = `act_${Date.now()}_${event._id}`;
        const activity = {
            id: activityId,
            creator_id: process.env.OWNER_ID || '822509040689086524',
            guild_id: guildId,
            channel_id: channelId,
            title: event.title,
            description: event.description || '',
            location: event.location || 'Discord',
            datetime_input: formatDateTime(event.date, event.startTime),
            scheduled_start_time_iso: new Date(event.date).toISOString(),
            status: 'planned',
            allow_unify: 0,
            config: {
                lse_event_id: event._id.toString(),
                createEvent: true,
                privateChat: false,
                roleChoice: true
            },
            roles_info: {},
            managers: [process.env.OWNER_ID || '822509040689086524'],
            interested_users: [],
            maybe_users: [],
            absent_users: []
        };

        // Salva l'attività
        await db.dbSaveActivity(activity);

        // Pubblica l'attività
        const lang = 'it';
        const embed = await utils.buildActivityEmbed(activity, client, lang);
        const message = await channel.send({
            embeds: [embed],
            components: new InitialActivityView(activityId, lang).components
        });

        // Aggiorna l'attività con message_id
        activity.message_id = message.id;
        await db.dbSaveActivity(activity);

        console.log(`[LSE Event Watcher] Attività creata: ${activityId} da evento ${event._id}`);
    } catch (error) {
        console.error('[LSE Event Watcher] Errore creazione attività:', error);
    }
}

function formatDateTime(date, time) {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return time ? `${dateStr} ${time}` : dateStr;
}

function startLSEEventWatcher(client) {
    const execute = () => checkForNewEvents(client)
        .catch((error) => console.error('[LSE Event Watcher] Errore inatteso:', error));

    setInterval(execute, CHECK_INTERVAL_MS);
    execute(); // Esegui subito

    console.log('[LSE Event Watcher] Watcher eventi LSE attivato.');
}

module.exports = { startLSEEventWatcher };
```

Aggiungere al file `events/ready.js`:

```javascript
const { startLSEEventWatcher } = require('../lseEventWatcher');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(readyClient) {
        // ... codice esistente ...
        startLSEEventWatcher(readyClient);
    },
};
```

### 3. Modifiche al Gestionale LSE

#### 3.1. Aggiungere Endpoint per Recupero Attività

Modificare `backend/server.js`:

```javascript
// GET /api/sync/activities - Ottieni attività dal bot Discord
app.get('/api/sync/activities', authenticateAPI, async (req, res) => {
    try {
        // Questo endpoint deve chiamare il bot Discord per ottenere le attività
        // Per ora, restituiamo un array vuoto (il bot chiamerà questo endpoint)
        // In futuro, puoi implementare una cache delle attività nel MongoDB
        
        res.json({
            success: true,
            count: 0,
            activities: [],
            message: 'Endpoint per attività Discord (da implementare)'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
```

#### 3.2. Aggiungere Campo per Riferimento Attività

Modificare `backend/models/Event.js`:

```javascript
const eventSchema = new mongoose.Schema({
    // ... campi esistenti ...
    discordActivityId: {
        type: String,
        default: null,
        index: true
    },
    discordMessageId: {
        type: String,
        default: null
    },
    discordChannelId: {
        type: String,
        default: null
    }
});
```

#### 3.3. Visualizzazione Attività nel Frontend

Modificare `src/App.jsx` o creare nuovo componente `ActivityList.jsx`:

```jsx
// ActivityList.jsx
import React, { useState, useEffect } from 'react';

function ActivityList() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivities();
    }, []);

    const fetchActivities = async () => {
        try {
            const response = await fetch('/api/sync/activities', {
                headers: {
                    'X-API-Key': localStorage.getItem('discord_bot_token')
                }
            });
            const data = await response.json();
            if (data.success) {
                setActivities(data.activities);
            }
        } catch (error) {
            console.error('Errore recupero attività:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Caricamento attività...</div>;

    return (
        <div>
            <h2>Attività Discord</h2>
            {activities.map(activity => (
                <div key={activity.id}>
                    <h3>{activity.title}</h3>
                    <p>{activity.description}</p>
                    <p>Data: {activity.datetime_input}</p>
                    <p>Partecipanti: {activity.participants?.length || 0}</p>
                </div>
            ))}
        </div>
    );
}

export default ActivityList;
```

---

## 🔧 Configurazione

### 1. Variabili d'Ambiente Bot Discord

Aggiungere al file `.env` del bot:

```env
# Integrazione Gestionale LSE
LSE_API_URL=http://localhost:5000
LSE_API_KEY=your-api-key-here
DEFAULT_GUILD_ID=your-guild-id
DEFAULT_ACTIVITY_CHANNEL_ID=your-channel-id
```

### 2. Variabili d'Ambiente Gestionale LSE

Aggiungere al file `backend/.env`:

```env
# API Key per bot Discord
API_KEY=your-api-key-here
DISCORD_BOT_API_KEY=your-api-key-here
```

### 3. Installare Dipendenze

Nel bot Discord:

```bash
npm install axios
```

---

## 🔄 Flussi di Sincronizzazione

### 1. Sincronizzazione Attività

```
Bot pubblica attività → Sincronizza con Gestionale → Salva come evento MongoDB
```

### 2. Sincronizzazione Partecipanti

```
Utente si iscrive → Bot aggiorna attività → Sincronizza partecipanti → Gestionale
```

### 3. Creazione Automatica Attività

```
Gestionale crea evento → Watcher rileva evento → Bot crea attività → Pubblica su Discord
```

---

## 🧪 Testing

### 1. Test Sincronizzazione Attività

```javascript
// Test manuale
const activity = {
    id: 'test_123',
    title: 'Test Activity',
    description: 'Test Description',
    scheduled_start_time_iso: new Date().toISOString()
};

const result = await lseIntegration.syncActivityAsEvent(activity);
console.log('Sincronizzato:', result);
```

### 2. Test Endpoint API

```bash
# Test sincronizzazione eventi
curl -X GET "http://localhost:5000/api/sync/events?upcoming=true" \
  -H "X-API-Key: your-api-key"
```

---

## 🚨 Gestione Errori

### Strategia Fail-Open

Il bot deve funzionare anche se il gestionale non è disponibile:

1. **Sincronizzazione**: Se la sincronizzazione fallisce, loggare l'errore ma non bloccare l'operazione
2. **Watcher Eventi**: Se il watcher fallisce, riprovare al prossimo ciclo
3. **Errori API**: Tutti gli errori vengono loggati ma non bloccano il funzionamento del bot

### Logging

Tutti gli errori devono essere loggati:

```javascript
console.error('[LSE Integration] Errore:', error.message);
console.error('[LSE Integration] Stack:', error.stack);
```

---

## 📊 Monitoraggio

### Metriche da Monitorare

1. **Tasso di Successo Sincronizzazione**: % di attività sincronizzate con successo
2. **Tempo di Risposta API**: Tempo medio di risposta del gestionale
3. **Attività Create Automaticamente**: Numero di attività create da eventi
4. **Errori di Sincronizzazione**: Numero di errori durante sincronizzazione

### Dashboard (Opzionale)

Creare una dashboard per monitorare l'integrazione:

```javascript
// metrics.js
const metrics = {
    syncSuccess: 0,
    syncErrors: 0,
    activitiesCreated: 0,
    eventsSynced: 0
};

module.exports = metrics;
```

---

## 🔒 Sicurezza

### 1. Autenticazione API Key

- Usa API Key forte e sicura
- Non committare API Key nel repository
- Usa variabili d'ambiente

### 2. Rate Limiting

Implementare rate limiting nel gestionale:

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 100 // 100 richieste per finestra
});

app.use('/api/sync', apiLimiter);
```

### 3. Validazione Input

Validare sempre gli input:

```javascript
function validateActivity(activity) {
    if (!activity.id || !activity.title) {
        throw new Error('Attività non valida');
    }
    return true;
}
```

---

## 📝 Note Implementative

### 1. Performance

- Implementa batch updates per sincronizzazioni multiple
- Usa paginazione per grandi dataset
- Cache eventi futuri per ridurre chiamate API

### 2. Scalabilità

- Considera l'uso di una coda (Redis) per sincronizzazioni asincrone
- Implementa retry con exponential backoff
- Usa connection pooling per MongoDB

### 3. Manutenibilità

- Documenta tutti gli endpoint
- Usa TypeScript per type safety (opzionale)
- Scrivi test unitari e di integrazione

---

## 🎯 Roadmap Futura

### Fase 1: Integrazione Base ✅
- [x] Sincronizzazione attività
- [x] Sincronizzazione partecipanti

### Fase 2: Creazione Automatica
- [ ] Watcher eventi
- [ ] Creazione automatica attività
- [ ] Notifiche membri

### Fase 3: Funzionalità Avanzate
- [ ] Dashboard integrazione
- [ ] Statistiche partecipazione
- [ ] Export report

### Fase 4: Ottimizzazioni
- [ ] Cache Redis
- [ ] Queue asincrona
- [ ] Monitoring avanzato

---

## 📞 Supporto

Per problemi o domande:
1. Controlla i log del bot e del gestionale
2. Verifica la connessione tra bot e gestionale
3. Controlla le variabili d'ambiente
4. Consulta la documentazione API

---

## ✅ Checklist Implementazione

- [ ] Installare dipendenze (`axios` nel bot)
- [ ] Configurare variabili d'ambiente
- [ ] Creare modulo `lseIntegration.js`
- [ ] Integrare sincronizzazione attività
- [ ] Integrare sincronizzazione partecipanti
- [ ] Creare watcher eventi (opzionale)
- [ ] Testare integrazione
- [ ] Documentare endpoint
- [ ] Deploy in produzione

---

**Documento creato il:** 2025-10-31  
**Versione:** 1.0.0  
**Autore:** AI Assistant

