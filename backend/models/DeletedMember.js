const mongoose = require('mongoose');

const deletedMemberSchema = new mongoose.Schema({
    // Copia tutti i campi del membro originale
    key: {
        type: Number,
        required: true,
        index: true
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
    // Campi aggiuntivi per tracciare l'eliminazione
    deletedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    deletedBy: {
        type: String,
        required: true,
        default: 'system',
        index: true
    },
    originalCreatedAt: {
        type: Date
    },
    originalUpdatedAt: {
        type: Date
    },
    deletionReasons: {
        type: [String],
        default: []
    }
});

// Indici per ricerca rapida
deletedMemberSchema.index({ name: 1, id: 1 });
deletedMemberSchema.index({ deletedAt: -1 });

module.exports = mongoose.model('DeletedMember', deletedMemberSchema);

