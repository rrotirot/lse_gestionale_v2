/**
 * Test unitari per i moduli della libreria (cache, logger, versioning)
 */
const cache = require('../lib/cache');
const { logger } = require('../lib/logger');
const { versioningMiddleware, legacyRedirectMiddleware, responseVersioningMiddleware, versionHandler, setupApiVersioning } = require('../lib/versioning');

// Mock Redis
const mockRedisClient = {
    connect: jest.fn(),
    on: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    flushDb: jest.fn(),
    quit: jest.fn()
};

jest.mock('redis', () => ({
    createClient: jest.fn(() => mockRedisClient)
}));

// Mock winston
jest.mock('winston', () => ({
    format: {
        combine: jest.fn(() => 'combined-format'),
        timestamp: jest.fn(() => 'timestamp-format'),
        errors: jest.fn(() => 'errors-format'),
        printf: jest.fn(() => 'printf-format'),
        colorize: jest.fn(() => 'colorize-format')
    },
    transports: {
        Console: jest.fn(),
        File: jest.fn()
    },
    createLogger: jest.fn(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }))
}));

describe('Lib - Cache', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisClient.connect.mockResolvedValue();
        mockRedisClient.on.mockImplementation((event, callback) => {
            if (event === 'connect') callback();
        });
    });

    describe('initRedis', () => {
        it('dovrebbe inizializzare Redis con successo', async () => {
            const { initRedis } = require('../lib/cache');
            const result = await initRedis();
            expect(result).toBe(true);
            expect(mockRedisClient.connect).toHaveBeenCalled();
        });

        it('dovrebbe gestire errore di connessione Redis', async () => {
            mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));
            const { initRedis } = require('../lib/cache');
            const result = await initRedis();
            expect(result).toBe(false);
        });
    });
});

describe('Lib - Swagger', () => {
    it('dovrebbe esportare specifiche Swagger valide', () => {
        const swagger = require('../lib/swagger');
        expect(swagger).toBeDefined();
        expect(typeof swagger).toBe('object');
        expect(swagger.info).toBeDefined();
        expect(swagger.paths).toBeDefined();
    });
});

describe('Lib - Config', () => {
    describe('validateRequiredEnv', () => {
        it('dovrebbe passare se tutte le variabili esistono', () => {
            const { validateRequiredEnv } = require('../lib/config');
            process.env.TEST_VAR = 'value';

            expect(() => validateRequiredEnv(['TEST_VAR'])).not.toThrow();
        });

        it('dovrebbe chiamare process.exit in produzione se variabile mancante', () => {
            const originalNodeEnv = process.env.NODE_ENV;
            const originalExit = process.exit;
            process.env.NODE_ENV = 'production';
            process.exit = jest.fn();

            const { validateRequiredEnv } = require('../lib/config');

            validateRequiredEnv(['MISSING_VAR']);
            expect(process.exit).toHaveBeenCalledWith(1);

            process.env.NODE_ENV = originalNodeEnv;
            process.exit = originalExit;
        });
    });

    describe('setupFetch', () => {
        it('dovrebbe restituire fetch nativo se disponibile', () => {
            const { setupFetch } = require('../lib/config');
            const fetch = setupFetch();
            expect(typeof fetch).toBe('function');
        });
    });
});

describe('Lib - Logger', () => {
    it('dovrebbe esportare logger configurato', () => {
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.debug).toBe('function');
    });
});

describe('Lib - Versioning', () => {
    let req, res, next;

    beforeEach(() => {
        req = { path: '', headers: {} };
        res = { locals: {} };
        next = jest.fn();
    });

    describe('versioningMiddleware', () => {
        it('dovrebbe impostare apiVersion per percorsi versionati', () => {
            req.path = '/api/v2/members';
            versioningMiddleware(req, res, next);
            expect(req.apiVersion).toBe('v2');
            expect(next).toHaveBeenCalled();
        });

        it('dovrebbe impostare apiVersion default per percorsi non versionati', () => {
            req.path = '/api/members';
            versioningMiddleware(req, res, next);
            expect(req.apiVersion).toBe('v1');
            expect(next).toHaveBeenCalled();
        });
    });

    describe('versionHandler', () => {
        it('dovrebbe usare handler specifico per versione', () => {
            const handlers = {
                v2: jest.fn(),
                default: jest.fn()
            };
            const handler = versionHandler(handlers);

            const req = { apiVersion: 'v2' };
            const res = {};
            const next = jest.fn();

            handler(req, res, next);

            expect(handlers.v2).toHaveBeenCalledWith(req, res, next);
        });

        it('dovrebbe restituire errore 501 se nessuna versione supportata', () => {
            const handlers = {};
            const handler = versionHandler(handlers);

            const req = { apiVersion: 'v3' };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            handler(req, res, next);

            expect(res.status).toHaveBeenCalledWith(501);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'API version v3 not supported for this endpoint',
                availableVersions: []
            });
        });
    });
});