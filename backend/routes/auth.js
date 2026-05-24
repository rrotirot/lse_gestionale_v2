/**
 * Endpoint di autenticazione
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { logger } = require('../lib/logger');

const router = express.Router();

// Rate limiting per registrazione
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 5, // limita a 5 registrazioni per IP per finestra
    message: 'Troppe richieste di registrazione da questo IP, riprova tra 15 minuti.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiting per login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 10, // limita a 10 login per IP per finestra
    message: 'Troppe richieste di login da questo IP, riprova tra 15 minuti.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware di autenticazione
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        logger.warn('Missing token for authentication', { path: req.path });
        return res.status(401).json({
            success: false,
            error: 'Autenticazione richiesta. Fornisci un token JWT valido.',
            hint: 'Usa Header: Authorization: Bearer <token>'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            logger.error('Token verification error', {
                error: err.message,
                errorCode: err.code || 'UNKNOWN',
                tokenLength: token.length,
                secretLength: JWT_SECRET.length,
                path: req.path
            });
            return res.status(403).json({
                success: false,
                error: 'Token non valido o scaduto.'
            });
        }

        req.user = user;
        logger.info('Token verified', { userId: user.userId, username: user.username });
        next();
    });
};

// Endpoint per registrazione
router.post('/register',
    registerLimiter,
    [
        body('username')
            .isLength({ min: 3, max: 30 })
            .withMessage('Username deve essere tra 3 e 30 caratteri')
            .matches(/^[a-zA-Z0-9_]+$/)
            .withMessage('Username può contenere solo lettere, numeri e underscore'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password deve essere di almeno 8 caratteri')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password deve contenere almeno una lettera minuscola, una maiuscola e un numero'),
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Email non valida'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Dati di input non validi',
                    details: errors.array()
                });
            }

            const { username, password, email } = req.body;

            // Verifica se utente esiste già
            const existingUser = await User.findOne({
                $or: [{ username: username }, { email: email }]
            });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: 'Username o email già in uso'
                });
            }

            // Crea nuovo utente
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({
                username,
                password: hashedPassword,
                email,
            });

            await user.save();

            logger.info('New user registered', { username: user.username });

            res.status(201).json({
                success: true,
                message: 'Utente registrato con successo',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            });
        } catch (error) {
            logger.error('Registration error', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// Endpoint per login
router.post('/login',
    loginLimiter,
    [
        body('username')
            .notEmpty()
            .withMessage('Username richiesto')
            .isLength({ max: 30 })
            .withMessage('Username troppo lungo'),
        body('password')
            .notEmpty()
            .withMessage('Password richiesta'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Dati di input non validi',
                    details: errors.array()
                });
            }

            const { username, password } = req.body;

            // Trova utente
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenziali non valide'
                });
            }

            // Verifica password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'Credenziali non valide'
                });
            }

            // Genera token JWT
            const token = jwt.sign(
                {
                    userId: user._id,
                    username: user.username,
                    email: user.email,
                    rsiVerified: user.rsiVerified
                },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            logger.info('User logged in', { username: user.username });

            res.json({
                success: true,
                message: 'Login effettuato con successo',
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    rsiVerified: user.rsiVerified
                }
            });
        } catch (error) {
            logger.error('Login error', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

// Endpoint per verifica token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// Endpoint per logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
    const username = req.user?.username;
    logger.info('User logged out', { username });
    res.json({
        success: true,
        message: 'Logout effettuato con successo'
    });
});

// Endpoint per cambio password
router.put('/change-password', authenticateToken,
    [
        body('currentPassword').notEmpty().withMessage('Password attuale richiesta'),
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('Nuova password deve essere di almeno 8 caratteri')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Nuova password deve contenere almeno una lettera minuscola, una maiuscola e un numero'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Dati di input non validi',
                    details: errors.array()
                });
            }

            const { currentPassword, newPassword } = req.body;
            const userId = req.user.userId;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Utente non trovato'
                });
            }

            // Verifica password attuale (solo se l'utente ha una password RSI)
            if (user.rsiVerified && user.password) {
                const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
                if (!isValidCurrentPassword) {
                    return res.status(400).json({
                        success: false,
                        error: 'Password attuale non corretta'
                    });
                }
            }

            // Hash nuova password
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedNewPassword;
            await user.save();

            logger.info('Password changed', {
                userId,
                username: req.user.username,
                rsiVerified: user.rsiVerified
            });

            res.json({
                success: true,
                message: 'Password cambiata con successo'
            });
        } catch (error) {
            logger.error('Password change error', { error: error.message });
            res.status(500).json({
                success: false,
                error: 'Errore interno del server'
            });
        }
    }
);

module.exports = router;