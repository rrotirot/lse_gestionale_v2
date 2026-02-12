/**
 * Esempio di integrazione API di sincronizzazione per Bot Discord (JavaScript/Node.js)
 * Usa questo codice come base per integrare le API nel tuo bot Discord esistente
 */

const axios = require('axios');
// oppure se usi fetch nativo (Node.js 18+):
// const fetch = require('node-fetch'); // o usa fetch globale

class LSESyncAPI {
    /**
     * Classe helper per sincronizzare dati con la web app LSE
     * 
     * @param {string} baseUrl - URL base del backend (es: "http://localhost:5000")
     * @param {string} apiKey - API Key per l'autenticazione
     */
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Rimuovi trailing slash
        this.apiKey = apiKey;
        this.headers = {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        };
        this.lastSyncTimestamp = null;
    }

    /**
     * Testa la connessione e l'autenticazione
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/sync/test`, {
                headers: this.headers
            });

            if (response.data.success) {
                console.log(`✅ Connessione valida: ${response.data.message}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`❌ Errore connessione: ${error.message}`);
            return false;
        }
    }

    /**
     * Ottiene la lista dei membri dal database
     * @param {Object} options - Opzioni di filtro
     * @param {string} options.since - Timestamp ISO per sincronizzazione incrementale
     * @param {string} options.tag - Filtra per tag specifico (es: "LSE-P", "LSE")
     * @param {number} options.limit - Limita il numero di risultati
     * @returns {Promise<Array>}
     */
    async getMembers(options = {}) {
        try {
            const params = {};
            if (options.since) params.since = options.since;
            if (options.tag) params.tag = options.tag;
            if (options.limit) params.limit = options.limit;

            const response = await axios.get(`${this.baseUrl}/api/sync/members`, {
                headers: this.headers,
                params
            });

            if (response.data.success) {
                const members = response.data.members || [];
                console.log(`📥 Ricevuti ${members.length} membri`);
                return members;
            } else {
                console.error(`❌ Errore: ${response.data.error}`);
                return [];
            }
        } catch (error) {
            console.error(`❌ Errore nel recupero membri: ${error.message}`);
            return [];
        }
    }

    /**
     * Sincronizza membri dal bot al database
     * @param {Array} members - Lista di membri da sincronizzare
     * @returns {Promise<boolean>}
     */
    async syncMembers(members) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/sync/members`,
                { members },
                { headers: this.headers }
            );

            if (response.data.success) {
                console.log(
                    `✅ Sincronizzati ${response.data.total} membri ` +
                    `(${response.data.inserted} inseriti, ` +
                    `${response.data.updated} aggiornati)`
                );
                return true;
            } else {
                console.error(`❌ Errore: ${response.data.error}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Errore nella sincronizzazione membri: ${error.message}`);
            return false;
        }
    }

    /**
     * Ottiene la lista degli eventi dal database
     * @param {Object} options - Opzioni di filtro
     * @param {string} options.since - Timestamp ISO per sincronizzazione incrementale
     * @param {boolean} options.upcoming - Solo eventi futuri
     * @param {string} options.type - Filtra per tipo ("evento", "riunione", "attività", "altro")
     * @param {number} options.limit - Limita il numero di risultati
     * @returns {Promise<Array>}
     */
    async getEvents(options = {}) {
        try {
            const params = {};
            if (options.since) params.since = options.since;
            if (options.upcoming) params.upcoming = 'true';
            if (options.type) params.type = options.type;
            if (options.limit) params.limit = options.limit;

            const response = await axios.get(`${this.baseUrl}/api/sync/events`, {
                headers: this.headers,
                params
            });

            if (response.data.success) {
                const events = response.data.events || [];
                console.log(`📅 Ricevuti ${events.length} eventi`);
                return events;
            } else {
                console.error(`❌ Errore: ${response.data.error}`);
                return [];
            }
        } catch (error) {
            console.error(`❌ Errore nel recupero eventi: ${error.message}`);
            return [];
        }
    }

    /**
     * Sincronizza eventi dal bot al database
     * @param {Array} events - Lista di eventi da sincronizzare (devono avere _id o id)
     * @returns {Promise<boolean>}
     */
    async syncEvents(events) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/api/sync/events`,
                { events },
                { headers: this.headers }
            );

            if (response.data.success) {
                console.log(
                    `✅ Sincronizzati ${response.data.total} eventi ` +
                    `(${response.data.updated} aggiornati)`
                );
                return true;
            } else {
                console.error(`❌ Errore: ${response.data.error}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Errore nella sincronizzazione eventi: ${error.message}`);
            return false;
        }
    }

    /**
     * Ottiene lo stato della sincronizzazione
     * @returns {Promise<Object|null>}
     */
    async getSyncStatus() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/sync/status`, {
                headers: this.headers
            });

            if (response.data.success) {
                return response.data.status;
            } else {
                console.error(`❌ Errore: ${response.data.error}`);
                return null;
            }
        } catch (error) {
            console.error(`❌ Errore nel recupero stato: ${error.message}`);
            return null;
        }
    }

    /**
     * Esegue una sincronizzazione incrementale (solo dati modificati)
     * @returns {Promise<Object>}
     */
    async syncIncremental() {
        // Calcola timestamp per sincronizzazione incrementale (ultima ora)
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const results = {
            members: [],
            events: [],
            timestamp: new Date().toISOString()
        };

        // Sincronizza membri
        results.members = await this.getMembers({ since });

        // Sincronizza eventi
        results.events = await this.getEvents({ since, upcoming: true });

        return results;
    }
}

// ==================== ESEMPIO DI USO CON DISCORD.JS ====================

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');

// Configurazione
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const API_KEY = process.env.API_KEY || "your-api-key-here";
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "your-discord-bot-token";

// Inizializza il client API
const lseAPI = new LSESyncAPI(API_BASE_URL, API_KEY);

// Inizializza il bot Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    console.log(`✅ Bot connesso come ${client.user.tag}`);

    // Testa la connessione API
    if (await lseAPI.testConnection()) {
        console.log("✅ API di sincronizzazione connessa");
        // Avvia sincronizzazione periodica
        startPeriodicSync();
    } else {
        console.error("❌ Errore connessione API");
    }
});

// Sincronizzazione periodica ogni 5 minuti
function startPeriodicSync() {
    setInterval(async () => {
        try {
            const results = await lseAPI.syncIncremental();

            if (results.members.length > 0) {
                console.log(`📥 Ricevuti ${results.members.length} membri aggiornati`);
                // Processa i membri nel bot (es: aggiorna ruoli Discord)
                for (const member of results.members) {
                    // Esempio: aggiorna ruolo Discord in base al tag
                    // await updateDiscordRole(member);
                }
            }

            if (results.events.length > 0) {
                console.log(`📅 Ricevuti ${results.events.length} eventi aggiornati`);
                // Processa gli eventi nel bot (es: invia notifiche)
                for (const event of results.events) {
                    // Esempio: invia notifica evento
                    // await notifyEvent(event);
                }
            }
        } catch (error) {
            console.error(`❌ Errore sincronizzazione periodica: ${error.message}`);
        }
    }, 5 * 60 * 1000); // 5 minuti
}

// Comandi slash
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'sync_members') {
        await interaction.deferReply();

        const members = await lseAPI.getMembers();

        if (members.length > 0) {
            const lseP = members.filter(m => m.tag === 'LSE-P').length;
            const lse = members.filter(m => m.tag === 'LSE').length;

            await interaction.editReply(
                `✅ Sincronizzazione completata!\n` +
                `📊 Totale membri: ${members.length}\n` +
                `🔵 LSE-P: ${lseP}\n` +
                `🟢 LSE: ${lse}`
            );
        } else {
            await interaction.editReply("❌ Nessun membro trovato o errore nella sincronizzazione");
        }
    }

    if (interaction.commandName === 'sync_events') {
        await interaction.deferReply();

        const events = await lseAPI.getEvents({ upcoming: true });

        if (events.length > 0) {
            let message = "📅 **Prossimi Eventi:**\n\n";
            events.slice(0, 5).forEach(event => {
                const eventDate = new Date(event.date);
                message += `**${event.title}**\n`;
                message += `📆 ${eventDate.toLocaleDateString('it-IT')}\n`;
                if (event.startTime) {
                    message += `⏰ ${event.startTime}\n`;
                }
                message += "\n";
            });

            await interaction.editReply(message);
        } else {
            await interaction.editReply("❌ Nessun evento futuro trovato");
        }
    }

    if (interaction.commandName === 'sync_status') {
        await interaction.deferReply();

        const status = await lseAPI.getSyncStatus();

        if (status) {
            const membersInfo = status.members || {};
            const eventsInfo = status.events || {};

            let message = "📊 **Stato Sincronizzazione:**\n\n";
            message += `👥 Membri: ${membersInfo.total || 0}\n`;
            if (membersInfo.lastUpdate) {
                const lastUpdate = new Date(membersInfo.lastUpdate);
                message += `🕐 Ultimo aggiornamento: ${lastUpdate.toLocaleString('it-IT')}\n`;
            }
            message += `\n📅 Eventi: ${eventsInfo.total || 0}\n`;
            if (eventsInfo.lastUpdate) {
                const lastUpdate = new Date(eventsInfo.lastUpdate);
                message += `🕐 Ultimo aggiornamento: ${lastUpdate.toLocaleString('it-IT')}\n`;
            }

            await interaction.editReply(message);
        } else {
            await interaction.editReply("❌ Errore nel recupero dello stato");
        }
    }
});

// Registra comandi slash (esegui una volta)
async function registerCommands() {
    const commands = [
        new SlashCommandBuilder()
            .setName('sync_members')
            .setDescription('Sincronizza i membri dalla web app'),
        new SlashCommandBuilder()
            .setName('sync_events')
            .setDescription('Mostra i prossimi eventi'),
        new SlashCommandBuilder()
            .setName('sync_status')
            .setDescription('Mostra lo stato della sincronizzazione')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        console.log('🔄 Registrazione comandi slash...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID), // Sostituisci con il tuo CLIENT_ID
            { body: commands }
        );
        console.log('✅ Comandi slash registrati');
    } catch (error) {
        console.error('❌ Errore registrazione comandi:', error);
    }
}

// Avvia il bot
// client.login(DISCORD_TOKEN);

module.exports = { LSESyncAPI };

