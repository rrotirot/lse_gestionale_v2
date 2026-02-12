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
const upload = multer({
    dest: 'uploads/',
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
        const fileContent = fs.readFileSync(req.file.path, 'utf-8');
        const members = parseMemberDataFromFile(fileContent, estensione);

        if (members.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Nessun membro valido trovato nel file'
            });
        }

        // Verifica membri eliminati
        const errors = [];
        const membersToProcess = [];

        for (const member of members) {
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

        // Inserisci i membri
        const insertedMembers = [];
        for (const member of membersToProcess) {
            try {
                const newMember = new Member(member);
                await newMember.save();
                insertedMembers.push(newMember);
            } catch (error) {
                errors.push({
                    member: member.name || member.index || `key=${member.key}`,
                    error: error.message
                });
            }
        }

        // Rimuovi file temporaneo
        require('fs').unlinkSync(req.file.path);

        return res.json({
            success: true,
            message: `Importati ${insertedMembers.length} membri`,
            insertedCount: insertedMembers.length,
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
            },
            timeout: 10000 // 10 secondi timeout
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
                },
                timeout: 10000 // 10 secondi timeout
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
app.put('/api/v1/members/reset-validation/all', checkMongoConnection, async (req, res) => {
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
app.put('/api/v1/members/:key/reset-validation', checkMongoConnection, async (req, res) => {
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
app.post('/api/v1/members/:key/validate', checkMongoConnection, async (req, res) => {
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

        if (!orgsResponse.ok) {
            console.error(`❌ Errore nel recupero affiliazioni per ${member.id}: ${orgsResponse.status}`);
            return res.status(orgsResponse.status).json({
                success: false,
                error: `Errore nel recupero dati RSI: ${orgsResponse.statusText}`
            });
        }

        const orgsData = await orgsResponse.json();

        // Aggiorna il membro con i dati di validazione
        const updateData = {
            affiliazioniOrg: orgsData.orgs_string || '',
            orgValidation: orgsData.validation || null,
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



// Inizializza e avvia il server
(async () => {
    await setupMongoDB();

    app.listen(5000, async () => {
        console.log(`🚀 Server avviato su porta 5000`);
        console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔗 Swagger UI: http://localhost:5000/api/v1/docs`);
    });
})();
