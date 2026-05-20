/**
 * Backend Node.js per integrare l'API RSI di Star Citizen
 * Funziona come proxy per aggirare le restrizioni CORS
 * Include integrazione MongoDB per salvare i membri
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const cheerio = require('cheerio');
import mongoose = require('mongoose');
const Member = require('./models/Member');
const DeletedMember = require('./models/DeletedMember');
const User = require('./models/User');
const Event = require('./models/Event');
const discordBot = require('./scripts/discord-bot');
const jwt = require('jsonwebtoken');
const { logger, requestLogger } = require('./lib/logger');
const cache = require('./lib/cache');
const { setupApiVersioning, legacyRedirectMiddleware } = require('./lib/versioning');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./lib/swagger');
const { setupMongoDB } = require('./lib/config');
const multer = require('multer');
const path = require('path');
const membersRouter = require('./routes/members');
const { parseMemberDataFromFile } = require('./lib/parseMembers');
import fs = require('fs');

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'change_me_in_prod';
const API_KEY = process.env.API_KEY || 'default_api_key';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lse-members';

// Opzioni di connessione MongoDB
const mongooseOptions = {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    family: 4, // Forza IPv4
};

const app = express();

// Configurazione multer per upload file
// Usiamo memoryStorage per evitare salvataggi permanenti su disco.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/plain', 'text/csv'];
        const allowedExtensions = ['.txt', '.csv'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only .txt and .csv files are allowed'), false);
        }
    }
});

app.get('/test', (req, res) => res.send('ok'));

app.get(['/api/health', '/api/v1/health'], (req, res) => {
    return res.json({ status: 'ok' });
});

// Endpoint proxy per ottenere affiliazioni org RSI da record pubblici
// Usato dalla validazione membri: POST /api/v1/members/:key/validate
app.get('/api/v1/rsi/orgs/:handle', async (req, res) => {
    const { handle } = req.params;

    if (!handle) {
        return res.status(400).json({
            success: false,
            error: 'Handle utente richiesto'
        });
    }

    try {
        // Cache key versioned per evitare cache "stale" dopo cambi logica parsing/validation
        const cacheKey = `rsi:orgs:v14:${handle.toLowerCase()}`;
        try {
            const cachedResult = await cache.get(cacheKey);
            if (cachedResult) {
                return res.status(200).json({ ...cachedResult, _cached: true });
            }
        } catch {
            // cache best-effort
        }

        const orgPageUrl = `https://robertsspaceindustries.com/en/citizens/${encodeURIComponent(handle)}/organizations`;
        const response = await fetch(orgPageUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            const isNotFound = response.status === 404 || String(response.statusText || '').toLowerCase().includes('not found');
            const orgsString = isNotFound ? '404' : 'NO ORG MEMBERSHIP FOUND IN PUBLIC RECORDS';
            const issueMessage = isNotFound ? 'Errore nel recupero dati: Not Found' : `Errore nel recupero dati: ${response.statusText}`;

            const result = {
                success: true,
                error: `Errore nel recupero pagina: ${response.statusText}`,
                user_handle: handle,
                orgs: [],
                orgs_string: orgsString,
                count: 0,
                validation: {
                    isValid: false,
                    hasOnlyOneOrg: false,
                    hasMainName: false,
                    mainOrgName: null,
                    issues: [issueMessage]
                }
            };

            try { await cache.set(cacheKey, result, 60 * 60); } catch { }
            return res.status(response.status).json(result);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Best-effort main org name extraction
        let mainOrgName = null;
        const mainOrgMatch = html.match(/Main organization[\s\S]*?<\/h[12]>[\s\S]*?<h[12][^>]*>([^<]+)<\/h[12]>/i);
        if (mainOrgMatch && mainOrgMatch[1]) {
            mainOrgName = mainOrgMatch[1].trim();
        }

        if (!mainOrgName) {
            const textContent = $('body').text();
            const lines = textContent.split('\n').map(l => l.trim()).filter(l => l);
            let foundMain = false;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes('main organization')) {
                    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                        const line = lines[j];
                        if (
                            line &&
                            !line.match(/^\d+$/) &&
                            !line.toLowerCase().includes('members') &&
                            !line.toLowerCase().includes('overview') &&
                            line.length > 2 &&
                            line.length < 100
                        ) {
                            mainOrgName = line;
                            foundMain = true;
                            break;
                        }
                    }
                    if (foundMain) break;
                }
            }
        }

        const requiredMainOrg = 'Logistic Space Economy';
        const hasMainName = !!mainOrgName;
        const normalizeOrgName = (s: string) =>
            String(s || '')
                .trim()
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .replace(/[_-]+/g, ' ');

        // Alias: ALSE è equivalente a Logistic Space Economy
        const mainNorm = mainOrgName ? normalizeOrgName(mainOrgName) : '';
        const mainOrgVerified = hasMainName && (mainNorm === normalizeOrgName(requiredMainOrg) || mainNorm === 'alse');

        // Estrai le org dalla pagina (best-effort)
        // Strategia:
        // - prendi tutti i link che puntano a /orgs/<HANDLE>
        // - ricava il *nome* org (non il tag) dal contesto DOM, evitando handle tipo "LZA"
        const orgsMap = new Map<string, { handle: string; sid: string | null; name: string; url: string; spectrumUrl?: string }>();
        try {
            const pickOrgName = (text: string, handle: string) => {
                const cleaned = String(text || '')
                    .replace(/\s+/g, ' ')
                    .replace(/\[[^\]]+\]/g, ' ') // rimuove eventuali [TAG]
                    .trim();

                if (!cleaned) return null;
                const lower = cleaned.toLowerCase();
                const handleLower = String(handle || '').trim().toLowerCase();

                // Se è solo il tag/handle (es. "LZA" o "LZA-CREW"), scarta.
                if (handleLower && lower === handleLower) return null;
                if (/^[A-Z0-9_-]{2,8}$/.test(cleaned) && !cleaned.includes(' ')) return null;

                // Evita testi "rumorosi"
                if (lower.includes('members') || lower.includes('member') || lower.includes('overview')) return null;

                // Accetta anche nomi a singola parola, purché non sembrino un tag (troppo corto / tutto maiuscolo corto).
                if (cleaned.length >= 3 && cleaned.length <= 120) {
                    return cleaned;
                }
                return null;
            };

            const normalizeUrl = (href: string) => {
                const h = String(href || '').trim();
                if (!h) return '';
                if (h.startsWith('http://') || h.startsWith('https://')) return h;
                if (h.startsWith('/')) return `https://robertsspaceindustries.com${h}`;
                return `https://robertsspaceindustries.com/${h}`;
            };

            const extractSidNearElement = (el: any) => {
                try {
                    const $el = $(el);
                    // Scope più stretto possibile: la "card/voce" dell'org nella pagina organizations del membro
                    const scope = $el.closest('li, .organization, .org-item, .org, .orgs, .row, .line, .entry');
                    const label = scope
                        .find('span.label')
                        .filter((_, x) => {
                            const t = $(x).text().replace(/\s+/g, ' ').trim();
                            return t === 'Spectrum Identification (SID)';
                        })
                        .first();

                    if (label && label.length > 0) {
                        // Struttura tipica (come screenshot):
                        // <p class="entry">
                        //   <span class="label">Spectrum Identification (SID)</span>
                        //   <strong class="value">ALSE</strong>
                        // </p>
                        const entry = label.closest('p.entry');
                        const valueText = entry.find('strong.value, .value').first().text();
                        const sidText = String(valueText || '').replace(/\s+/g, ' ').trim();
                        if (sidText && /^[A-Z0-9]{2,10}$/.test(sidText)) {
                            return sidText.toUpperCase();
                        }
                    }
                } catch {
                    // ignore
                }
                return null;
            };

            $('a[href]').each((_, el) => {
                const href = ($(el).attr('href') || '').toString();
                const hrefLower = href.toLowerCase();

                // Caso 1: link "orgs" classico (preferito)
                const orgHandleMatch = href.match(/\/orgs\/([A-Za-z0-9_-]{2,})/);

                // Caso 2: Spectrum identifier (DA USARE SOLO PER LINK, NON PER CONTEGGIO)
                // Esempi possibili:
                // - /spectrum/community/SC/orgs/123456
                // - /spectrum/community/SC/organizations/123456
                const spectrumIdMatch =
                    (hrefLower.includes('spectrum') || hrefLower.includes('/community/'))
                        ? (href.match(/\/orgs\/(\d{3,})/) || href.match(/\/organizations\/(\d{3,})/))
                        : null;

                let handle = '';
                let key = '';
                let url = '';
                let sid: string | null = null;

                if (orgHandleMatch) {
                    handle = (orgHandleMatch[1] || '').trim();
                    if (!handle) return;
                    // Escludi handle solo numerici (rumore)
                    if (/^\d+$/.test(handle)) return;
                    key = handle.toUpperCase();
                    // Prova prima a leggere il SID direttamente dalla pagina "organizations" del membro
                    // (riga: Spectrum Identification (SID))
                    sid = extractSidNearElement(el);
                    url = `https://robertsspaceindustries.com/en/orgs/${encodeURIComponent(handle)}`;
                } else if (spectrumIdMatch) {
                    const spectrumId = (spectrumIdMatch[1] || '').trim();
                    if (!spectrumId) return;
                    // "handle" fittizio non numerico, così non viene scartato dalla logica più avanti
                    handle = `spectrum:${spectrumId}`;
                    key = handle.toUpperCase();
                    sid = extractSidNearElement(el);
                    url = normalizeUrl(href);
                } else {
                    return;
                }

                // Se abbiamo già il SID, normalizza l'URL verso la pagina org pubblica
                if (sid) {
                    url = `https://robertsspaceindustries.com/en/orgs/${encodeURIComponent(sid)}`;
                }

                // Prova a estrarre il nome org dal contenitore più ampio (spesso include sia TAG che Nome)
                const rawLinkText = ($(el).text() || '').replace(/\s+/g, ' ').trim();
                const containerText = ($(el).closest('li, .organization, .org, .org-item, .orgs, .line, .row').text() || '')
                    .replace(/\s+/g, ' ')
                    .trim();

                // Candidate in ordine di qualità
                const candidates = [containerText, rawLinkText].filter(Boolean);
                let name: string | null = null;
                for (const c of candidates) {
                    const picked = pickOrgName(c, handle);
                    // Ulteriore filtro: se è una parola singola molto corta, probabilmente è tag → scarta.
                    if (picked) {
                        const oneWord = !picked.includes(' ');
                        if (oneWord && picked.length < 6 && /^[A-Z0-9_-]+$/.test(picked)) {
                            continue;
                        }
                        name = picked;
                        break;
                    }
                }

                // Fallback: se proprio non troviamo un nome "umano", non mostriamo il tag come nome.
                // Manteniamo comunque l'org per conteggio tramite handle.
                const finalName = name || '';

                if (!orgsMap.has(key)) {
                    orgsMap.set(key, {
                        handle,
                        sid,
                        name: finalName,
                        url,
                        spectrumUrl: sid ? undefined : url
                    });
                }
            });

            // Fallback se il DOM non contiene link orgs
            if (orgsMap.size === 0) {
                const matches = Array.from(html.matchAll(/\/orgs\/([A-Za-z0-9_-]{2,})/g));
                for (const mm of matches) {
                    const handle = (mm[1] || '').trim();
                    if (!handle) continue;
                    if (/^\d+$/.test(handle)) continue;
                    const key = handle.toUpperCase();
                    if (!orgsMap.has(key)) {
                        orgsMap.set(key, {
                            handle,
                            sid: null,
                            name: '',
                            url: `https://robertsspaceindustries.com/en/orgs/${encodeURIComponent(handle)}`
                        });
                    }
                }
            }
        } catch {
            // best-effort
        }

        const orgs = Array.from(orgsMap.values());

        // Se abbiamo org con Spectrum identifier, prova a risolvere il SID dalla pagina org
        // (cerca la label "Spectrum Identification (SID)" e prende il valore vicino)
        const resolveSidFromOrgPageHtml = (orgHtml: string) => {
            try {
                const $org = cheerio.load(orgHtml);
                const labelEl = $org('span.label')
                    .filter((_, el) => $org(el).text().replace(/\s+/g, ' ').trim().toLowerCase() === 'spectrum identification (sid)')
                    .first();
                if (labelEl && labelEl.length > 0) {
                    // Prova a leggere il valore vicino/sotto la label
                    const container = labelEl.closest('li, .row, .field, .line, .info, .info-row, .organization-info');
                    const candidates = [
                        container.find('span.value').first().text(),
                        container.find('strong, b').first().text(),
                        labelEl.parent().find('span.value').first().text(),
                        labelEl.parent().find('strong, b').first().text(),
                        container.text(),
                        labelEl.parent().text(),
                    ]
                        .map(t => String(t || '').replace(/\s+/g, ' ').trim())
                        .filter(Boolean);

                    for (const c of candidates) {
                        // SID tipico: 2-10 chars A-Z0-9 (solo maiuscole/numero)
                        const m = c.match(/\b([A-Z0-9]{2,10})\b/);
                        if (m && m[1]) return m[1].toUpperCase();
                    }
                }

                // Fallback regex (senza DOM) — cerca vicino alla label
                const m2 = String(orgHtml).match(/Spectrum Identification\s*\(SID\)[\s\S]{0,600}?\b([A-Z0-9]{2,10})\b/);
                return m2 && m2[1] ? String(m2[1]).toUpperCase() : null;
            } catch {
                return null;
            }
        };

        // Risolvi SID dalla pagina dell'org cercando la label "Spectrum Identification (SID)"
        // (best-effort; poche org per utente)
        for (const o of orgs) {
            if (o.sid) continue;
            const urlToFetch = String(o.url || o.spectrumUrl || '').trim();
            if (!urlToFetch) continue;

            try {
                const r = await fetch(urlToFetch, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                });
                if (!r.ok) continue;
                const orgHtml = await r.text();
                const sidResolved = resolveSidFromOrgPageHtml(orgHtml);
                if (sidResolved) {
                    o.sid = sidResolved;
                    // Normalizza sempre l'URL pubblico via SID
                    o.url = `https://robertsspaceindustries.com/en/orgs/${encodeURIComponent(sidResolved)}`;
                }
            } catch {
                // best-effort
            }
        }

        // Conteggio org basato sui NOMI (non tag/handle), includendo sempre la main org.
        // Questo evita falsi positivi dovuti a link org "rumorosi" senza nome reale.
        const orgNameSet = new Set<string>();
        for (const o of orgs) {
            const n = String(o?.name || '').trim();
            if (n) orgNameSet.add(n.toLowerCase());
        }
        if (mainOrgName) {
            const mainN = String(mainOrgName).trim();
            if (mainN) orgNameSet.add(mainN.toLowerCase());
        }

        const orgCount = orgNameSet.size;
        const hasOnlyOneOrg = orgCount === 1;

        const issues: string[] = [];
        if (orgCount === 0) {
            issues.push('Nessuna organizzazione trovata');
        } else if (orgCount !== 1) {
            issues.push(`Ha ${orgCount} organizzazioni invece di 1`);
        }
        if (!mainOrgVerified) {
            issues.push(hasMainName ? `Main Org diversa da "${requiredMainOrg}"` : 'Main organization non trovata');
        }

        // Mostra solo nomi org (non tag/handle). Filtra stringhe vuote.
        // Preferisci la lista nomi unici (case-insensitive) per coerenza con il conteggio.
        const orgNames = Array.from(orgNameSet.values()).map(v => {
            // ripristina la capitalizzazione originale quando possibile
            const fromList = orgs.find(o => String(o?.name || '').trim().toLowerCase() === v);
            if (fromList && String(fromList.name || '').trim()) return String(fromList.name).trim();
            if (mainOrgName && String(mainOrgName).trim().toLowerCase() === v) return String(mainOrgName).trim();
            return v;
        });
        const orgsString =
            orgNames.length > 0
                ? orgNames.join(', ')
                : (mainOrgName || '');

        // Prova a derivare il link della main org:
        // - prima da alias noti (es. LSE => /orgs/ALSE)
        // - poi dai link /orgs/<HANDLE> presenti in pagina
        const knownOrgHandles: Record<string, string> = {
            'logistic space economy': 'ALSE',
            'alse': 'ALSE',
        };
        let mainOrgHandle: string | null = null;
        let mainOrgUrl: string | null = null;
        if (mainOrgName) {
            const aliasHandle = knownOrgHandles[normalizeOrgName(mainOrgName)];
            if (aliasHandle) {
                mainOrgHandle = aliasHandle;
                mainOrgUrl = `https://robertsspaceindustries.com/en/orgs/${encodeURIComponent(aliasHandle)}`;
            }

            const mainNameNorm = String(mainOrgName).trim().toLowerCase();
            const matchByName = orgs.find(o => String(o?.name || '').trim().toLowerCase() === mainNameNorm);
            if (matchByName && matchByName.handle && !/^\d+$/.test(matchByName.handle)) {
                mainOrgHandle = String(matchByName.handle).trim();
                if (mainOrgHandle) {
                    mainOrgUrl = `https://robertsspaceindustries.com/en/orgs/${encodeURIComponent(mainOrgHandle)}`;
                }
            }
            // Fallback: se non abbiamo handle, offriamo un link di ricerca organizzazioni
            if (!mainOrgUrl) {
                mainOrgUrl = `https://robertsspaceindustries.com/en/community/orgs/`;
            }
        }

        // Aggiungi la main org tra le org restituite se manca, così UI/diagnostica restano coerenti.
        if (mainOrgName) {
            const mainNameNorm = String(mainOrgName).trim().toLowerCase();
            const alreadyHasMainByName = orgs.some(o => String(o?.name || '').trim().toLowerCase() === mainNameNorm);
            if (!alreadyHasMainByName) {
                orgs.push({
                    // Se conosciamo il SID (es. ALSE), usalo come handle (così la UI può linkare via SID)
                    handle: mainOrgHandle || 'MAIN',
                    sid: mainOrgHandle || null,
                    name: String(mainOrgName).trim(),
                    url: mainOrgUrl || `https://robertsspaceindustries.com/en/community/orgs/`
                });
            }
        }

        const result = {
            success: true,
            user_handle: handle,
            orgs: orgs,
            orgs_string: orgsString,
            count: orgCount,
            validation: {
                // Regola: se esiste anche solo 1 issue, la validazione deve fallire.
                isValid: mainOrgVerified && hasOnlyOneOrg && issues.length === 0,
                hasOnlyOneOrg: hasOnlyOneOrg,
                hasMainName: hasMainName,
                mainOrgName: mainOrgName,
                mainOrgHandle: mainOrgHandle,
                mainOrgUrl: mainOrgUrl,
                issues: issues
            }
        };

        try { await cache.set(cacheKey, result, 60 * 60 * 24); } catch { }
        return res.json(result);

    } catch (error) {
        console.error('Errore nel proxy RSI orgs:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

// Gestione eventi di connessione
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnesso');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB riconnesso');
});

mongoose.connection.on('error', (error) => {
    console.error('❌ Errore MongoDB:', error.message);
});

// Variabile per tracciare lo stato della connessione
let isMongoConnected = false;

mongoose.connection.on('connected', () => {
    isMongoConnected = true;
    console.log('✅ MongoDB connesso e pronto');
});

mongoose.connection.on('disconnected', () => {
    isMongoConnected = false;
    console.warn('⚠️  MongoDB disconnesso');
});

// Middleware per verificare la connessione MongoDB prima di eseguire operazioni sul database
const checkMongoConnection = (req, res, next) => {
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const readyState = mongoose.connection.readyState;

    if (readyState === 1) {
        // Connesso e pronto
        return next();
    }

    if (readyState === 2) {
        // Connessione in corso, aspetta un po' e riprova
        return res.status(503).json({
            success: false,
            error: 'Database in connessione. Attendere qualche secondo e riprovare.',
            details: 'La connessione a MongoDB è in corso. Riprova tra qualche secondo.'
        });
    }

    // Disconnesso (0) o in disconnessione (3)
    // Prova a riconnettere se non è già in corso
    if (readyState === 0) {
        console.log('🔄 Tentativo di riconnessione a MongoDB...');
        mongoose.connect(MONGODB_URI, mongooseOptions).catch(err => {
            console.error('❌ Errore riconnessione:', err.message);
        });
    }

    return res.status(503).json({
        success: false,
        error: 'Database non disponibile. La connessione a MongoDB non è ancora stata stabilita.',
        details: 'Verificare che MongoDB sia in esecuzione e che la connection string nel file .env sia corretta.',
        connectionState: readyState === 0 ? 'disconnected' : readyState === 3 ? 'disconnecting' : 'unknown'
    });
};

// ==================== MIDDLEWARE DI SICUREZZA ====================

// Helmet: aggiunge header di sicurezza HTTP
app.use(helmet());

// CORS configurato (per produzione limitare gli origin)
const corsOptions = {
    origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? false : '*'), // In produzione, impostare a URL specifico o false per bloccare
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};
app.use(cors(corsOptions));

// Forza HTTPS in produzione
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// Rate limiting globale (protezione generale)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 100000, // max 100 richieste per IP
    message: 'Troppi tentativi, riprova più tardi',
    standardHeaders: true,
    legacyHeaders: false
});
app.use(globalLimiter);

// Rate limiting per login (più restrittivo)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // max 5 tentativi per IP
    message: 'Troppi tentativi di login, riprova più tardi',
    skipSuccessfulRequests: true, // Non contare i login riusciti
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting per registrazione
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ora
    max: 5, // max 5 registrazioni per IP
    message: 'Troppi tentativi di registrazione, riprova più tardi',
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting per operazioni sensibili (DELETE, ecc.)
const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ora
    max: 10, // max 10 operazioni per IP
    message: 'Troppo operazioni in poco tempo, riprova più tardi',
    standardHeaders: true,
    legacyHeaders: false
});

app.use(express.json());

// ==================== DEBUG LOG (DEV ONLY) ====================
// Minimal client-side debug events appended to `debug-3fb3f6.log` in repo root.
// Do NOT include secrets/PII in payloads.
if (process.env.NODE_ENV !== 'production') {
    app.post('/api/v1/_debug/log', (req: any, res: any) => {
        try {
            const session = String(req.headers['x-debug-session-id'] || '');
            if (session !== '3fb3f6') {
                return res.status(403).json({ success: false, error: 'invalid session' });
            }

            const payload = (req.body && typeof req.body === 'object') ? req.body : {};
            const safe = {
                sessionId: String(payload.sessionId || ''),
                runId: String(payload.runId || ''),
                hypothesisId: String(payload.hypothesisId || ''),
                location: String(payload.location || ''),
                message: String(payload.message || ''),
                data: (payload.data && typeof payload.data === 'object') ? payload.data : {},
                timestamp: (typeof payload.timestamp === 'number') ? payload.timestamp : Date.now(),
            };

            fs.appendFileSync(path.join(process.cwd(), 'debug-3fb3f6.log'), JSON.stringify(safe) + '\n', 'utf8');
            return res.json({ success: true });
        } catch (e: any) {
            return res.status(500).json({ success: false, error: e?.message || 'failed' });
        }
    });
}

// ==================== API VERSIONING ====================
// Configura versioning per tutti gli endpoint /api/*
setupApiVersioning(app);

// // ==================== SWAGGER/OpenAPI ====================
// // Documentazione interattiva disponibile su GET /api/docs
// app.use('/api/v1/docs', swaggerUi.serve);
// app.get('/api/v1/docs', swaggerUi.setup(swaggerSpecs, {
//     swaggerOptions: {
//         url: '/api/v1/docs/swagger.json',
//         persistAuthorization: true,
//     },
// }));
// app.get('/api/v1/docs/swagger.json', (req, res) => {
//     res.setHeader('Content-Type', 'application/json');
//     res.send(swaggerSpecs);
// });

// Middleware di logging delle richieste HTTP (Winston)
app.use(requestLogger);

// Middleware di debug per tracciare tutte le richieste (solo in development)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        if (req.path.includes('deleted-members')) {
            logger.debug(`Richiesta dettagliata`, {
                method: req.method,
                path: req.path,
                params: req.params,
                query: req.query,
                hasAuth: !!req.headers.authorization
            });
        }
        next();
    });
}

// Route di default
// Middleware per verificare il token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    // Log per debug delle richieste di autenticazione
    if (process.env.NODE_ENV === 'development' && req.path.includes('verification-code')) {
        console.log('🔐 Richiesta autenticazione per:', req.path);
        console.log('📋 Header Authorization presente:', !!authHeader);
        console.log('🎫 Token presente:', !!token);
    }

    if (!token) {
        if (process.env.NODE_ENV === 'development' && req.path.includes('verification-code')) {
            console.error('❌ Token mancante per', req.path);
        }
        return res.status(401).json({
            success: false,
            error: 'Token di autenticazione mancante'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (process.env.NODE_ENV === 'development' && req.path.includes('verification-code')) {
                console.error('❌ Errore verifica token:', err.message);
            }
            return res.status(403).json({
                success: false,
                error: 'Token non valido o scaduto'
            });
        }
        req.user = user;
        // Log per debug (solo in development)
        if (process.env.NODE_ENV === 'development') {
            if (req.path.includes('members') && req.method === 'DELETE') {
                console.log(`🔐 Token verificato per utente:`, {
                    username: user.username,
                    userId: user.userId
                });
            }
            if (req.path.includes('verification-code')) {
                console.log(`✅ Token verificato per utente:`, {
                    username: user.username,
                    userId: user.userId
                });
            }
        }
        next();
    });
};

// Middleware per autenticazione API (per bot Discord)
// Supporta sia API Key che Bearer Token
const authenticateAPI = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];

    // Prova prima con Bearer token (JWT per utenti web)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
                req.authType = 'jwt';
                return next();
            }
        });
    }

    // Prova con API Key
    const apiKey = apiKeyHeader || (authHeader && authHeader.startsWith('ApiKey ') ? authHeader.split(' ')[1] : null);

    if (apiKey && apiKey === API_KEY) {
        req.authType = 'api-key';
        req.bot = true; // Indica che la richiesta proviene dal bot
        return next();
    }

    // Se nessun metodo di autenticazione è valido
    return res.status(401).json({
        success: false,
        error: 'Autenticazione richiesta. Fornisci un token JWT valido o una API Key valida.',
        hint: 'Usa Header: Authorization: Bearer <token> oppure X-API-Key: <api-key>'
    });
};

app.get('/', (req, res) => {
    res.json({
        message: 'RSI API Proxy Server',
        endpoints: {
            health: '/api/v1/health',
            auth: {
                register: 'POST /api/v1/auth/register',
                login: 'POST /api/v1/auth/login',
                verify: 'GET /api/v1/auth/verify'
            },
            orgs: '/api/v1/rsi/orgs/:handle',
            members: {
                save: 'POST /api/v1/members',
                getAll: 'GET /api/v1/members',
                update: 'PUT /api/v1/members/:key',
                delete: 'DELETE /api/v1/members/:key',
                resetValidation: 'PUT /api/v1/members/:key/reset-validation',
                resetValidationAll: 'PUT /api/v1/members/reset-validation/all'
            }
        }
    });
});

// Usa router per membri
// app.use('/api/v1/members', membersRouter);

// Endpoint per registrazione (con validazione e rate limiting)
app.post('/api/v1/auth/register',
    registerLimiter,
    checkMongoConnection,
    // Validazione input
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username deve essere tra 3 e 30 caratteri')
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username può contenere solo lettere, numeri, trattini e underscore'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password deve essere almeno 6 caratteri')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password deve contenere lettere maiuscole, minuscole e numeri'),
    async (req, res) => {
        try {
            // Controlla errori di validazione
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validazione fallita',
                    details: errors.array().map(e => ({ field: e.param, message: e.msg }))
                });
            }

            const { username, password } = req.body;

            // Verifica se l'utente esiste già
            const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'Username già esistente'
                });
            }

            // Crea nuovo utente
            const user = new User({
                username: username.toLowerCase().trim(),
                password: password
            });

            await user.save();

            console.log(`✅ Nuovo utente registrato: ${user.username}`);

            return res.json({
                success: true,
                message: 'Registrazione completata con successo',
                user: {
                    id: user._id,
                    username: user.username,
                    rsiHandle: user.rsiHandle,
                    rsiVerified: user.rsiVerified,
                    rsiAvatar: user.rsiAvatar,
                    organizationRank: user.organizationRank,
                    verificationCodeFound: user.verificationCodeFound,
                    verificationRankVerified: user.verificationRankVerified,
                    verificationMainOrgVerified: user.verificationMainOrgVerified,
                    mainOrgName: user.mainOrgName
                }
            });
        } catch (error) {
            console.error('Errore nella registrazione:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Errore interno del server'
            });
        }
    }
);

// Endpoint per login (con validazione e rate limiting)
app.post('/api/v1/auth/login',
    loginLimiter,
    checkMongoConnection,
    // Validazione input
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username è richiesto'),
    body('password')
        .notEmpty()
        .withMessage('Password è richiesta'),
    async (req, res) => {
        try {
            // Controlla errori di validazione
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validazione fallita',
                    details: errors.array().map(e => ({ field: e.param, message: e.msg }))
                });
            }

            const { username, password } = req.body;

            // Trova l'utente
            const user = await User.findOne({ username: username.toLowerCase().trim() });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenziali non valide'
                });
            }

            // Verifica la password
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenziali non valide'
                });
            }

            // Genera token JWT
            const token = jwt.sign(
                { userId: user._id, username: user.username },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            console.log(`✅ Login effettuato: ${user.username}`);

            return res.json({
                success: true,
                message: 'Login effettuato con successo',
                token: token,
                user: {
                    id: user._id,
                    username: user.username,
                    rsiHandle: user.rsiHandle,
                    rsiVerified: user.rsiVerified,
                    rsiAvatar: user.rsiAvatar,
                    organizationRank: user.organizationRank,
                    verificationCodeFound: user.verificationCodeFound,
                    verificationRankVerified: user.verificationRankVerified,
                    verificationMainOrgVerified: user.verificationMainOrgVerified,
                    mainOrgName: user.mainOrgName
                }
            });
        } catch (error) {
            console.error('Errore nel login:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Errore interno del server'
            });
        }
    }
);

// Endpoint per importare membri da file
app.post('/api/v1/members/import', checkMongoConnection, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'File richiesto'
            });
        }

        const estensione = path.extname(req.file.originalname);
        const fileContent = req.file.buffer ? req.file.buffer.toString('utf-8') : '';
        if (!fileContent) {
            return res.status(400).json({
                success: false,
                error: 'Contenuto file vuoto o non leggibile'
            });
        }
        const members = await parseMemberDataFromFile(fileContent, estensione);

        if (members.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nessun membro valido trovato nel file'
            });
        }

        // Deduplica membri nel file (prima di toccare il DB)
        const seen = new Map();
        const duplicatesInFile = [];
        for (const member of members) {
            const idKey = member?.id ? `id:${String(member.id).trim()}` : null;
            const keyKey = Number.isFinite(member?.key) ? `key:${member.key}` : null;
            const dedupeKey = idKey || keyKey || `fallback:${String(member?.name || '').trim()}|${String(member?.index || '').trim()}`;

            if (seen.has(dedupeKey)) {
                duplicatesInFile.push({
                    kept: seen.get(dedupeKey)?.name || seen.get(dedupeKey)?.index || dedupeKey,
                    dropped: member?.name || member?.index || dedupeKey,
                    reason: `Duplicate in file (${dedupeKey})`
                });
                continue;
            }
            seen.set(dedupeKey, member);
        }
        const uniqueMembers = Array.from(seen.values());

        // Verifica membri già presenti nel DB (evita duplicati)
        const ids = uniqueMembers.map(m => String(m.id || '').trim()).filter(Boolean);
        const keys = uniqueMembers.map(m => m.key).filter(k => Number.isFinite(k));

        const existing = await Member.find({
            $or: [
                ...(ids.length ? [{ id: { $in: ids } }] : []),
                ...(keys.length ? [{ key: { $in: keys } }] : []),
            ]
        }, { id: 1, key: 1 }).lean();

        const existingIds = new Set(existing.map(e => String(e.id || '').trim()).filter(Boolean));
        const existingKeys = new Set(existing.map(e => e.key).filter(k => Number.isFinite(k)));

        // Verifica membri eliminati
        const errors = [];
        const membersToProcess = [];

        const skippedExisting = [];
        for (const member of uniqueMembers) {
            const normalizedId = String(member?.id || '').trim();
            if (normalizedId && existingIds.has(normalizedId)) {
                skippedExisting.push({ member: member.name || member.index || `id=${normalizedId}`, reason: 'Already exists (id)' });
                continue;
            }
            if (Number.isFinite(member?.key) && existingKeys.has(member.key)) {
                skippedExisting.push({ member: member.name || member.index || `key=${member.key}`, reason: 'Already exists (key)' });
                continue;
            }

            const deletedMember = await DeletedMember.findOne({
                $or: [
                    { key: member.key },
                    { name: member.name, id: member.id },
                    { index: member.index }
                ]
            });

            if (deletedMember) {
                errors.push({
                    member: member.name || member.index || `key=${member.key}`,
                    error: `Membro è presente nel database eliminati`
                });
                continue;
            }
            membersToProcess.push(member);
        }

        // Inserisci i membri (upsert per prevenire duplicazioni residue)
        const operations = membersToProcess.map(member => {
            const normalizedId = String(member.id || '').trim();
            const filter = normalizedId ? { id: normalizedId } : { key: member.key };
            return {
                updateOne: {
                    filter,
                    update: { $set: { ...member, id: normalizedId || member.id } },
                    upsert: true
                }
            };
        });

        let bulkResult = { upsertedCount: 0, modifiedCount: 0, matchedCount: 0 };
        if (operations.length > 0) {
            bulkResult = await Member.bulkWrite(operations, { ordered: false });
        }

        return res.json({
            success: true,
            message: `Import completato: ${bulkResult.upsertedCount} inseriti, ${bulkResult.modifiedCount} aggiornati`,
            insertedCount: bulkResult.upsertedCount,
            updatedCount: bulkResult.modifiedCount,
            skippedExistingCount: skippedExisting.length,
            duplicatesInFileCount: duplicatesInFile.length,
            skippedExisting: skippedExisting.length > 0 ? skippedExisting : undefined,
            duplicatesInFile: duplicatesInFile.length > 0 ? duplicatesInFile : undefined,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Errore nell\'importazione membri:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

// Endpoint per verificare il token
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Utente non trovato'
            });
        }

        return res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                rsiHandle: user.rsiHandle,
                rsiVerified: user.rsiVerified,
                rsiAvatar: user.rsiAvatar,
                organizationRank: user.organizationRank,
                verificationCodeFound: user.verificationCodeFound,
                verificationRankVerified: user.verificationRankVerified,
                verificationMainOrgVerified: user.verificationMainOrgVerified,
                mainOrgName: user.mainOrgName
            }
        });
    } catch (error) {
        console.error('Errore nella verifica token:', error);
        return res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// Endpoint per verificare il token (versione v1)
app.get('/api/v1/auth/verify', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Utente non trovato'
            });
        }

        return res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                rsiHandle: user.rsiHandle,
                rsiVerified: user.rsiVerified,
                rsiAvatar: user.rsiAvatar,
                organizationRank: user.organizationRank,
                verificationCodeFound: user.verificationCodeFound,
                verificationRankVerified: user.verificationRankVerified,
                verificationMainOrgVerified: user.verificationMainOrgVerified,
                mainOrgName: user.mainOrgName
            }
        });
    } catch (error) {
        console.error('Errore nella verifica token:', error);
        return res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// Endpoint per logout
app.post('/api/v1/auth/logout', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const username = req.user.username;

        console.log(`🚪 Logout effettuato da: ${username} (ID: ${userId})`);

        return res.json({
            success: true,
            message: 'Logout effettuato con successo'
        });
    } catch (error) {
        console.error('Errore nel logout:', error);
        return res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// Endpoint per cambiare la password
app.put('/api/v1/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        // Validazione
        if (!newPassword) {
            return res.status(400).json({
                success: false,
                error: 'La nuova password è richiesta'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'La nuova password deve essere di almeno 6 caratteri'
            });
        }

        // Trova l'utente
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Utente non trovato'
            });
        }

        // Se l'utente non è verificato RSI, richiedi la password corrente
        if (!user.rsiVerified) {
            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'Password corrente richiesta per utenti non verificati'
                });
            }

            // Verifica la password corrente
            const isPasswordValid = await user.comparePassword(currentPassword);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: 'Password corrente non corretta'
                });
            }

            // Verifica che la nuova password sia diversa dalla corrente
            const isSamePassword = await user.comparePassword(newPassword);
            if (isSamePassword) {
                return res.status(400).json({
                    success: false,
                    error: 'La nuova password deve essere diversa dalla password corrente'
                });
            }
        } else {
            // Per utenti verificati RSI, verifica solo che la nuova password sia diversa dalla corrente
            const isSamePassword = await user.comparePassword(newPassword);
            if (isSamePassword) {
                return res.status(400).json({
                    success: false,
                    error: 'La nuova password deve essere diversa dalla password corrente'
                });
            }
        }

        // Aggiorna la password
        user.password = newPassword;
        await user.save();

        console.log(`🔐 Password cambiata per utente: ${user.username} (ID: ${userId})${user.rsiVerified ? ' [Utente verificato RSI - password corrente omessa]' : ''}`);

        return res.json({
            success: true,
            message: 'Password cambiata con successo'
        });
    } catch (error) {
        console.error('Errore nel cambio password:', error);
        return res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// Endpoint per generare un codice di verifica RSI
app.post('/api/v1/auth/verification-code', authenticateToken, (req, res) => {
    try {
        console.log('📥 Richiesta POST /api/auth/verification-code ricevuta');
        console.log('👤 Utente autenticato:', req.user?.username || req.user?.userId);

        // Genera un codice alfanumerico randomico di 6 caratteri
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const verificationCode = `[LSE:${code}]`;

        console.log('✅ Codice di verifica generato:', verificationCode);

        return res.json({
            success: true,
            code: verificationCode
        });
    } catch (error) {
        console.error('❌ Errore nella generazione codice:', error);
        console.error('Stack:', error.stack);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

// Endpoint per verificare il codice RSI nel profilo utente
app.post('/api/v1/auth/verify-rsi-code', checkMongoConnection, authenticateToken, async (req, res) => {
    try {
        const { handle, code } = req.body;
        const userId = req.user.userId;

        if (!handle || !code) {
            return res.status(400).json({
                success: false,
                error: 'Handle RSI e codice di verifica sono richiesti'
            });
        }

        // Cerca il codice nella pagina del profilo RSI
        const profileUrl = `https://robertsspaceindustries.com/citizens/${encodeURIComponent(handle)}`;

        const response = await fetch(profileUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                error: `Errore nel recupero profilo RSI: ${response.statusText}`,
                verified: false
            });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Cerca il codice nella pagina (bio, descrizione, ecc.)
        const pageText = $.text();
        const codeFound = pageText.includes(code);

        // Verifica il rank dell'organizzazione
        // Cerca il div con class="ranking" e una classe che inizia con "data" (es: "data10", "data5")
        // e conta gli span con classe "active"
        let organizationRank = 0;
        let rankVerified = false;
        try {
            // Prova diversi selettori per trovare il ranking
            // Il div ha class="ranking data10" (o simile), non "ranking data"
            const selectors = [
                'div.ranking',  // Cerca prima solo per "ranking" (più generico)
                '.ranking',
                '[class*="ranking"]',
                'div[class*="rank"]',
                '.org-rank',
                '[class*="org-rank"]'
            ];

            let rankingDiv = null;
            let foundSelector = null;

            for (const selector of selectors) {
                rankingDiv = $(selector);
                if (rankingDiv.length > 0) {
                    foundSelector = selector;
                    console.log(`🔍 Trovato ranking div con selettore: ${selector}`);
                    break;
                }
            }

            if (rankingDiv && rankingDiv.length > 0) {
                // Filtra per trovare il div che ha sia "ranking" che una classe che inizia con "data" seguita da un numero
                // (es: "data4", "data5", "data10", ecc.) - il numero finale cambia in base al rank
                // NOTA: Il rank viene determinato contando gli span con classe "active", NON dal numero nella classe "data"
                let targetDiv = null;
                rankingDiv.each((i, elem) => {
                    const classes = $(elem).attr('class') || '';
                    const classArray = classes.split(/\s+/);
                    const hasRanking = classArray.some(c => c === 'ranking' || c.includes('ranking'));
                    // Cerca una classe che inizia con "data" seguita da uno o più numeri (es: "data4", "data10", "data5")
                    const hasData = classArray.some(c => /^data\d+$/.test(c) || c === 'data');

                    if (hasRanking && hasData) {
                        targetDiv = $(elem);
                        console.log(`🔍 Trovato div ranking con classi: ${classes}`);
                        return false; // Break the loop
                    }
                });

                // Se non trovato con il filtro, usa il primo div ranking
                if (!targetDiv && rankingDiv.length > 0) {
                    targetDiv = rankingDiv.first();
                    console.log(`🔍 Usando il primo div ranking trovato`);
                }

                if (!targetDiv || targetDiv.length === 0) {
                    console.log('⚠️ Nessun div ranking valido trovato');
                } else {
                    // Prova diversi modi per trovare gli span attivi
                    const activeSpanSelectors = [
                        'span.active',
                        'span[class*="active"]',
                        'span[class="active"]',
                        '.active',
                        '[class*="active"]'
                    ];

                    let activeSpans = null;
                    let foundSpanSelector = null;

                    for (const spanSelector of activeSpanSelectors) {
                        activeSpans = targetDiv.find(spanSelector);
                        if (activeSpans.length > 0) {
                            foundSpanSelector = spanSelector;
                            console.log(`🔍 Trovati ${activeSpans.length} span attivi con selettore: ${spanSelector}`);
                            break;
                        }
                    }

                    // Se non trovato nel div specifico, cerca in tutta la pagina
                    if (!activeSpans || activeSpans.length === 0) {
                        console.log('⚠️ Nessuno span attivo trovato nel div ranking, cerco in tutta la pagina...');
                        for (const spanSelector of activeSpanSelectors) {
                            activeSpans = $(spanSelector);
                            if (activeSpans.length > 0) {
                                foundSpanSelector = spanSelector;
                                console.log(`🔍 Trovati ${activeSpans.length} span attivi in tutta la pagina con selettore: ${spanSelector}`);
                                break;
                            }
                        }
                    }

                    if (activeSpans && activeSpans.length > 0) {
                        organizationRank = activeSpans.length;
                        rankVerified = organizationRank >= 4;
                        console.log(`📊 Organization Rank trovato: ${organizationRank} stelle attive (richiesto: >= 4)`);
                        console.log(`   Selettore div: ${foundSelector || 'N/A'}`);
                        console.log(`   Selettore span: ${foundSpanSelector || 'N/A'}`);
                        if (targetDiv) {
                            console.log(`   Classi del div: ${targetDiv.attr('class') || 'N/A'}`);
                        }
                    } else {
                        console.log('⚠️ Nessuno span attivo trovato con nessun selettore');
                        // Log dell'HTML del div ranking per debug
                        if (targetDiv && targetDiv.length > 0) {
                            const htmlContent = targetDiv.html() || '';
                            console.log(`   HTML del div ranking (primi 500 caratteri): ${htmlContent.substring(0, 500)}`);
                            // Conta anche tutti gli span nel div per debug
                            const allSpans = targetDiv.find('span');
                            console.log(`   Totale span nel div: ${allSpans.length}`);
                            allSpans.each((i, span) => {
                                const spanClasses = $(span).attr('class') || '';
                                console.log(`     Span ${i + 1}: class="${spanClasses}"`);
                            });

                            // Avvia il server
                            const PORT = process.env.PORT || 5000;
                            app.listen(PORT, async () => {
                                logger.info(`🚀 Server avviato su porta ${PORT}`);
                                logger.info(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
                                logger.info(`🔗 Swagger UI: http://localhost:${PORT}/api/v1/docs`);
                            });
                        }
                    }
                }
            } else {
                console.log('⚠️ Div ranking non trovato con nessun selettore');
                // Log di debug: cerca qualsiasi elemento che contenga "rank" o "star"
                const rankElements = $('[class*="rank"], [class*="star"], [id*="rank"], [id*="star"]');
                console.log(`   Elementi trovati con "rank" o "star": ${rankElements.length}`);
                if (rankElements.length > 0) {
                    console.log(`   Primo elemento trovato: ${rankElements.first().attr('class') || rankElements.first().attr('id') || 'N/A'}`);
                }
            }
        } catch (rankError) {
            console.error('Errore nella verifica del rank organizzazione:', rankError);
            console.error('Stack trace:', rankError.stack);
            // Continua anche se la verifica del rank fallisce
        }

        // Estrai l'immagine del profilo RSI
        let rsiAvatarUrl = null;
        try {
            // Cerca l'immagine del profilo in vari possibili selettori
            // Pattern comuni per le immagini profilo RSI
            const avatarSelectors = [
                'img.avatar',
                'img[class*="avatar"]',
                'img[class*="profile"]',
                'img[class*="citizen"]',
                '.profile-image img',
                '.avatar-image img',
                '.citizen-avatar img',
                '.profile-picture img',
                '.user-avatar img',
                'img[src*="avatar"]',
                'img[src*="profile"]',
                'img[src*="citizen"]',
                'img[src*="portrait"]',
                '.citizen-portrait img',
                '.portrait img'
            ];

            for (const selector of avatarSelectors) {
                const avatarImg = $(selector).first();
                if (avatarImg.length) {
                    let src = avatarImg.attr('src') || avatarImg.attr('data-src') || avatarImg.attr('data-lazy-src');
                    if (src) {
                        // Converti URL relativi in assoluti
                        if (src.startsWith('//')) {
                            src = 'https:' + src;
                        } else if (src.startsWith('/')) {
                            src = 'https://robertsspaceindustries.com' + src;
                        } else if (!src.startsWith('http')) {
                            src = 'https://robertsspaceindustries.com/' + src;
                        }
                        // Verifica che sia un'immagine valida (non un placeholder)
                        if (!src.includes('placeholder') && !src.includes('default') && src.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
                            rsiAvatarUrl = src;
                            break;
                        }
                    }
                }
            }

            // Se non trovato con i selettori, cerca pattern nell'HTML con regex
            if (!rsiAvatarUrl) {
                // Cerca immagini che contengono "avatar", "profile", "citizen" o "portrait" nell'URL
                const avatarMatches = html.matchAll(/<img[^>]*src=["']([^"']*(?:avatar|profile|citizen|portrait)[^"']*\.(?:jpg|jpeg|png|gif|webp))["']/gi);
                for (const match of avatarMatches) {
                    if (match[1]) {
                        let src = match[1];
                        // Escludi placeholder e immagini default
                        if (!src.includes('placeholder') && !src.includes('default')) {
                            if (src.startsWith('//')) {
                                src = 'https:' + src;
                            } else if (src.startsWith('/')) {
                                src = 'https://robertsspaceindustries.com' + src;
                            } else if (!src.startsWith('http')) {
                                src = 'https://robertsspaceindustries.com/' + src;
                            }
                            rsiAvatarUrl = src;
                            break;
                        }
                    }
                }
            }

            // Se ancora non trovato, cerca qualsiasi immagine nella sezione profilo
            if (!rsiAvatarUrl) {
                const profileSection = $('.profile, .citizen-profile, .user-profile, [class*="profile"]').first();
                if (profileSection.length) {
                    const profileImg = profileSection.find('img').first();
                    if (profileImg.length) {
                        let src = profileImg.attr('src') || profileImg.attr('data-src');
                        if (src && !src.includes('placeholder') && !src.includes('default')) {
                            if (src.startsWith('//')) {
                                src = 'https:' + src;
                            } else if (src.startsWith('/')) {
                                src = 'https://robertsspaceindustries.com' + src;
                            } else if (!src.startsWith('http')) {
                                src = 'https://robertsspaceindustries.com/' + src;
                            }
                            rsiAvatarUrl = src;
                        }
                    }
                }
            }

            console.log(`🖼️ Avatar RSI trovato: ${rsiAvatarUrl || 'NON TROVATO'}`);
        } catch (avatarError) {
            console.error('Errore nell\'estrazione avatar RSI:', avatarError);
            // Continua anche se l'estrazione dell'avatar fallisce
        }

        // Verifica che la main org sia "Logistic Space Economy"
        let mainOrgVerified = false;
        let mainOrgName = null;
        try {
            const orgPageUrl = `https://robertsspaceindustries.com/en/citizens/${encodeURIComponent(handle)}/organizations`;
            const orgResponse = await fetch(orgPageUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (orgResponse.ok) {
                const orgHtml = await orgResponse.text();
                const $org = cheerio.load(orgHtml);

                // Estrai il nome dell'organizzazione principale
                // Cerca pattern come "Main organization" seguito dal nome
                const mainOrgMatch = orgHtml.match(/Main organization[\s\S]*?<\/h[12]>[\s\S]*?<h[12][^>]*>([^<]+)<\/h[12]>/i);
                if (mainOrgMatch && mainOrgMatch[1]) {
                    mainOrgName = mainOrgMatch[1].trim();
                }

                // Se non trovato, cerca direttamente nel testo HTML
                if (!mainOrgName) {
                    const textContent = $org('body').text();
                    const lines = textContent.split('\n').map(l => l.trim()).filter(l => l);

                    let foundMain = false;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].toLowerCase().includes('main organization')) {
                            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                                const line = lines[j];
                                if (line &&
                                    !line.match(/^\d+$/) &&
                                    !line.toLowerCase().includes('members') &&
                                    !line.toLowerCase().includes('overview') &&
                                    line.length > 2 &&
                                    line.length < 100) {
                                    mainOrgName = line;
                                    foundMain = true;
                                    break;
                                }
                            }
                            if (foundMain) break;
                        }
                    }
                }

                // Verifica che la main org sia "Logistic Space Economy"
                if (mainOrgName) {
                    mainOrgVerified = mainOrgName.trim() === 'Logistic Space Economy';
                    console.log(`🏢 Main Org trovata: "${mainOrgName}" - Verificata: ${mainOrgVerified}`);
                } else {
                    console.log('⚠️ Main Org non trovata nella pagina organizzazioni');
                }
            } else {
                console.log(`⚠️ Errore nel recupero pagina organizzazioni: ${orgResponse.statusText}`);
            }
        } catch (orgError) {
            console.error('Errore nella verifica main org:', orgError);
            console.error('Stack trace:', orgError.stack);
            // Continua anche se la verifica della main org fallisce
        }

        // La verifica ha successo solo se: codice trovato E rank organizzazione >= 4 E main org = "Logistic Space Economy"
        const verificationSuccess = codeFound && rankVerified && mainOrgVerified;

        // Salva sempre le condizioni di verifica nel database (anche se non tutte sono soddisfatte)
        // così l'utente può vedere quali condizioni sono verificate e quali no
        try {
            const handleLower = handle.trim().toLowerCase();

            // Prepara i dati di aggiornamento con tutte le condizioni
            const verificationUpdateData: any = {
                rsiHandle: handle.trim(),
                verificationCodeFound: codeFound,
                verificationRankVerified: rankVerified,
                verificationMainOrgVerified: mainOrgVerified,
                mainOrgName: mainOrgName,
                organizationRank: organizationRank,
                updatedAt: new Date()
            };

            // Se la verifica ha successo completo, imposta anche rsiVerified a true
            if (verificationSuccess) {
                verificationUpdateData.rsiVerified = true;
            }

            // Aggiungi l'avatar se trovato
            if (rsiAvatarUrl) {
                verificationUpdateData.rsiAvatar = rsiAvatarUrl;
            }

            // Aggiorna sempre le condizioni di verifica
            await User.findByIdAndUpdate(
                userId,
                { $set: verificationUpdateData },
                { new: true }
            );

            console.log(`📝 Condizioni verifica salvate per utente ID: ${userId} -> Codice: ${codeFound ? '✓' : '✗'}, Rank: ${rankVerified ? '✓' : '✗'} (${organizationRank}/4), Main Org: ${mainOrgVerified ? '✓' : '✗'} (${mainOrgName || 'N/A'})`);
        } catch (verificationSaveError) {
            console.error('Errore nel salvataggio condizioni verifica:', verificationSaveError);
            // Continua anche se il salvataggio fallisce
        }

        // Se la verifica ha successo, aggiorna anche il nome utente se possibile
        if (verificationSuccess) {
            try {
                const handleLower = handle.trim().toLowerCase();

                // Verifica se l'handle RSI è già in uso da un altro utente come username
                const existingUserWithHandle = await User.findOne({
                    username: handleLower,
                    _id: { $ne: userId }
                });

                if (existingUserWithHandle) {
                    // Le condizioni sono già state salvate, recupera l'utente aggiornato
                    const user = await User.findById(userId);

                    if (user) {
                        console.log(`✅ Verifica RSI salvata (username non aggiornato - handle già in uso) per utente ID: ${userId} -> Handle: ${handle}, Rank: ${organizationRank}`);
                        return res.json({
                            success: true,
                            verified: true,
                            usernameUpdated: false,
                            message: 'Codice di verifica trovato, ma l\'handle RSI è già utilizzato come username da un altro utente. La verifica è stata salvata ma il nome utente non è stato modificato.',
                            user: {
                                id: user._id,
                                username: user.username,
                                rsiHandle: user.rsiHandle,
                                rsiVerified: user.rsiVerified,
                                rsiAvatar: user.rsiAvatar,
                                organizationRank: user.organizationRank,
                                verificationCodeFound: user.verificationCodeFound,
                                verificationRankVerified: user.verificationRankVerified,
                                verificationMainOrgVerified: user.verificationMainOrgVerified,
                                mainOrgName: user.mainOrgName
                            }
                        });
                    }
                }

                // Aggiorna il nome utente (le condizioni sono già state salvate)
                const user = await User.findByIdAndUpdate(
                    userId,
                    {
                        $set: {
                            username: handleLower,
                            updatedAt: new Date()
                        }
                    },
                    { new: true }
                );

                if (user) {
                    console.log(`✅ Verifica RSI salvata e username aggiornato per utente ID: ${userId} -> Username: ${user.username}, Handle: ${handle}, Rank: ${organizationRank}, Avatar: ${user.rsiAvatar || 'N/A'}`);
                    return res.json({
                        success: true,
                        verified: true,
                        usernameUpdated: true,
                        message: 'Codice di verifica trovato nel profilo RSI. Verifica salvata e nome utente aggiornato con successo.',
                        user: {
                            id: user._id,
                            username: user.username,
                            rsiHandle: user.rsiHandle,
                            rsiVerified: user.rsiVerified,
                            rsiAvatar: user.rsiAvatar,
                            organizationRank: user.organizationRank,
                            verificationCodeFound: user.verificationCodeFound,
                            verificationRankVerified: user.verificationRankVerified,
                            verificationMainOrgVerified: user.verificationMainOrgVerified,
                            mainOrgName: user.mainOrgName
                        }
                    });
                }
            } catch (dbError) {
                console.error('Errore nel salvataggio verifica RSI nel database:', dbError);
                // Continua comunque a restituire la verifica positiva anche se il salvataggio fallisce
            }
        }

        // Costruisci il messaggio di risposta
        let message = '';
        if (!codeFound && !rankVerified && !mainOrgVerified) {
            message = 'Codice di verifica non trovato, rank organizzazione insufficiente e main org non corretta';
        } else if (!codeFound && !rankVerified) {
            message = 'Codice di verifica non trovato e rank organizzazione insufficiente (richiesto: >= 4)';
        } else if (!codeFound && !mainOrgVerified) {
            message = 'Codice di verifica non trovato e main org non corretta (richiesta: "Logistic Space Economy")';
        } else if (!rankVerified && !mainOrgVerified) {
            message = `Rank organizzazione insufficiente (trovato: ${organizationRank}, richiesto: >= 4) e main org non corretta (trovata: "${mainOrgName || 'N/A'}", richiesta: "Logistic Space Economy")`;
        } else if (!codeFound) {
            message = 'Codice di verifica non trovato nel profilo RSI. Assicurati di aver inserito il codice nella tua bio o descrizione.';
        } else if (!rankVerified) {
            message = `Codice di verifica trovato, ma rank organizzazione insufficiente (trovato: ${organizationRank}, richiesto: >= 4)`;
        } else if (!mainOrgVerified) {
            message = `Codice di verifica trovato e rank verificato, ma main org non corretta (trovata: "${mainOrgName || 'N/A'}", richiesta: "Logistic Space Economy")`;
        } else {
            message = 'Codice di verifica trovato, rank organizzazione verificato e main org corretta';
        }

        // Recupera l'utente aggiornato con tutte le condizioni salvate
        let updatedUser = null;
        try {
            updatedUser = await User.findById(userId);
        } catch (userFetchError) {
            console.error('Errore nel recupero utente aggiornato:', userFetchError);
        }

        return res.json({
            success: true,
            verified: verificationSuccess,
            message: message,
            organizationRank: organizationRank,
            rankVerified: rankVerified,
            codeFound: codeFound,
            mainOrgVerified: mainOrgVerified,
            mainOrgName: mainOrgName,
            user: updatedUser ? {
                id: updatedUser._id,
                username: updatedUser.username,
                rsiHandle: updatedUser.rsiHandle,
                rsiVerified: updatedUser.rsiVerified,
                rsiAvatar: updatedUser.rsiAvatar,
                organizationRank: updatedUser.organizationRank,
                verificationCodeFound: updatedUser.verificationCodeFound,
                verificationRankVerified: updatedUser.verificationRankVerified,
                verificationMainOrgVerified: updatedUser.verificationMainOrgVerified,
                mainOrgName: updatedUser.mainOrgName
            } : null
        });
    } catch (error) {
        console.error('Errore nella verifica codice RSI:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server',
            verified: false
        });
    }
});

// Endpoint per aggiornare il profilo utente (username)
app.put('/api/v1/auth/profile', checkMongoConnection, authenticateToken, async (req, res) => {
    try {
        const { username, rsiHandle, rsiVerified } = req.body;
        const userId = req.user.userId;

        if (!username) {
            return res.status(400).json({
                success: false,
                error: 'Username è richiesto'
            });
        }

        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({
                success: false,
                error: 'Username deve essere tra 3 e 30 caratteri'
            });
        }

        const usernameLower = username.toLowerCase().trim();

        // Verifica se il nuovo username è già in uso da un altro utente
        const existingUser = await User.findOne({
            username: usernameLower,
            _id: { $ne: userId }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'Username già esistente'
            });
        }

        // Prepara l'oggetto di aggiornamento
        const updateData: { username: string; updatedAt: Date; rsiHandle?: string | null; rsiVerified?: boolean } = {
            username: usernameLower,
            updatedAt: new Date()
        };

        // Aggiungi i campi RSI se forniti
        if (rsiHandle !== undefined) {
            updateData.rsiHandle = rsiHandle.trim() || null;
        }
        if (rsiVerified !== undefined) {
            updateData.rsiVerified = rsiVerified === true;
        }

        // Aggiorna l'utente
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Utente non trovato'
            });
        }

        console.log(`✅ Username aggiornato per utente ID: ${userId} -> ${user.username}${user.rsiVerified ? ' (RSI verificato)' : ''}`);

        return res.json({
            success: true,
            message: 'Username aggiornato con successo',
            user: {
                id: user._id,
                username: user.username,
                rsiHandle: user.rsiHandle,
                rsiVerified: user.rsiVerified,
                rsiAvatar: user.rsiAvatar,
                organizationRank: user.organizationRank,
                verificationCodeFound: user.verificationCodeFound,
                verificationRankVerified: user.verificationRankVerified,
                verificationMainOrgVerified: user.verificationMainOrgVerified,
                mainOrgName: user.mainOrgName
            }
        });
    } catch (error) {
        console.error('Errore nell\'aggiornamento profilo:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

// Endpoint per salvare i membri nel database
app.post('/api/v1/members', checkMongoConnection, async (req, res) => {
    try {
        const { members } = req.body;

        if (!Array.isArray(members) || members.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Array di membri richiesto'
            });
        }

        // Opzioni: elimina tutti i membri esistenti e inserisci i nuovi, oppure aggiorna/inserisci
        const replaceAll = req.query.replace === 'true';

        if (replaceAll) {
            // Elimina tutti i membri esistenti
            await Member.deleteMany({});
        }

        // Controlla quali membri sono nel database eliminati
        const errors = [];
        const membersToProcess = [];

        for (const member of members) {
            // Verifica se il membro esiste nel database eliminati
            const deletedMember = await DeletedMember.findOne({
                $or: [
                    { key: member.key },
                    { name: member.name, id: member.id },
                    { index: member.index }
                ]
            });

            if (deletedMember) {
                errors.push({
                    member: member.name || member.index || `key=${member.key}`,
                    error: `Membro "${member.name || member.index || member.key}" è presente nel database dei membri eliminati e non può essere caricato`
                });
                console.warn(`⚠️ Membro "${member.name || member.index || member.key}" (key=${member.key}) è nel database eliminati, saltato`);
                continue; // Salta questo membro
            }

            membersToProcess.push(member);
        }

        // Prepara i membri per l'inserimento/aggiornamento (solo quelli non eliminati)
        const operations = membersToProcess.map(member => ({
            updateOne: {
                filter: { key: member.key },
                update: {
                    $set: {
                        key: member.key,
                        index: member.index || '',
                        tag: member.tag || 'LSE-P',
                        name: member.name || '',
                        id: member.id || '',
                        date: member.date || '',
                        idoneita: member.idoneita || false,
                        watchdog: member.watchdog || member.daTenereDOcchio || false, // Supporta anche il vecchio nome per compatibilità
                        promoted: member.promoted || false,
                        affiliazioniOrg: member.affiliazioniOrg || '',
                        orgValidation: member.orgValidation || null,
                        note: member.note || '',
                        updatedAt: new Date()
                    }
                },
                upsert: true // Inserisci se non esiste, aggiorna se esiste
            }
        }));

        // Esegui le operazioni in batch solo per i membri validi
        let result = { upsertedCount: 0, modifiedCount: 0 };
        if (operations.length > 0) {
            result = await Member.bulkWrite(operations);
        }

        return res.json({
            success: true,
            message: `Salvati ${result.upsertedCount + result.modifiedCount} membri${errors.length > 0 ? `, ${errors.length} membri saltati (presenti nel database eliminati)` : ''}`,
            inserted: result.upsertedCount,
            updated: result.modifiedCount,
            total: members.length,
            processed: membersToProcess.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Errore nel salvataggio membri:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

// Endpoint per recuperare tutti i membri dal database
app.get('/api/v1/members', checkMongoConnection, async (req, res) => {
    try {
        console.log('📥 Richiesta GET /api/members ricevuta');
        const members = await Member.find({}).sort({ key: 1 }).lean();
        console.log(`📊 Trovati ${members.length} membri nel database`);

        // Recupera tutti i membri eliminati per verificare quali escludere
        const deletedMembers = await DeletedMember.find({}).lean();
        console.log(`🗑️ Trovati ${deletedMembers.length} membri nel database eliminati`);
        const deletedKeys = new Set(deletedMembers.map(dm => dm.key));
        const deletedNameIdPairs = new Set(deletedMembers.map(dm => `${dm.name}|${dm.id}`));
        const deletedIndexes = new Set(deletedMembers.map(dm => dm.index).filter(idx => idx));

        // Filtra i membri escludendo quelli presenti nel database eliminati
        const validMembers = members.filter(member => {
            // Verifica se il membro è nel database eliminati
            if (deletedKeys.has(member.key)) {
                return false;
            }
            if (deletedNameIdPairs.has(`${member.name}|${member.id}`)) {
                return false;
            }
            if (member.index && deletedIndexes.has(member.index)) {
                return false;
            }
            return true;
        });
        console.log(`✅ ${validMembers.length} membri validi dopo il filtro`);

        // Migrazione: converti daTenereDOcchio a watchdog se presente
        const migratedMembers = validMembers.map(member => {
            if (member.daTenereDOcchio !== undefined && member.watchdog === undefined) {
                member.watchdog = member.daTenereDOcchio;
                delete member.daTenereDOcchio;
                // Opzionalmente, salva la migrazione nel DB
                Member.updateOne({ _id: member._id }, { $set: { watchdog: member.watchdog }, $unset: { daTenereDOcchio: 1 } }).catch(err => {
                    console.warn('Errore nella migrazione del campo watchdog per membro:', member.key, err);
                });
            }
            return member;
        });

        // Se ci sono membri nel database principale che sono anche nel database eliminati, rimuovili
        const membersToRemove = members.filter(member => {
            if (deletedKeys.has(member.key) || deletedNameIdPairs.has(`${member.name}|${member.id}`) || (member.index && deletedIndexes.has(member.index))) {
                return true;
            }
            return false;
        });

        if (membersToRemove.length > 0) {
            console.log(`🧹 Rimozione ${membersToRemove.length} membri dal database principale (presenti nel database eliminati)`);
            for (const member of membersToRemove) {
                await Member.findOneAndDelete({ _id: member._id });
                console.log(`   ✅ Rimosso membro key=${member.key} (${member.name}) dal database principale`);
            }
        }

        const responseData = {
            success: true,
            members: migratedMembers,
            count: migratedMembers.length
        };
        console.log(`📤 Invio risposta: ${responseData.count} membri`);
        return res.json(responseData);
    } catch (error) {
        console.error('❌ Errore nel recupero membri:', error);
        console.error('Stack:', error.stack);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

// Endpoint per resettare la validazione di tutti i membri (DEVE essere PRIMA della route con parametro)
app.put('/api/v1/members/reset-validation/all', checkMongoConnection, authenticateToken, async (req, res) => {
    try {
        const result = await Member.updateMany(
            {},
            {
                $set: {
                    affiliazioniOrg: '',
                    orgValidation: null,
                    updatedAt: new Date()
                }
            }
        );

        console.log(`🔄 Validazione resettata per ${result.modifiedCount} membri`);

        return res.json({
            success: true,
            message: `Validazione resettata con successo per ${result.modifiedCount} membri`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Errore nel reset validazione di tutti i membri:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

// Endpoint per resettare la validazione di un membro (DEVE essere DOPO la route /all)
app.put('/api/v1/members/:key/reset-validation', checkMongoConnection, authenticateToken, async (req, res) => {
    try {
        const { key } = req.params;

        const member = await Member.findOneAndUpdate(
            { key: parseInt(key) },
            {
                $set: {
                    affiliazioniOrg: '',
                    orgValidation: null,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Membro non trovato'
            });
        }

        console.log(`🔄 Validazione resettata per membro key=${key} (${member.name})`);

        return res.json({
            success: true,
            message: 'Validazione resettata con successo',
            member: member
        });
    } catch (error) {
        console.error('Errore nel reset validazione:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

// Endpoint per validare un membro (controlla affiliazioni org RSI)
app.post('/api/v1/members/:key/validate', checkMongoConnection, authenticateToken, async (req, res) => {
    try {
        const { key } = req.params;

        // Trova il membro
        const member = await Member.findOne({ key: parseInt(key) });
        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Membro non trovato'
            });
        }

        // Verifica che abbia un nome Discord (usato come handle RSI)
        if (!member.name || member.name.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Il membro non ha un nome Discord associato'
            });
        }

        // Estrai l'handle RSI dal nome Discord (rimuovi # e discriminatore)
        const rsiHandle = member.name.split('#')[0].trim();
        if (!rsiHandle) {
            return res.status(400).json({
                success: false,
                error: 'Impossibile estrarre l\'handle RSI dal nome Discord'
            });
        }

        console.log(`🔍 Validazione membro key=${key} (${member.name}) con handle RSI estratto: ${rsiHandle}`);

        // Chiama l'endpoint per ottenere le affiliazioni org
        const orgsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/v1/rsi/orgs/${encodeURIComponent(rsiHandle)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        // Anche se la rotta proxy risponde con status != 200 (es. 404),
        // vogliamo comunque salvare la validazione sul membro per mostrare badge/issue in UI.
        let orgsData = null;
        try {
            orgsData = await orgsResponse.json();
        } catch (e) {
            orgsData = null;
        }

        if (!orgsData || typeof orgsData !== 'object') {
            console.error(`❌ Risposta non valida dal proxy orgs per ${member.id}: ${orgsResponse.status}`);
            return res.status(502).json({
                success: false,
                error: `Risposta non valida dal proxy RSI orgs (${orgsResponse.status})`
            });
        }

        // Aggiorna il membro con i dati di validazione
        // Normalizza hasOnlyOneOrg in base a ciò che mostriamo in orgs_string, per evitare mismatch UI:
        // se orgs_string contiene 1 solo nome, hasOnlyOneOrg deve risultare true.
        if (orgsData && typeof orgsData === 'object' && orgsData.validation && typeof orgsData.validation === 'object') {
            const is404 =
                orgsResponse.status === 404 ||
                String(orgsData.orgs_string || '').trim() === '404' ||
                (Array.isArray(orgsData.validation.issues) &&
                    orgsData.validation.issues.some((i) => {
                        const s = String(i || '').toLowerCase();
                        return s.includes('404') || s.includes('not found');
                    }));

            const orgsString = String(orgsData.orgs_string || '').trim();
            if (orgsString && !is404) {
                const displayedNames = orgsString
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);

                if (displayedNames.length === 1) {
                    orgsData.count = 1;
                    orgsData.validation.hasOnlyOneOrg = true;
                    // rimuovi eventuale issue di conteggio se presente
                    if (Array.isArray(orgsData.validation.issues)) {
                        orgsData.validation.issues = orgsData.validation.issues.filter(i => !String(i).includes('organizzazioni invece di 1'));
                    }
                    // Regola: valido solo se main org corretta, solo 1 org e ZERO issues.
                    const mainOk = orgsData.validation.hasMainName === true && String(orgsData.validation.mainOrgName || '').trim().length > 0;
                    const issuesLen = Array.isArray(orgsData.validation.issues) ? orgsData.validation.issues.length : 0;
                    orgsData.validation.isValid = Boolean(mainOk && orgsData.validation.hasOnlyOneOrg && issuesLen === 0);
                }
            }

            // Regola globale: se c'è almeno 1 issue, la validazione deve fallire.
            const issuesLenGlobal = Array.isArray(orgsData.validation.issues) ? orgsData.validation.issues.length : 0;
            if (issuesLenGlobal > 0) {
                orgsData.validation.isValid = false;
            }

            // Caso 404: non contare nessuna org -> "Solo 1 org" deve risultare NO
            if (is404) {
                orgsData.count = 0;
                orgsData.validation.hasOnlyOneOrg = false;
            }
        }

        const updateData = {
            affiliazioniOrg: orgsData.orgs_string || '',
            orgValidation: orgsData.validation ? {
                ...orgsData.validation,
                // include org list so frontend can render clickable affiliations
                orgs: Array.isArray(orgsData.orgs) ? orgsData.orgs : [],
                count: typeof orgsData.count === 'number' ? orgsData.count : undefined,
                orgs_string: orgsData.orgs_string || '',
            } : null,
            updatedAt: new Date()
        };

        const updatedMember = await Member.findOneAndUpdate(
            { key: parseInt(key) },
            { $set: updateData },
            { new: true }
        );

        console.log(`✅ Validazione completata per membro key=${key} (${member.name}):`, {
            isValid: orgsData.validation?.isValid,
            mainOrg: orgsData.validation?.mainOrgName,
            issues: orgsData.validation?.issues?.length || 0
        });

        return res.json({
            success: true,
            message: 'Validazione completata',
            member: updatedMember,
            validation: orgsData.validation
        });

    } catch (error) {
        console.error('Errore nella validazione membro:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

// Endpoint per eliminare un membro (salva nel DB eliminati prima di rimuovere)
app.delete('/api/v1/members/:key', strictLimiter, checkMongoConnection, authenticateToken, async (req, res) => {
    try {
        const { key } = req.params;
        const { deletionReasons } = (req.body || {}) as { deletionReasons?: unknown };

        const numericKey = parseInt(String(key), 10);
        if (!Number.isFinite(numericKey)) {
            return res.status(400).json({
                success: false,
                error: 'Key non valida'
            });
        }

        // Trova il membro da eliminare
        const member = await Member.findOne({ key: numericKey });

        // Se non è nel DB principale, verifica se è già nei deleted-members (delete idempotente)
        if (!member) {
            const alreadyDeleted = await DeletedMember.findOne({ key: numericKey }).lean();
            if (alreadyDeleted) {
                return res.json({
                    success: true,
                    message: 'Membro già eliminato',
                    alreadyDeleted: true,
                    deletedAt: alreadyDeleted.deletedAt,
                    deletedBy: alreadyDeleted.deletedBy,
                    deletionReasons: Array.isArray(alreadyDeleted.deletionReasons) ? alreadyDeleted.deletionReasons : []
                });
            }

            return res.status(404).json({
                success: false,
                error: 'Membro non trovato'
            });
        }

        const deletedByUsername = req.user?.username || 'system';
        const deletedAt = new Date();

        // Assicurati che deletionReasons sia sempre un array
        const finalDeletionReasons = Array.isArray(deletionReasons) ? deletionReasons : [];

        // Salva il membro nel database dei membri eliminati
        const memberData = member.toObject();
        const deletedMemberData: any = {
            ...memberData,
            deletedAt,
            deletedBy: deletedByUsername,
            deletionReasons: finalDeletionReasons,
            originalCreatedAt: memberData.createdAt,
            originalUpdatedAt: memberData.updatedAt
        };

        // Rimuovi _id per evitare conflitti
        delete deletedMemberData._id;

        const deletedMember = new DeletedMember(deletedMemberData);
        await deletedMember.save();

        // Elimina il membro dal database principale
        await Member.findOneAndDelete({ key: numericKey });

        return res.json({
            success: true,
            message: 'Membro eliminato con successo e salvato nel database eliminati',
            deletedAt,
            deletedBy: deletedByUsername,
            deletionReasons: finalDeletionReasons
        });
    } catch (error: any) {
        console.error('Errore nell\'eliminazione membro:', error);
        return res.status(500).json({
            success: false,
            error: error?.message || 'Errore interno del server'
        });
    }
});

// Endpoint per recuperare tutti i membri eliminati
app.get('/api/v1/deleted-members', checkMongoConnection, async (req, res) => {
    try {
        const deletedMembers = await DeletedMember.find({}).sort({ deletedAt: -1 }).lean();
        
        return res.json({
            success: true,
            deletedMembers: deletedMembers
        });
    } catch (error: any) {
        console.error('Errore nel recupero dei membri eliminati:', error);
        return res.status(500).json({
            success: false,
            error: error?.message || 'Errore interno del server'
        });
    }
});

// Endpoint per ripristinare un membro eliminato
app.post('/api/v1/deleted-members/:key/restore', checkMongoConnection, async (req, res) => {
    try {
        const { key } = req.params;
        const numericKey = parseInt(key, 10);
        
        if (!Number.isFinite(numericKey)) {
            return res.status(400).json({
                success: false,
                error: 'Key non valida'
            });
        }

        // Trova il membro nei membri eliminati
        const deletedMember = await DeletedMember.findOne({ key: numericKey });
        
        if (!deletedMember) {
            return res.status(404).json({
                success: false,
                error: 'Membro eliminato non trovato'
            });
        }
        
        // Controlla se esiste già un membro attivo con la stessa key
        const existingMember = await Member.findOne({ key: numericKey });
        if (existingMember) {
            return res.status(400).json({
                success: false,
                error: 'Un membro attivo con questa chiave esiste già'
            });
        }
        
        // Ripristina il membro nel DB principale
        const memberData = deletedMember.toObject();
        delete memberData._id;
        delete memberData.deletedAt;
        delete memberData.deletedBy;
        delete memberData.deletionReasons;
        delete memberData.originalCreatedAt;
        delete memberData.originalUpdatedAt;
        delete memberData.__v;
        
        // Se c'erano createdAt e updatedAt originali, ripristinali
        if (deletedMember.originalCreatedAt) memberData.createdAt = deletedMember.originalCreatedAt;
        if (deletedMember.originalUpdatedAt) memberData.updatedAt = deletedMember.originalUpdatedAt;
        
        const restoredMember = new Member(memberData);
        await restoredMember.save();
        
        // Rimuovilo dai deleted-members
        await DeletedMember.findOneAndDelete({ key: numericKey });
        
        return res.json({
            success: true,
            message: 'Membro ripristinato con successo',
            member: restoredMember
        });
    } catch (error: any) {
        console.error('Errore nel ripristino del membro eliminato:', error);
        return res.status(500).json({
            success: false,
            error: error?.message || 'Errore interno del server'
        });
    }
});

// Endpoint per aggiornare un singolo membro
app.put('/api/v1/members/:key', checkMongoConnection, async (req, res) => {
    try {
        const { key } = req.params;
        const updateData = req.body;

        // Rimuovi _id e createdAt se presenti per evitare conflitti
        delete updateData._id;
        delete updateData.createdAt;
        updateData.updatedAt = new Date();

        // Migrazione: converti daTenereDOcchio a watchdog se presente
        if (updateData.daTenereDOcchio !== undefined && updateData.watchdog === undefined) {
            updateData.watchdog = updateData.daTenereDOcchio;
            delete updateData.daTenereDOcchio;
        }

        // Regola business: da 1 richiamo in su -> automaticamente "da tenere d'occhio"
        // (non forziamo l'operazione inversa: se scende sotto 1, lasciamo lo stato com'è)
        if (updateData.richiami !== undefined) {
            const r = Number(updateData.richiami);
            if (Number.isFinite(r) && r >= 1) {
                updateData.watchdog = true;
                updateData.idoneita = false;
            }
        }

        // Log per verificare che orgValidation venga salvata
        if (updateData.orgValidation) {
            console.log(`💾 Salvataggio validazione per membro key=${key}:`, {
                isValid: updateData.orgValidation.isValid,
                hasOnlyOneOrg: updateData.orgValidation.hasOnlyOneOrg,
                hasMainName: updateData.orgValidation.hasMainName,
                mainOrgName: updateData.orgValidation.mainOrgName,
                issuesCount: updateData.orgValidation.issues?.length || 0
            });
        }

        const member = await Member.findOneAndUpdate(
            { key: parseInt(key) },
            { $set: updateData },
            { new: true, upsert: false }
        );

        if (!member) {
            return res.status(404).json({
                success: false,
                error: 'Membro non trovato'
            });
        }

        // Verifica che orgValidation sia stata salvata correttamente
        if (updateData.orgValidation && member.orgValidation) {
            console.log(`✅ Validazione confermata nel database per membro key=${key}`);
        }

        return res.json({
            success: true,
            member: member
        });
    } catch (error) {
        console.error('Errore nell\'aggiornamento membro:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno del server'
        });
    }
});

// ==================== ENDPOINT EVENTI ====================
// Compatibili per integrazione con bot Discord

/**
 * Helper function per inviare notifiche Discord via webhook
 * @param {any} event - L'evento da notificare
 * @param {string} action - 'created', 'updated', 'deleted'
 */
async function notifyDiscordWebhook(event: any, action: string) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        return; // Nessun webhook configurato, ignora silenziosamente
    }

    try {
        const actionMessages: Record<string, string> = {
            'created': '📅 Nuovo evento creato',
            'updated': '✏️ Evento modificato',
            'deleted': '🗑️ Evento eliminato'
        };

        const colors: Record<string, number> = {
            'created': 0x00ff00, // Verde
            'updated': 0x0099ff, // Blu
            'deleted': 0xff0000  // Rosso
        };

        const eventDate = new Date(event.date);
        const embed: any = {
            title: actionMessages[action] || 'Evento aggiornato',
            description: `**${event.title}**`,
            color: colors[action] || 0x0099ff,
            fields: [
                {
                    name: '📆 Data',
                    value: eventDate.toLocaleDateString('it-IT', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    inline: true
                },
                {
                    name: '🏷️ Tipo',
                    value: event.type || 'evento',
                    inline: true
                }
            ],
            timestamp: new Date().toISOString()
        };

        if (event.startTime || event.endTime) {
            embed.fields.push({
                name: '⏰ Orario',
                value: `${event.startTime || ''}${event.startTime && event.endTime ? ' - ' : ''}${event.endTime || ''}`,
                inline: true
            });
        }

        if (event.location) {
            embed.fields.push({
                name: '📍 Location',
                value: event.location,
                inline: false
            });
        }

        if (event.description) {
            embed.fields.push({
                name: '📝 Descrizione',
                value: event.description.substring(0, 1024), // Limite Discord
                inline: false
            });
        }

        await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed]
            })
        });
    } catch (error) {
        console.error('❌ Errore nell\'invio webhook Discord:', error);
        // Non bloccare l'operazione se il webhook fallisce
    }
}

// GET /api/events - Ottieni tutti gli eventi (con filtri opzionali per bot Discord)
app.get('/api/v1/events', checkMongoConnection, async (req: any, res: any) => {
    try {
        const { 
            upcoming,      // Solo eventi futuri
            type,          // Filtra per tipo
            from,          // Data inizio (YYYY-MM-DD)
            to,            // Data fine (YYYY-MM-DD)
            limit          // Limita il numero di risultati
        } = req.query;

        let query: any = {};

        // Filtro per eventi futuri
        if (upcoming === 'true') {
            query.date = { $gte: new Date() };
        }

        // Filtro per tipo
        if (type) {
            query.type = type;
        }

        // Filtro per range di date
        if (from || to) {
            query.date = query.date || {};
            if (from) {
                query.date.$gte = new Date(from as string);
            }
            if (to) {
                query.date.$lte = new Date(to as string);
            }
        }

        let queryBuilder = Event.find(query).sort({ date: 1 });

        // Limita i risultati se richiesto
        if (limit) {
            queryBuilder = queryBuilder.limit(parseInt(limit as string));
        }

        const events = await queryBuilder.lean();
        
        res.json({
            success: true,
            count: events.length,
            events: events
        });
    } catch (error) {
        console.error('❌ Errore nel recupero eventi:', error);
        res.status(500).json({ 
            success: false,
            error: 'Errore nel recupero eventi' 
        });
    }
});

// GET /api/events/:id - Ottieni un singolo evento (utile per bot Discord)
app.get('/api/v1/events/:id', checkMongoConnection, async (req: any, res: any) => {
    try {
        const { id } = req.params;

        // Verifica che l'ID sia valido per MongoDB
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                success: false,
                error: 'ID evento non valido' 
            });
        }

        const event = await Event.findById(id).lean();

        if (!event) {
            return res.status(404).json({ 
                success: false,
                error: 'Evento non trovato' 
            });
        }

        res.json({
            success: true,
            event: event
        });
    } catch (error) {
        console.error('❌ Errore nel recupero evento:', error);
        res.status(500).json({ 
            success: false,
            error: 'Errore nel recupero evento' 
        });
    }
});

// POST /api/events - Crea un nuovo evento (compatibile con bot Discord)
app.post('/api/v1/events', checkMongoConnection, async (req: any, res: any) => {
    try {
        const { title, description, date, startTime, endTime, location, type, createdBy, notifyDiscord } = req.body;

        // Validazione
        if (!title || !date) {
            return res.status(400).json({ 
                success: false,
                error: 'Titolo e data sono obbligatori' 
            });
        }

        // Crea nuovo evento
        // Gestisci la data evitando problemi di fuso orario
        // Se la data è in formato YYYY-MM-DD, crea la data usando i componenti
        let eventDate;
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Formato YYYY-MM-DD: crea data locale a mezzanotte
            const [year, month, day] = date.split('-').map(Number);
            eventDate = new Date(year, month - 1, day);
        } else {
            eventDate = new Date(date);
        }

        const event = new Event({
            title,
            description: description || '',
            date: eventDate,
            startTime: startTime || '',
            endTime: endTime || '',
            location: location || '',
            type: type || 'evento',
            createdBy: createdBy || 'system'
        });

        const savedEvent = await event.save();

        // Notifica Discord se richiesto (default: true)
        if (notifyDiscord !== false) {
            await notifyDiscordWebhook(savedEvent.toObject(), 'created');
        }

        res.status(201).json({
            success: true,
            event: savedEvent
        });
    } catch (error: any) {
        console.error('❌ Errore nella creazione evento:', error);
        // Se è un errore di validazione Mongoose, fornisci dettagli
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map((e: any) => e.message).join(', ');
            return res.status(400).json({ 
                success: false,
                error: `Errore di validazione: ${errors}` 
            });
        }
        res.status(500).json({ 
            success: false,
            error: error.message || 'Errore nella creazione evento' 
        });
    }
});

// PUT /api/events/:id - Modifica un evento esistente (compatibile con bot Discord)
app.put('/api/v1/events/:id', checkMongoConnection, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { title, description, date, startTime, endTime, location, type, notifyDiscord } = req.body;

        console.log(`📝 Tentativo di modifica evento con ID: ${id}`);

        // Validazione
        if (!title || !date) {
            return res.status(400).json({ 
                success: false,
                error: 'Titolo e data sono obbligatori' 
            });
        }

        // Verifica che l'ID sia valido per MongoDB
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            console.error(`❌ ID non valido: ${id}`);
            return res.status(400).json({ 
                success: false,
                error: 'ID evento non valido' 
            });
        }

        // Aggiorna evento
        // Gestisci la data evitando problemi di fuso orario
        let eventDate;
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Formato YYYY-MM-DD: crea data locale a mezzanotte
            const [year, month, day] = date.split('-').map(Number);
            eventDate = new Date(year, month - 1, day);
        } else {
            eventDate = new Date(date);
        }

        const event = await Event.findByIdAndUpdate(
            id,
            {
                title,
                description: description || '',
                date: eventDate,
                startTime: startTime || '',
                endTime: endTime || '',
                location: location || '',
                type: type || 'evento',
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!event) {
            console.error(`❌ Evento con ID ${id} non trovato nel database`);
            return res.status(404).json({ 
                success: false,
                error: 'Evento non trovato' 
            });
        }

        // Notifica Discord se richiesto (default: true)
        if (notifyDiscord !== false) {
            await notifyDiscordWebhook(event.toObject(), 'updated');
        }

        console.log(`✅ Evento ${id} modificato con successo`);
        res.json({
            success: true,
            event: event
        });
    } catch (error: any) {
        console.error('❌ Errore nella modifica evento:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                success: false,
                error: 'ID evento non valido' 
            });
        }
        res.status(500).json({ 
            success: false,
            error: 'Errore nella modifica evento' 
        });
    }
});

// DELETE /api/events/:id - Elimina un evento (compatibile con bot Discord)
app.delete('/api/v1/events/:id', checkMongoConnection, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { notifyDiscord } = req.query; // Per DELETE, usa query params

        // Verifica che l'ID sia valido per MongoDB
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                success: false,
                error: 'ID evento non valido' 
            });
        }

        // Recupera l'evento prima di eliminarlo per la notifica
        const eventToDelete = await Event.findById(id).lean();

        if (!eventToDelete) {
            return res.status(404).json({ 
                success: false,
                error: 'Evento non trovato' 
            });
        }

        // Elimina l'evento
        await Event.findByIdAndDelete(id);

        // Notifica Discord se richiesto (default: true)
        if (notifyDiscord !== 'false') {
            await notifyDiscordWebhook(eventToDelete, 'deleted');
        }

        res.json({ 
            success: true, 
            message: 'Evento eliminato con successo' 
        });
    } catch (error) {
        console.error('❌ Errore nell\'eliminazione evento:', error);
        res.status(500).json({ 
            success: false,
            error: 'Errore nell\'eliminazione evento' 
        });
    }
});

// ==================== API DI SINCRONIZZAZIONE PER BOT DISCORD ====================

// GET /api/sync/members - Sincronizza membri (bot -> web app e viceversa)
app.get('/api/v1/sync/members', checkMongoConnection, authenticateAPI, async (req: any, res: any) => {
    try {
        const { 
            since,      // Timestamp per sincronizzazione incrementale (ISO string o timestamp)
            tag,        // Filtra per tag specifico
            limit       // Limita risultati
        } = req.query;

        let query: any = {};

        // Filtro per sincronizzazione incrementale
        if (since) {
            const sinceDate = new Date(since as string);
            query.updatedAt = { $gte: sinceDate };
        }

        // Filtro per tag
        if (tag) {
            query.tag = tag;
        }

        let queryBuilder = Member.find(query).sort({ updatedAt: -1 });

        if (limit) {
            queryBuilder = queryBuilder.limit(parseInt(limit as string));
        }

        const members = await queryBuilder.lean();

        res.json({
            success: true,
            count: members.length,
            timestamp: new Date().toISOString(),
            members: members.map((m: any) => ({
                key: m.key,
                name: m.name,
                id: m.id,
                tag: m.tag,
                index: m.index,
                date: m.date,
                idoneita: m.idoneita,
                watchdog: m.watchdog,
                promoted: m.promoted,
                affiliazioniOrg: m.affiliazioniOrg,
                orgValidation: m.orgValidation,
                note: m.note,
                createdAt: m.createdAt,
                updatedAt: m.updatedAt
            }))
        });
    } catch (error) {
        console.error('❌ Errore nella sincronizzazione membri:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nella sincronizzazione membri'
        });
    }
});

// POST /api/sync/members - Sincronizza membri dal bot (bulk update)
app.post('/api/v1/sync/members', checkMongoConnection, authenticateAPI, async (req: any, res: any) => {
    try {
        const { members } = req.body;

        if (!Array.isArray(members) || members.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Array di membri richiesto'
            });
        }

        const operations = members.map(member => ({
            updateOne: {
                filter: { key: member.key },
                update: {
                    $set: {
                        ...member,
                        updatedAt: new Date()
                    }
                },
                upsert: true
            }
        }));

        const result = await Member.bulkWrite(operations);

        console.log(`🔄 Sincronizzazione membri completata: ${result.upsertedCount} inseriti, ${result.modifiedCount} aggiornati`);

        res.json({
            success: true,
            message: 'Sincronizzazione completata',
            inserted: result.upsertedCount,
            updated: result.modifiedCount,
            total: members.length
        });
    } catch (error) {
        console.error('❌ Errore nella sincronizzazione membri:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nella sincronizzazione membri'
        });
    }
});

// GET /api/sync/events - Sincronizza eventi (bot -> web app e viceversa)
app.get('/api/v1/sync/events', checkMongoConnection, authenticateAPI, async (req: any, res: any) => {
    try {
        const { 
            since,      // Timestamp per sincronizzazione incrementale
            upcoming,   // Solo eventi futuri
            type,       // Filtra per tipo
            limit       // Limita risultati
        } = req.query;

        let query: any = {};

        if (since) {
            const sinceDate = new Date(since as string);
            query.updatedAt = { $gte: sinceDate };
        }

        if (upcoming === 'true') {
            query.date = { ...query.date, $gte: new Date() };
        }

        if (type) {
            query.type = type;
        }

        let queryBuilder = Event.find(query).sort({ date: 1 });

        if (limit) {
            queryBuilder = queryBuilder.limit(parseInt(limit as string));
        }

        const events = await queryBuilder.lean();

        res.json({
            success: true,
            count: events.length,
            timestamp: new Date().toISOString(),
            events: events
        });
    } catch (error) {
        console.error('❌ Errore nella sincronizzazione eventi:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nella sincronizzazione eventi'
        });
    }
});

// POST /api/sync/events - Sincronizza eventi dal bot (bulk update)
app.post('/api/v1/sync/events', checkMongoConnection, authenticateAPI, async (req: any, res: any) => {
    try {
        const { events } = req.body;

        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Array di eventi richiesto'
            });
        }

        const operations = events.map(event => ({
            updateOne: {
                filter: { _id: event._id || event.id },
                update: {
                    $set: {
                        title: event.title,
                        description: event.description || '',
                        date: new Date(event.date),
                        startTime: event.startTime || '',
                        endTime: event.endTime || '',
                        location: event.location || '',
                        type: event.type || 'evento',
                        updatedAt: new Date()
                    }
                },
                upsert: false // Non creare nuovi eventi, solo aggiorna esistenti
            }
        }));

        const result = await Event.bulkWrite(operations);

        console.log(`🔄 Sincronizzazione eventi completata: ${result.modifiedCount} aggiornati`);

        res.json({
            success: true,
            message: 'Sincronizzazione completata',
            updated: result.modifiedCount,
            total: events.length
        });
    } catch (error) {
        console.error('❌ Errore nella sincronizzazione eventi:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nella sincronizzazione eventi'
        });
    }
});

// POST /api/import/bot-events - Importa eventi dal formato del bot Discord (da CSV/JSON)
app.post('/api/v1/import/bot-events', checkMongoConnection, async (req: any, res: any) => {
    try {
        const { activities } = req.body; // Array di attività dal bot

        if (!Array.isArray(activities) || activities.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Array di attività richiesto'
            });
        }

        const imported: any[] = [];
        const errors: any[] = [];

        for (const activity of activities) {
            try {
                // Converti il formato del bot al formato del sistema
                let scheduledTime = activity.scheduled_start_time_iso || activity.datetime_input;
                if (!scheduledTime) {
                    errors.push({
                        activity: activity.id || activity.title,
                        error: 'Data non trovata'
                    });
                    continue;
                }

                // Se la data è nel formato "DD/MM/YYYY HH:mm", convertila in ISO
                if (typeof scheduledTime === 'string' && scheduledTime.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)) {
                    const [datePart, timePart] = scheduledTime.split(' ');
                    const [day, month, year] = datePart.split('/').map(Number);
                    const [hours, minutes] = timePart.split(':').map(Number);
                    scheduledTime = new Date(Date.UTC(year, month - 1, day, hours, minutes)).toISOString();
                }

                const eventDate = new Date(scheduledTime);
                if (isNaN(eventDate.getTime())) {
                    errors.push({
                        activity: activity.id || activity.title,
                        error: 'Data non valida'
                    });
                    continue;
                }

                const hours = eventDate.getHours().toString().padStart(2, '0');
                const minutes = eventDate.getMinutes().toString().padStart(2, '0');
                const startTime = `${hours}:${minutes}`;

                let eventType = 'evento';
                try {
                    if (activity.config_json) {
                        const config = typeof activity.config_json === 'string' 
                            ? JSON.parse(activity.config_json) 
                            : activity.config_json;
                        if (config.type === 'activity') {
                            eventType = 'attività';
                        }
                    }
                } catch (e) {
                    // Ignora
                }

                // Cerca se esiste già un evento con lo stesso titolo e data
                const existingEvent = await Event.findOne({
                    title: activity.title,
                    date: {
                        $gte: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()),
                        $lt: new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate() + 1)
                    }
                });

                if (existingEvent) {
                    existingEvent.description = activity.description || existingEvent.description;
                    existingEvent.location = activity.location || existingEvent.location;
                    existingEvent.startTime = startTime;
                    existingEvent.type = eventType;
                    await existingEvent.save();
                    imported.push({ id: existingEvent._id, action: 'updated', title: activity.title });
                } else {
                    const newEvent = new Event({
                        title: activity.title,
                        description: activity.description || '',
                        date: eventDate,
                        startTime: startTime,
                        endTime: '',
                        location: activity.location || '',
                        type: eventType,
                        createdBy: activity.creator_id || 'discord-bot'
                    });
                    const savedEvent = await newEvent.save();
                    imported.push({ id: savedEvent._id, action: 'created', title: activity.title });
                }
            } catch (error: any) {
                console.error(`❌ Errore nell'importazione attività ${activity.id || activity.title}:`, error);
                errors.push({
                    activity: activity.id || activity.title,
                    error: error.message
                });
            }
        }

        console.log(`📥 Importazione eventi completata: ${imported.length} importati, ${errors.length} errori`);

        res.json({
            success: true,
            message: `Importazione completata: ${imported.length} eventi importati`,
            imported: imported.length,
            errors: errors.length,
            details: {
                imported,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (error: any) {
        console.error('❌ Errore nell\'importazione eventi:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Errore nell\'importazione eventi'
        });
    }
});

// GET /api/discord/avatar/:userId - Ottiene l'avatar Discord di un utente
app.get('/api/v1/discord/avatar/:userId', checkMongoConnection, authenticateToken, async (req: any, res: any) => {
    try {
        const { userId } = req.params;
        const discordBotToken = process.env.DISCORD_BOT_TOKEN;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID richiesto'
            });
        }

        if (!discordBotToken) {
            const defaultAvatarIndex = parseInt(userId) % 6;
            return res.json({
                success: true,
                avatarUrl: `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`,
                isDefault: true
            });
        }

        const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
            headers: {
                'Authorization': `Bot ${discordBotToken}`,
            }
        });

        if (!response.ok) {
            const defaultAvatarIndex = parseInt(userId) % 6;
            return res.json({
                success: true,
                avatarUrl: `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`,
                isDefault: true
            });
        }

        const userData: any = await response.json();
        
        if (userData.avatar) {
            const avatarHash = userData.avatar;
            const isAnimated = avatarHash.startsWith('a_');
            const extension = isAnimated ? 'gif' : 'png';
            const avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=128`;
            
            return res.json({
                success: true,
                avatarUrl: avatarUrl,
                isDefault: false
            });
        }

        const defaultAvatarIndex = (parseInt(userId) >> 22) % 6;
        return res.json({
            success: true,
            avatarUrl: `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`,
            isDefault: true
        });
    } catch (error) {
        console.error('❌ Errore nel recupero avatar Discord:', error);
        const defaultAvatarIndex = parseInt(req.params.userId || '0') % 6;
        return res.json({
            success: true,
            avatarUrl: `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`,
            isDefault: true
        });
    }
});

// GET /api/sync/test - Test connessione e autenticazione
app.get('/api/v1/sync/test', authenticateAPI, (req: any, res: any) => {
    res.json({
        success: true,
        message: 'Autenticazione valida',
        authType: req.authType,
        isBot: req.bot || false,
        timestamp: new Date().toISOString()
    });
});

// GET /api/sync/status - Stato della sincronizzazione
app.get('/api/v1/sync/status', checkMongoConnection, authenticateAPI, async (req: any, res: any) => {
    try {
        const [membersCount, eventsCount, lastMemberUpdate, lastEventUpdate] = await Promise.all([
            Member.countDocuments(),
            Event.countDocuments(),
            Member.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
            Event.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean()
        ]);

        res.json({
            success: true,
            status: {
                members: {
                    total: membersCount,
                    lastUpdate: lastMemberUpdate?.updatedAt || null
                },
                events: {
                    total: eventsCount,
                    lastUpdate: lastEventUpdate?.updatedAt || null
                },
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Errore nel recupero stato sincronizzazione:', error);
        res.status(500).json({
            success: false,
            error: 'Errore nel recupero stato'
        });
    }
});

// ==================== DISCORD BOT ADMIN API ====================
const activeJobs = new Map();
const DiscordSyncRun = require('./models/DiscordSyncRun');
const { DiscordMemberSyncService } = require('./lib/discordMemberSync');
const { Client: DiscordClient, GatewayIntentBits: DiscordGatewayIntentBits } = require('discord.js');

// Middleware per verificare che l'utente sia un admin (rsiVerified === true e organizationRank >= 4)
const requireAdmin = async (req: any, res: any, next: any) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                error: 'Utente non autenticato.'
            });
        }

        const User = require('./models/User');
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Utente non trovato.'
            });
        }

        if (!user.rsiVerified) {
            return res.status(403).json({
                success: false,
                error: 'Accesso negato. L\'utente non è verificato con RSI.'
            });
        }

        if (user.organizationRank === null || user.organizationRank === undefined || user.organizationRank < 4) {
            return res.status(403).json({
                success: false,
                error: `Accesso negato. Rango organizzativo insufficiente (richiesto >= 4).`
            });
        }

        next();
    } catch (error: any) {
        console.error('Errore nel controllo privilegi admin:', error);
        return res.status(500).json({
            success: false,
            error: 'Errore interno nel controllo permessi.'
        });
    }
};

// Status endpoint
app.get('/api/v1/admin/discord/status', authenticateToken, requireAdmin, async (req: any, res: any) => {
    const token = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!token || !guildId) {
        return res.json({
            success: true,
            configured: false,
            status: 'unconfigured',
            guildName: null,
            guildId: null,
            version: 'v0.1.0-beta'
        });
    }

    if (discordBot.isReady && discordBot.guild) {
        return res.json({
            success: true,
            configured: true,
            status: 'online',
            guildName: discordBot.guild.name,
            guildId: discordBot.guild.id,
            version: 'v0.1.0-beta',
            latency: discordBot.client ? discordBot.client.ws.ping : null,
            wsPing: discordBot.client ? discordBot.client.ws.ping : null
        });
    }

    if (discordBot.client && !discordBot.isReady) {
        return res.json({
            success: true,
            configured: true,
            status: 'loading',
            guildName: null,
            guildId: guildId,
            version: 'v0.1.0-beta'
        });
    }

    return res.json({
        success: true,
        configured: true,
        status: 'offline',
        guildName: null,
        guildId: guildId,
        version: 'v0.1.0-beta'
    });
});

// Start bot endpoint
app.post('/api/v1/admin/discord/start', authenticateToken, requireAdmin, async (req: any, res: any) => {
    try {
        const token = process.env.DISCORD_BOT_TOKEN;
        const guildId = process.env.DISCORD_GUILD_ID;

        if (!token || !guildId) {
            return res.status(400).json({
                success: false,
                error: 'Configurazione mancante. Compila DISCORD_BOT_TOKEN e DISCORD_GUILD_ID nel file .env.'
            });
        }

        if (discordBot.isReady) {
            return res.json({
                success: true,
                message: 'Il bot Discord è già attivo e online.'
            });
        }

        console.log('🤖 Richiesta di avvio manuale bot Discord ricevuta...');
        
        // Promise che avvia il bot
        const initPromise = discordBot.initialize();
        
        // Promise di timeout di 90 secondi gestita dal pannello admin (server)
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve('timeout');
            }, 90000); // 90 secondi
        });

        const result = await Promise.race([initPromise, timeoutPromise]);

        if (result === 'timeout') {
            // Il bot non ha risposto in tempo, forziamo la disconnessione
            if (discordBot.client) {
                discordBot.client.destroy();
                discordBot.client = null;
            }
            discordBot.isReady = false;
            return res.status(500).json({
                success: false,
                error: 'Timeout: Il bot non ha dato risposta entro 90 secondi. Ritenuto offline.'
            });
        }

        const success = result;
        if (success) {
            return res.json({
                success: true,
                message: 'Bot Discord avviato con successo!'
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Impossibile avviare il bot Discord. Verifica le credenziali ed i log.'
            });
        }
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno nell\'avvio del bot.'
        });
    }
});

// Stop bot endpoint
app.post('/api/v1/admin/discord/stop', authenticateToken, requireAdmin, async (req: any, res: any) => {
    try {
        if (!discordBot.client && !discordBot.isReady) {
            return res.json({
                success: true,
                message: 'Il bot Discord è già offline.'
            });
        }

        console.log('🤖 Richiesta di arresto bot Discord ricevuta...');
        await discordBot.disconnect();
        return res.json({
            success: true,
            message: 'Bot Discord arrestato con successo.'
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message || 'Errore interno nell\'arresto del bot.'
        });
    }
});

// Trigger sync members job
app.post('/api/v1/admin/discord/sync-members', authenticateToken, checkMongoConnection, requireAdmin, async (req: any, res: any) => {
    const { dryRun } = req.body;
    const isDryRun = dryRun === undefined ? true : Boolean(dryRun);
    
    // Check if there is already an active job running to avoid concurrency
    for (const job of activeJobs.values()) {
        if (job.status === 'running') {
            return res.status(409).json({
                success: false,
                error: 'Un job di sincronizzazione è già in esecuzione.'
            });
        }
    }

    const jobId = `job_sync_${Date.now()}`;
    const startedAt = new Date();
    
    activeJobs.set(jobId, {
        jobId,
        mode: isDryRun ? 'dry-run' : 'live',
        status: 'running',
        progress: 10,
        startedAt,
    });

    // Run the sync process in the background
    const username = req.user?.username || 'admin';
    
    // Fire and forget, but handle internally
    (async () => {
        try {
            const service = new DiscordMemberSyncService({
                dryRun: isDryRun,
                token: process.env.DISCORD_BOT_TOKEN,
                guildId: process.env.DISCORD_GUILD_ID
            });

            activeJobs.set(jobId, {
                ...activeJobs.get(jobId),
                progress: 40
            });

            const report = await service.syncMembers();

            activeJobs.set(jobId, {
                ...activeJobs.get(jobId),
                progress: 100,
                status: report.success ? 'completed' : 'failed',
                finishedAt: new Date(),
                result: report
            });

            await DiscordSyncRun.create({
                jobId,
                triggeredBy: username,
                mode: isDryRun ? 'dry-run' : 'live',
                status: report.success ? 'completed' : 'failed',
                result: {
                    readFromDiscord: report.readFromDiscord || 0,
                    skippedBots: report.skippedBots || 0,
                    added: report.added || 0,
                    updated: report.updated || 0,
                    unchanged: report.unchanged || 0,
                    errors: report.errors || []
                },
                startedAt,
                finishedAt: new Date()
            });

        } catch (error: any) {
            activeJobs.set(jobId, {
                ...activeJobs.get(jobId),
                progress: 100,
                status: 'failed',
                finishedAt: new Date(),
                error: error?.message || String(error)
            });

            try {
                await DiscordSyncRun.create({
                    jobId,
                    triggeredBy: username,
                    mode: isDryRun ? 'dry-run' : 'live',
                    status: 'failed',
                    result: {
                        readFromDiscord: 0,
                        skippedBots: 0,
                        added: 0,
                        updated: 0,
                        unchanged: 0,
                        errors: [error?.message || String(error)]
                    },
                    startedAt,
                    finishedAt: new Date()
                });
            } catch (dbErr) {
                console.error('Errore nel salvataggio del run fallito:', dbErr);
            }
        }
    })();

    return res.json({
        success: true,
        jobId,
        message: 'Job di sincronizzazione accodato con successo.'
    });
});

// Job status polling
app.get('/api/v1/admin/jobs/:jobId', authenticateToken, requireAdmin, (req: any, res: any) => {
    const { jobId } = req.params;
    const job = activeJobs.get(jobId);

    if (!job) {
        return res.status(404).json({
            success: false,
            error: 'Job non trovato o scaduto.'
        });
    }

    return res.json({
        success: true,
        job
    });
});

// Sync execution history
app.get('/api/v1/admin/discord/sync-history', authenticateToken, checkMongoConnection, requireAdmin, async (req: any, res: any) => {
    try {
        const history = await DiscordSyncRun.find({})
            .sort({ startedAt: -1 })
            .limit(20)
            .lean();

        return res.json({
            success: true,
            history
        });
    } catch (error: any) {
        console.error('Errore nel recupero dello storico dei sync:', error);
        return res.status(500).json({
            success: false,
            error: error?.message || 'Errore interno del server'
        });
    }
});

// Ottieni tutti gli utenti registrati e i loro rank (Solo Admin)
app.get('/api/v1/admin/users', authenticateToken, checkMongoConnection, requireAdmin, async (req: any, res: any) => {
    try {
        const User = require('./models/User');
        const users = await User.find({}, { password: 0 })
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            users
        });
    } catch (error: any) {
        console.error('Errore nel recupero degli utenti:', error);
        return res.status(500).json({
            success: false,
            error: error?.message || 'Errore interno del server'
        });
    }
});

// Inizializza e avvia il server
(async () => {
    await setupMongoDB();

    app.listen(5000, async () => {
        console.log(`🚀 Server avviato su porta 5000`);
        console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Swagger UI: http://localhost:5000/api/v1/docs`);

        // L'avvio del bot Discord è stato staccato dall'avvio del backend.
        // Può essere avviato manualmente tramite il pannello Admin.
    });
})();