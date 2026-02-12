/**
 * Smoke Test - Verifica che il server si avvia e risponde a richieste base
 * Eseguire con: npm run smoke
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
const HEALTH_ENDPOINT = '/api/health';

console.log('🧪 Esecuzione Smoke Test...\n');

// Funzione per fare richieste HTTP
function makeRequest(path) {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(path, BASE_URL);
            const options = {
                hostname: url.hostname,
                port: url.port || 5000,
                path: url.pathname + url.search,
                method: 'GET',
                timeout: 5000
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        data: data,
                        headers: res.headers
                    });
                });
            });

            req.on('error', (err) => {
                reject(new Error(`Request error: ${err.message}`));
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout (5s)'));
            });

            req.end();
        } catch (err) {
            reject(new Error(`Setup error: ${err.message}`));
        }
    });
}

// Test 1: Health Check
async function testHealthCheck() {
    try {
        console.log('📍 Test 1: GET /api/health');
        const response = await makeRequest(HEALTH_ENDPOINT);
        
        if (response.status === 200) {
            console.log('   ✅ PASS - Status 200');
            try {
                const data = JSON.parse(response.data);
                if (data.status === 'ok') {
                    console.log('   ✅ PASS - Response válida');
                    return true;
                } else {
                    console.log('   ❌ FAIL - Response inválida:', data);
                    return false;
                }
            } catch (e) {
                console.log('   ❌ FAIL - JSON parse error:', e.message);
                console.log('   Data:', response.data.substring(0, 100));
                return false;
            }
        } else {
            console.log(`   ❌ FAIL - Status ${response.status}`);
            console.log('   Data:', response.data.substring(0, 100));
            return false;
        }
    } catch (err) {
        console.log(`   ❌ FAIL - Error: ${err.message}`);
        return false;
    }
}

// Test 2: Root endpoint
async function testRoot() {
    try {
        console.log('\n📍 Test 2: GET /');
        const response = await makeRequest('/');
        
        if (response.status === 200) {
            console.log('   ✅ PASS - Status 200');
            try {
                const data = JSON.parse(response.data);
                if (data.message === 'RSI API Proxy Server') {
                    console.log('   ✅ PASS - Response válida');
                    return true;
                } else {
                    console.log('   ❌ FAIL - Response inválida:', data);
                    return false;
                }
            } catch (e) {
                console.log('   ❌ FAIL - JSON parse error:', e.message);
                console.log('   Data:', response.data.substring(0, 100));
                return false;
            }
        } else {
            console.log(`   ❌ FAIL - Status ${response.status}`);
            console.log('   Data:', response.data.substring(0, 100));
            return false;
        }
    } catch (err) {
        console.log(`   ❌ FAIL - Error: ${err.message}`);
        return false;
    }
}

// Esecuzione dei test
(async () => {
    const tests = [
        testHealthCheck(),
        testRoot()
    ];

    const results = await Promise.all(tests);
    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Risultati: ${passed}/${total} test passati`);
    console.log(`${'='.repeat(50)}\n`);

    if (passed === total) {
        console.log('✅ SMOKE TEST PASSED - Server è operativo!\n');
        process.exit(0);
    } else {
        console.log('❌ SMOKE TEST FAILED - Alcuni test non sono passati!\n');
        process.exit(1);
    }
})();
