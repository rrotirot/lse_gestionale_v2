#!/usr/bin/env node

/**
 * Script per importare eventi dal bot Discord (da CSV) nel database
 * 
 * Uso:
 *   node import-bot-events.js <path-to-activities.csv> [api-url] [auth-token]
 * 
 * Esempio:
 *   node import-bot-events.js ../test_event/activities.csv http://localhost:5000 <token>
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Funzione per parsare una riga CSV complessa (gestisce virgolette e newline)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Doppia virgoletta = escape
                current += '"';
                i++; // Salta la prossima virgoletta
            } else {
                // Inizia/finisce una stringa quotata
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // Separatore di campo
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    // Aggiungi l'ultimo campo
    result.push(current);
    
    return result;
}

// Funzione per leggere e parsare il CSV (gestisce newline dentro le virgolette)
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parsa il CSV considerando le virgolette e i newline dentro le virgolette
    const lines = [];
    let currentLine = '';
    let inQuotes = false;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Doppia virgoletta = escape
                currentLine += '"';
                i++; // Salta la prossima virgoletta
            } else {
                // Inizia/finisce una stringa quotata
                inQuotes = !inQuotes;
                currentLine += char;
            }
        } else if (char === '\n' && !inQuotes) {
            // Newline fuori dalle virgolette = fine riga
            if (currentLine.trim().length > 0) {
                lines.push(currentLine);
            }
            currentLine = '';
        } else {
            currentLine += char;
        }
    }
    
    // Aggiungi l'ultima riga se presente
    if (currentLine.trim().length > 0) {
        lines.push(currentLine);
    }
    
    if (lines.length < 2) {
        throw new Error('Il file CSV deve contenere almeno una riga di header e una riga di dati');
    }
    
    // Leggi l'header
    const header = parseCSVLine(lines[0]);
    
    // Leggi i dati
    const activities = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const values = parseCSVLine(line);
        
        if (values.length !== header.length) {
            console.warn(`⚠️ Riga ${i + 1} ha ${values.length} campi invece di ${header.length}, saltata`);
            continue;
        }
        
        const activity = {};
        header.forEach((key, index) => {
            let value = values[index] || '';
            
            // Rimuovi virgolette iniziali/finali se presenti
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            
            // Gestisci valori vuoti
            if (value === '' || value === 'null') {
                value = null;
            }
            
            // Converti numeri solo se è un numero puro (non stringa che inizia con numero)
            if (value !== null && value !== '' && typeof value === 'string') {
                // Prova a convertire solo se è un numero puro
                const numValue = value.trim();
                if (numValue !== '' && !isNaN(numValue) && numValue.match(/^-?\d*\.?\d+$/)) {
                    if (numValue.includes('.')) {
                        value = parseFloat(numValue);
                    } else {
                        value = parseInt(numValue, 10);
                    }
                }
            }
            
            activity[key] = value;
        });
        
        activities.push(activity);
    }
    
    return activities;
}

// Funzione principale
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.error('❌ Uso: node import-bot-events.js <path-to-activities.csv> [api-url] [auth-token]');
        console.error('');
        console.error('Esempio:');
        console.error('  node import-bot-events.js ../test_event/activities.csv');
        console.error('  node import-bot-events.js ../test_event/activities.csv http://localhost:5000 <token>');
        process.exit(1);
    }
    
    const csvPath = path.resolve(args[0]);
    const apiUrl = args[1] || process.env.VITE_RSI_API_URL || 'http://localhost:5000';
    const authToken = args[2] || process.env.AUTH_TOKEN || null;
    
    console.log('📥 Importazione eventi dal bot Discord...');
    console.log(`   File CSV: ${csvPath}`);
    console.log(`   API URL: ${apiUrl}`);
    console.log('');
    
    // Verifica che il file esista
    if (!fs.existsSync(csvPath)) {
        console.error(`❌ File non trovato: ${csvPath}`);
        process.exit(1);
    }
    
    try {
        // Parsa il CSV
        console.log('📖 Lettura e parsing del CSV...');
        const activities = parseCSV(csvPath);
        console.log(`✅ Trovate ${activities.length} attività nel CSV`);
        console.log('');
        
        if (activities.length === 0) {
            console.warn('⚠️ Nessuna attività da importare');
            process.exit(0);
        }
        
        // Prepara la richiesta
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        // Invia la richiesta
        console.log('📤 Invio richiesta all\'API...');
        
        const response = await fetch(`${apiUrl}/api/v1/import/bot-events`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ activities })
        });
        
        // Leggi sempre come testo prima, così possiamo vedere cosa è stato restituito
        const responseText = await response.text();
        const contentType = response.headers.get('content-type') || '';
        let data;
        
        // Prova a parsare come JSON
        if (contentType.includes('application/json') || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Errore nel parsing della risposta JSON:');
                console.error('   Status:', response.status, response.statusText);
                console.error('   Content-Type:', contentType);
                console.error('   Risposta (prime 500 caratteri):');
                console.error(responseText.substring(0, 500));
                process.exit(1);
            }
        } else {
            // Se non è JSON, mostra l'errore
            console.error('❌ Il server ha restituito una risposta non-JSON:');
            console.error('   Status:', response.status, response.statusText);
            console.error('   Content-Type:', contentType);
            console.error('   Risposta (prime 500 caratteri):');
            console.error(responseText.substring(0, 500));
            console.error('');
            console.error('💡 Possibili cause:');
            console.error('   1. Il server non è in esecuzione');
            console.error('   2. L\'URL dell\'API non è corretto');
            console.error('   3. Il token di autenticazione non è valido');
            console.error('   4. C\'è un errore nel server che restituisce HTML');
            console.error('');
            console.error('💡 Per verificare se il server è in esecuzione:');
            console.error(`   curl ${apiUrl}/api/health`);
            process.exit(1);
        }
        
        if (!response.ok) {
            console.error('❌ Errore nella richiesta:');
            console.error('   Status:', response.status, response.statusText);
            console.error(JSON.stringify(data, null, 2));
            process.exit(1);
        }
        
        // Mostra i risultati
        console.log('');
        console.log('✅ Importazione completata!');
        console.log(`   Eventi importati: ${data.imported}`);
        if (data.errors > 0) {
            console.log(`   Errori: ${data.errors}`);
        }
        console.log('');
        
        if (data.details && data.details.imported) {
            console.log('📋 Eventi importati:');
            data.details.imported.forEach(item => {
                console.log(`   - ${item.action === 'created' ? '✅ Creato' : '🔄 Aggiornato'}: ${item.title}`);
            });
            console.log('');
        }
        
        if (data.details && data.details.errors && data.details.errors.length > 0) {
            console.log('⚠️ Errori:');
            data.details.errors.forEach(error => {
                console.log(`   - ${error.activity}: ${error.error}`);
            });
            console.log('');
        }
        
    } catch (error) {
        console.error('❌ Errore durante l\'importazione:');
        console.error(error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Esegui lo script
main().catch(error => {
    console.error('❌ Errore fatale:', error);
    process.exit(1);
});

