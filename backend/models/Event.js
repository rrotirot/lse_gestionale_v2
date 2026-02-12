const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        default: ''
    },
    endTime: {
        type: String,
        default: ''
    },
    location: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['evento', 'riunione', 'attività', 'discord', 'altro'],
        default: 'evento'
    },
    createdBy: {
        type: String,
        required: true,
        default: 'system'
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

// Indici per ricerca rapida
eventSchema.index({ date: 1 });
eventSchema.index({ createdAt: -1 });

// Aggiorna updatedAt prima di salvare
eventSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Event', eventSchema);

