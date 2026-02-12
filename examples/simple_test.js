/**
 * Script semplice per testare le API di sincronizzazione
 * Esegui questo script per verificare che tutto funzioni correttamente
 * 
 * Uso: node simple_test.js
 */

const { LSESyncAPI } = require('./discord_bot_sync');

// Configurazione
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";
const API_KEY = process.env.API_KEY || "your-api-key-here";

async function main() {
    // Inizializza il client API
    const api = new LSESyncAPI(API_BASE_URL, API_KEY);
    
    console.log("=".repeat(50));
    console.log("TEST API DI SINCRONIZZAZIONE LSE");
    console.log("=".repeat(50));
    
    // 1. Test connessione
    console.log("\n1️⃣ Test connessione...");
    if (!await api.testConnection()) {
        console.log("❌ Connessione fallita! Verifica API_KEY e URL");
        return;
    }
    console.log("✅ Connessione OK\n");
    
    // 2. Test stato sincronizzazione
    console.log("2️⃣ Stato sincronizzazione...");
    const status = await api.getSyncStatus();
    if (status) {
        console.log(`   👥 Membri totali: ${status.members.total}`);
        console.log(`   📅 Eventi totali: ${status.events.total}`);
        if (status.members.lastUpdate) {
            console.log(`   🕐 Ultimo aggiornamento membri: ${status.members.lastUpdate}`);
        }
        if (status.events.lastUpdate) {
            console.log(`   🕐 Ultimo aggiornamento eventi: ${status.events.lastUpdate}`);
        }
    }
    console.log();
    
    // 3. Test recupero membri
    console.log("3️⃣ Recupero membri...");
    const members = await api.getMembers({ limit: 5 });
    if (members.length > 0) {
        console.log(`   ✅ Ricevuti ${members.length} membri (limit 5)`);
        members.slice(0, 3).forEach(member => {
            console.log(`      - ${member.name} (${member.tag})`);
        });
    }
    console.log();
    
    // 4. Test recupero eventi
    console.log("4️⃣ Recupero eventi futuri...");
    const events = await api.getEvents({ upcoming: true, limit: 5 });
    if (events.length > 0) {
        console.log(`   ✅ Ricevuti ${events.length} eventi futuri (limit 5)`);
        events.slice(0, 3).forEach(event => {
            console.log(`      - ${event.title} (${event.type})`);
        });
    }
    console.log();
    
    // 5. Test sincronizzazione incrementale
    console.log("5️⃣ Sincronizzazione incrementale (ultima ora)...");
    const results = await api.syncIncremental();
    console.log(`   ✅ Membri modificati: ${results.members.length}`);
    console.log(`   ✅ Eventi modificati: ${results.events.length}`);
    console.log();
    
    console.log("=".repeat(50));
    console.log("✅ TUTTI I TEST COMPLETATI");
    console.log("=".repeat(50));
}

// Esegui i test
main().catch(console.error);

