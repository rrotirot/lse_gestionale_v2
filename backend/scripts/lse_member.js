#!/usr/bin/env node

/**
 * CLI tool per gestire i membri LSE
 * Uso: lse_member <key|all> <command>
 * 
 * Comandi disponibili:
 *   reset_vali - Resetta la validazione di un membro o di tutti i membri
 */

const http = require('http');

const API_URL = process.env.RSI_API_URL || 'http://localhost:5000';

// Parse arguments
const args = process.argv.slice(2);

if (args.length < 2) {
    console.error('❌ Errore: parametri mancanti');
    console.log('\nUso: lse_member <key|all> <command>');
    console.log('\nComandi disponibili:');
    console.log('  reset_vali - Resetta la validazione di un membro o di tutti i membri');
    console.log('\nEsempi:');
    console.log('  lse_member 1 reset_vali        # Resetta validazione per membro con key=1');
    console.log('  lse_member all reset_vali      # Resetta validazione per tutti i membri');
    process.exit(1);
}

const keyOrAll = args[0];
const command = args[1];

// Esegui il comando
switch (command) {
    case 'reset_vali':
        if (keyOrAll.toLowerCase() === 'all') {
            resetValidationAll();
        } else {
            // Valida la key
            if (isNaN(parseInt(keyOrAll))) {
                console.error(`❌ Errore: la key deve essere un numero o "all". Ricevuto: "${keyOrAll}"`);
                process.exit(1);
            }
            resetValidation(keyOrAll);
        }
        break;
    default:
        console.error(`❌ Errore: comando sconosciuto "${command}"`);
        console.log('\nComandi disponibili:');
        console.log('  reset_vali - Resetta la validazione di un membro o di tutti i membri');
        process.exit(1);
}

function resetValidation(key) {
    const url = new URL(`${API_URL}/api/v1/members/${key}/reset-validation`);

    const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    console.log(`🔄 Reset validazione per membro key=${key}...`);

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const response = JSON.parse(data);

                if (res.statusCode === 200 && response.success) {
                    console.log(`✅ Validazione resettata con successo per membro key=${key}`);
                    if (response.member) {
                        console.log(`   Nome: ${response.member.name || 'N/A'}`);
                        console.log(`   Affiliazioni Org: ${response.member.affiliazioniOrg || '(vuoto)'}`);
                        console.log(`   Validazione: ${response.member.orgValidation ? 'presente' : 'null'}`);
                    }
                } else {
                    console.error(`❌ Errore: ${response.error || 'Errore sconosciuto'}`);
                    process.exit(1);
                }
            } catch (error) {
                console.error(`❌ Errore nel parsing della risposta:`, error.message);
                console.error(`Risposta ricevuta:`, data);
                process.exit(1);
            }
        });
    });

    req.on('error', (error) => {
        console.error(`❌ Errore nella richiesta:`, error.message);
        console.error(`   Assicurati che il server sia in esecuzione su ${API_URL}`);
        process.exit(1);
    });

    req.end();
}

function resetValidationAll() {
    const url = new URL(`${API_URL}/api/v1/members/reset-validation/all`);

    const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    console.log(`🔄 Reset validazione per tutti i membri...`);

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const response = JSON.parse(data);

                if (res.statusCode === 200 && response.success) {
                    console.log(`✅ Validazione resettata con successo per ${response.modifiedCount || 0} membri`);
                } else {
                    console.error(`❌ Errore: ${response.error || 'Errore sconosciuto'}`);
                    process.exit(1);
                }
            } catch (error) {
                console.error(`❌ Errore nel parsing della risposta:`, error.message);
                console.error(`Risposta ricevuta:`, data);
                process.exit(1);
            }
        });
    });

    req.on('error', (error) => {
        console.error(`❌ Errore nella richiesta:`, error.message);
        console.error(`   Assicurati che il server sia in esecuzione su ${API_URL}`);
        process.exit(1);
    });

    req.end();
}

