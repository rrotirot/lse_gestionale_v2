const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
    key: {
        type: Number,
        required: true
    },
    index: {
        type: String,
        default: ''
    },
    tag: {
        type: String,
        default: 'LSE-P'
    },
    name: {
        type: String,
        required: true
    },
    id: {
        type: String,
        default: ''
    },
    date: {
        type: String,
        default: ''
    },
    idoneita: {
        type: Boolean,
        default: false
    },
    watchdog: {
        type: Boolean,
        default: false,
        index: true
    },
    promoted: {
        type: Boolean,
        default: false,
        index: true
    },
    affiliazioniOrg: {
        type: String,
        default: ''
    },
    orgValidation: {
        type: {
            isValid: Boolean,
            hasOnlyOneOrg: Boolean,
            hasMainName: Boolean,
            mainOrgName: String,
            mainOrgImageUrl: String,
            issues: [String]
        },
        default: null
    },
    note: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indici per performance ottimale
memberSchema.index({ key: 1 }); // Ricerca per chiave primaria
memberSchema.index({ name: 1 }); // Ricerca per nome
memberSchema.index({ id: 1 }); // Ricerca per Discord ID
memberSchema.index({ tag: 1 }); // Filtro per tag
memberSchema.index({ idoneita: 1 }); // Filtro per idoneità
memberSchema.index({ updatedAt: -1 }); // Ordinamento per data aggiornamento
memberSchema.index({ tag: 1, idoneita: 1 }); // Filtro combinato tag+idoneità
memberSchema.index({ name: 1, tag: 1 }); // Ricerca nome con filtro tag

// Aggiorna updatedAt prima di salvare
memberSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Member', memberSchema);

