/**
 * Configurazione e utilità del server
 */
const { logger } = require('./logger');
import mongoose from "mongoose";

/**
 * Valida variabili d'ambiente critiche
 */
const validateRequiredEnv = (vars: string[] = []): void => {
    const missing = vars.filter((v: string) => !process.env[v] || process.env[v]?.trim() === '');
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
const setupFetch = (): typeof fetch => {
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
const setupMongoDB = (): typeof mongoose => {
    const MONGODB_URI: string = process.env.MONGODB_URI || 'mongodb://localhost:27017/lse-members';

    // Opzioni di connessione MongoDB (compatibili con database remoti come MongoDB Atlas)
    const mongooseOptions: mongoose.ConnectOptions = {
        // Rimossi deprecated options per Mongoose 8+
        serverSelectionTimeoutMS: 5000, // Timeout dopo 5s invece di 30s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        maxPoolSize: 10, // Mantieni fino a 10 connessioni nel pool
        heartbeatFrequencyMS: 10000,
    };

    // Gestione connessione MongoDB con retry logic migliorata
    const connectWithRetry = async (): Promise<void> => {
        try {
            await mongoose.connect(MONGODB_URI, mongooseOptions);

            const dbName: string | undefined = mongoose.connection.db?.databaseName;
            const host: string = mongoose.connection.host;

            logger.info('Connected to MongoDB', {
                database: dbName,
                host: host,
                type: host.includes('ac-zu6u7fm') ? 'MongoDB Atlas (Cloud)' : (host.includes('localhost') || host.includes('127.0.0.1') ? 'Local MongoDB' : 'Remote MongoDB')
            });

        } catch (error) {
            const err = error as Error;
            logger.error('MongoDB connection error', {
                error: err.message,
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

    // Exponential backoff per retry MongoDB
    let reconnectRetryCount = 0;
    const MAX_RETRY_DELAY = 30000; // 30 secondi max
    const BASE_DELAY = 5000; // 5 secondi inizio

    // Gestione eventi connessione
    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
        reconnectRetryCount = 0;
        logger.info('MongoDB reconnected successfully');
    });

    mongoose.connection.on('error', (error: Error) => {
        logger.error('MongoDB error', { error: error.message });
    });

    // Retry automatico con exponential backoff se disconnesso
    mongoose.connection.on('disconnected', () => {
        const delay = Math.min(MAX_RETRY_DELAY, BASE_DELAY * Math.pow(1.5, reconnectRetryCount));
        logger.warn(`MongoDB disconnected. Retry attempt #${reconnectRetryCount + 1} in ${delay}ms`, {
            nextRetryIn: `${(delay/1000).toFixed(1)}s`
        });
        setTimeout(connectWithRetry, delay);
        reconnectRetryCount++;
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

export {};