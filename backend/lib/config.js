/**
 * Configurazione e utilità del server
 */
const { logger } = require('./logger');
const mongoose = require('mongoose');

/**
 * Valida variabili d'ambiente critiche
 */
const validateRequiredEnv = (vars = []) => {
    const missing = vars.filter((v) => !process.env[v] || process.env[v].trim() === '');
    if (missing.length === 0) return;

    const message = `Missing environment variables: ${missing.join(', ')}`;
    if (process.env.NODE_ENV === 'production') {
        logger.error('CRITICAL ERROR: ' + message);
        process.exit(1);
    } else {
        logger.warn('Missing variables (development): ' + message);
    }
};

/**
 * Configurazione fetch nativo Node.js
 */
const setupFetch = () => {
    const fetch = globalThis.fetch;
    if (!fetch) {
        logger.error('Native fetch not available. Please upgrade to Node.js 18+');
        process.exit(1);
    }
    return fetch;
};

/**
 * Configurazione MongoDB con gestione errori migliorata
 */
const setupMongoDB = () => {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lse-members';

    // Opzioni di connessione MongoDB (compatibili con database remoti come MongoDB Atlas)
    const mongooseOptions = {
        // Rimossi deprecated options per Mongoose 8+
        serverSelectionTimeoutMS: 5000, // Timeout dopo 5s invece di 30s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        maxPoolSize: 10, // Mantieni fino a 10 connessioni nel pool
        heartbeatFrequencyMS: 10000,
    };

    // Gestione connessione MongoDB con retry logic migliorata
    const connectWithRetry = async () => {
        try {
            await mongoose.connect(MONGODB_URI, mongooseOptions);

            const dbName = mongoose.connection.db.databaseName;
            const host = mongoose.connection.host;

            logger.info('Connected to MongoDB', {
                database: dbName,
                host: host,
                type: host.includes('ac-zu6u7fm') ? 'MongoDB Atlas (Cloud)' : (host.includes('localhost') || host.includes('127.0.0.1') ? 'Local MongoDB' : 'Remote MongoDB')
            });

        } catch (error) {
            logger.error('MongoDB connection error', {
                error: error.message,
                possibleCauses: [
                    'MongoDB server not reachable',
                    'Incorrect connection string',
                    'Network/firewall issues',
                    'For MongoDB Atlas: check IP whitelist and credentials'
                ]
            });

            if (process.env.NODE_ENV === 'production') {
                logger.error('Failing in production due to MongoDB connection error');
                process.exit(1);
            } else {
                logger.warn('Server will continue without database. Make sure MongoDB is running.');
            }
        }
    };

    // Gestione eventi connessione
    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
    });

    mongoose.connection.on('error', (error) => {
        logger.error('MongoDB error', { error: error.message });
    });

    // Retry automatico ogni 5 secondi se disconnesso
    mongoose.connection.on('disconnected', () => {
        logger.info('Attempting MongoDB reconnection...');
        setTimeout(connectWithRetry, 5000);
    });

    // Connessione iniziale
    connectWithRetry();

    return mongoose;
};

module.exports = {
    validateRequiredEnv,
    setupFetch,
    setupMongoDB,
    logger
};