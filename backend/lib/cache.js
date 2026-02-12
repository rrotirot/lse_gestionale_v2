/**
 * Cache utility using Redis
 * Provides simple get/set/del operations with graceful fallback if Redis is unavailable
 */

const redis = require('redis');
const { logger } = require('./logger');

let redisClient = null;
let isRedisConnected = false;

const initRedis = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        redisClient = redis.createClient({ url: redisUrl });

        redisClient.on('error', (err) => {
            logger.warn('❌ Redis error:', err.message);
            isRedisConnected = false;
        });

        redisClient.on('connect', () => {
            logger.info('✅ Redis connesso');
            isRedisConnected = true;
        });

        await redisClient.connect();
    } catch (err) {
        logger.warn('⚠️ Redis non disponibile, cache disabilitato:', err.message);
        isRedisConnected = false;
    }
};

const get = async (key) => {
    if (!isRedisConnected || !redisClient) return null;
    try {
        const value = await redisClient.get(key);
        if (value) {
            logger.debug(`Cache HIT: ${key}`);
            return JSON.parse(value);
        }
        return null;
    } catch (err) {
        logger.warn(`Cache GET error (${key}):`, err.message);
        return null;
    }
};

const set = async (key, value, expiresIn = 3600) => {
    if (!isRedisConnected || !redisClient) return false;
    try {
        await redisClient.setEx(key, expiresIn, JSON.stringify(value));
        logger.debug(`Cache SET: ${key} (TTL: ${expiresIn}s)`);
        return true;
    } catch (err) {
        logger.warn(`Cache SET error (${key}):`, err.message);
        return false;
    }
};

const del = async (key) => {
    if (!isRedisConnected || !redisClient) return false;
    try {
        await redisClient.del(key);
        logger.debug(`Cache DEL: ${key}`);
        return true;
    } catch (err) {
        logger.warn(`Cache DEL error (${key}):`, err.message);
        return false;
    }
};

const clear = async () => {
    if (!isRedisConnected || !redisClient) return false;
    try {
        await redisClient.flushDb();
        logger.info('✅ Redis cache cleared');
        return true;
    } catch (err) {
        logger.warn('Cache CLEAR error:', err.message);
        return false;
    }
};

const close = async () => {
    if (redisClient && isRedisConnected) {
        try {
            await redisClient.quit();
            isRedisConnected = false;
            logger.info('Redis disconnesso');
        } catch (err) {
            logger.warn('Error closing Redis:', err.message);
        }
    }
};

module.exports = {
    initRedis,
    get,
    set,
    del,
    clear,
    close,
    isConnected: () => isRedisConnected
};
