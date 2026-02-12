const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    rsiHandle: {
        type: String,
        trim: true,
        default: null
    },
    rsiVerified: {
        type: Boolean,
        default: false
    },
    rsiAvatar: {
        type: String,
        trim: true,
        default: null
    },
    organizationRank: {
        type: Number,
        default: null,
        min: 0,
        max: 5
    },
    // Condizioni di verifica RSI
    verificationCodeFound: {
        type: Boolean,
        default: false
    },
    verificationRankVerified: {
        type: Boolean,
        default: false
    },
    verificationMainOrgVerified: {
        type: Boolean,
        default: false
    },
    mainOrgName: {
        type: String,
        trim: true,
        default: null
    }
});

// Hash della password prima di salvare
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Metodo per confrontare le password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Indici per User
userSchema.index({ username: 1 }, { unique: true }); // Username univoco
userSchema.index({ email: 1 }); // Ricerca per email
userSchema.index({ rsiVerified: 1 }); // Filtro utenti verificati
userSchema.index({ createdAt: -1 }); // Ordinamento per data creazione

// Aggiorna updatedAt prima di salvare
userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('User', userSchema);

