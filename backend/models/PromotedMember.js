const mongoose = require('mongoose');

const promotedMemberSchema = new mongoose.Schema({
    // Campi originali del membro
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
        default: ['LSE' , 'OPERATORE' ]// I membri promossi hanno tag LSE
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
        default: true // I membri promossi sono sempre idonei
    },
    watchdog: {
        type: Boolean,
        default: false,
        index: true
    },
    promoted: {
        type: Boolean,
        default: true // Sempre true per membri promossi
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

    // Campi specifici per membri promossi
    promotedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    promotedBy: {
        type: String,
        required: true,
        default: 'system'
    },
    originalMemberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member'
    },
    promotionReason: {
        type: String,
        default: ''
    },

    // Mantiene i timestamp originali
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indici ottimizzati per PromotedMember
promotedMemberSchema.index({ key: 1 }); // Ricerca per chiave
promotedMemberSchema.index({ name: 1 }); // Ricerca per nome
promotedMemberSchema.index({ id: 1 }); // Ricerca per Discord ID
promotedMemberSchema.index({ promotedAt: -1 }); // Ordinamento per data promozione
promotedMemberSchema.index({ promotedBy: 1 }); // Ricerca per chi ha promosso
promotedMemberSchema.index({ tag: 1 }); // Filtro per tag
promotedMemberSchema.index({ originalMemberId: 1 }); // Lookup membri originali

// Aggiorna updatedAt prima di salvare
promotedMemberSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('PromotedMember', promotedMemberSchema);