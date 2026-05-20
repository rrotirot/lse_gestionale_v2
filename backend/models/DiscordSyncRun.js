const mongoose = require('mongoose');

const discordSyncRunSchema = new mongoose.Schema({
    jobId: {
        type: String,
        required: true,
        unique: true
    },
    triggeredBy: {
        type: String,
        required: true
    },
    mode: {
        type: String,
        enum: ['dry-run', 'live'],
        required: true
    },
    status: {
        type: String,
        enum: ['queued', 'running', 'completed', 'failed'],
        default: 'queued'
    },
    result: {
        readFromDiscord: { type: Number, default: 0 },
        skippedBots: { type: Number, default: 0 },
        added: { type: Number, default: 0 },
        updated: { type: Number, default: 0 },
        unchanged: { type: Number, default: 0 },
        errors: [String]
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    finishedAt: {
        type: Date
    }
});

// Indexes for performance
discordSyncRunSchema.index({ jobId: 1 }, { unique: true });
discordSyncRunSchema.index({ startedAt: -1 });

module.exports = mongoose.model('DiscordSyncRun', discordSyncRunSchema);
