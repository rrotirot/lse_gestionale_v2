/**
 * API Versioning middleware and utilities
 * Supports multiple API versions and graceful backward compatibility
 */

const { logger } = require('./logger');

/**
 * Middleware che aggiunge info versioning al request
 */
const versioningMiddleware = (req, res, next) => {
    // Estrai versione dal percorso (/api/v1/, /api/v2/, etc.)
    const versionMatch = req.path.match(/^\/api\/(v\d+)\//);
    req.apiVersion = versionMatch ? versionMatch[1] : 'v1'; // Default a v1

    // Log versioning info
    logger.debug(`API Request - Version: ${req.apiVersion}, Path: ${req.path}`);

    next();
};

/**
 * Middleware che redirige vecchi endpoint a nuovi endpoint versioning
 * Es: GET /api/health → GET /api/v1/health (con deprecation warning)
 */
const legacyRedirectMiddleware = (req, res, next) => {
    // Se il path è /api/* ma non contiene /v1/, /v2/, etc., redirige a /api/v1/*
    if (req.path.startsWith('/api/') && !req.path.match(/^\/api\/v\d+\//)) {
        const newPath = req.path.replace(/^\/api\//, '/api/v1/');
        logger.warn(`⚠️ Deprecated endpoint: ${req.path} → redirecting to ${newPath}`);
        
        // Aggiungi header di deprecation
        res.set('Deprecation', 'true');
        res.set('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString()); // 90 giorni
        res.set('Link', `<${newPath}>; rel="successor-version"`);

        // Redirige (307 per mantenere il metodo HTTP originale)
        return res.redirect(307, newPath);
    }

    next();
};

/**
 * Middleware che gestisce versioning per endpoint specifici
 * Permette di avoir logica diversa per versioni diverse
 */
const versionHandler = (handlers) => {
    return (req, res, next) => {
        const version = req.apiVersion || 'v1';
        const handler = handlers[version] || handlers.default;

        if (!handler) {
            return res.status(501).json({
                success: false,
                error: `API version ${version} not supported for this endpoint`,
                availableVersions: Object.keys(handlers).filter(k => k !== 'default')
            });
        }

        return handler(req, res, next);
    };
};

/**
 * Middleware che aggiunge info versioning alla risposta
 */
const responseVersioningMiddleware = (req, res, next) => {
    // Override res.json per aggiungere versioning info
    const originalJson = res.json.bind(res);

    res.json = function (data) {
        // Se la risposta è un oggetto, aggiungi info versioning
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            data._apiVersion = req.apiVersion || 'v1';
        }

        return originalJson(data);
    };

    next();
};

/**
 * Setup routing per versioni API
 * Registra tutte le rotte sotto il prefisso versioning
 */
const setupApiVersioning = (app) => {
    // Applica middleware di versioning globale
    app.use('/api/', versioningMiddleware);
    app.use('/api/', responseVersioningMiddleware);

    // Applica redirect legacy come ultima risorsa (dopo tutti gli endpoint specifici di versione)
    app.use(legacyRedirectMiddleware);

    logger.info('✅ API Versioning configurato');
};

module.exports = {
    versioningMiddleware,
    legacyRedirectMiddleware,
    responseVersioningMiddleware,
    versionHandler,
    setupApiVersioning
};

export {};
