/**
 * Smoke Test - Verifica che il server si avvia e risponde a richieste base
 * Eseguire con: npm run smoke
 */

const http = require('http');

const BASE_URL =
    process.env.SMOKE_BASE_URL ||
    process.env.BASE_URL ||
    `http://localhost:${process.env.PORT || 5000}`;
const HEALTH_ENDPOINT = '/api/v1/health';

console.log('🧪 Esecuzione Smoke Test...\n');

// Funzione per fare richieste HTTP
function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
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

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

// Test 1: Health Check
async function testHealthCheck() {
    try {
        console.log('📍 Test 1: GET /api/v1/health');
        const response = await makeRequest(HEALTH_ENDPOINT);
        
        if (response.status === 200) {
            console.log('   ✅ PASS - Status 200');
            const data = JSON.parse(response.data);
            if (data.status === 'ok') {
                console.log('   ✅ PASS - Response válida');
                return true;
            } else {
                console.log('   ❌ FAIL - Response inválida:', data);
                return false;
            }
        } else {
            console.log(`   ❌ FAIL - Status ${response.status}`);
            return false;
        }
} catch (err) {
        console.log(`   ❌ FAIL - Error: ${err.message}`);
        console.log(`   📋 Debug: BaseURL=${BASE_URL}, Endpoint=${HEALTH_ENDPOINT}`);
        console.log(`   🔍 Full error:`, err);
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
            const data = JSON.parse(response.data);
            if (data.message === 'RSI API Proxy Server') {
                console.log('   ✅ PASS - Response válida');
                return true;
            } else {
                console.log('   ❌ FAIL - Response inválida:', data);
                return false;
            }
        } else {
            console.log(`   ❌ FAIL - Status ${response.status}`);
            return false;
        }
} catch (err) {
        console.log(`   ❌ FAIL - Error: ${err.message}`);
        console.log(`   📋 Debug: BaseURL=${BASE_URL}, Endpoint=/`);
        console.log(`   🔍 Full error:`, err);
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
