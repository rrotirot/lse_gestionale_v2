#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const { DiscordMemberSyncService } = require('../lib/discordMemberSync');

function parseArgs(argv) {
    const args = new Set(argv.slice(2));
    return {
        dryRun: args.has('--dry-run'),
        useDisplayName: args.has('--display-name')
    };
}

async function main() {
    const { dryRun, useDisplayName } = parseArgs(process.argv);
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lse-members';

    await mongoose.connect(mongoUri);

    const service = new DiscordMemberSyncService({
        dryRun,
        nameSource: useDisplayName ? 'displayName' : 'username'
    });

    const report = await service.syncMembers();

    console.log(JSON.stringify(report, null, 2));

    await mongoose.disconnect();
    process.exit(report.success ? 0 : 1);
}

main().catch(async (error) => {
    console.error('sync-discord-members failed:', error.message || error);
    try {
        await mongoose.disconnect();
    } catch { }
    process.exit(1);
});

