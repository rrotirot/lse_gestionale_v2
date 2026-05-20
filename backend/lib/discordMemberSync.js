const { Client, GatewayIntentBits } = require('discord.js');
const Member = require('../models/Member');
const { logger } = require('./logger');

const DEFAULT_TAG = process.env.DISCORD_SYNC_DEFAULT_TAG || 'LSE-P';
const DEFAULT_NAME_SOURCE = process.env.DISCORD_SYNC_NAME_SOURCE || 'username';

function toYyyyMmDd(dateValue) {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

function pickName(discordMember, nameSource) {
    if (nameSource === 'displayName' && discordMember.displayName) {
        return discordMember.displayName;
    }
    return discordMember.user?.username || '';
}

function determineTag(discordMember, defaultTag) {
    if (!discordMember || !discordMember.roles || !discordMember.roles.cache) {
        return defaultTag;
    }

    // Controlla se l'utente ha il ruolo "OPERATORE" o "LSE"
    const hasOperatoreRole = discordMember.roles.cache.some(
        role => role.name && (role.name.toUpperCase() === 'OPERATORE' || role.name.toUpperCase() === 'LSE')
    );
    if (hasOperatoreRole) {
        return 'LSE';
    }

    // Controlla se l'utente ha il ruolo "P-LSE" o "LSE-P"
    const hasLsePRole = discordMember.roles.cache.some(
        role => role.name && (role.name.toUpperCase() === 'P-LSE' || role.name.toUpperCase() === 'LSE-P')
    );
    if (hasLsePRole) {
        return 'LSE-P';
    }

    return defaultTag;
}

function buildMemberDoc(discordMember, options = {}) {
    const defaultTag = options.defaultTag || DEFAULT_TAG;
    const nameSource = options.nameSource || DEFAULT_NAME_SOURCE;
    const tag = determineTag(discordMember, defaultTag);

    return {
        name: pickName(discordMember, nameSource),
        id: discordMember.user.id,
        date: toYyyyMmDd(discordMember.joinedAt),
        tag
    };
}

async function getNextKeyStart() {
    const maxKeyDoc = await Member.findOne({}, { key: 1 }).sort({ key: -1 }).lean();
    return maxKeyDoc?.key || 0;
}

class DiscordMemberSyncService {
    constructor(options = {}) {
        this.token = options.token || process.env.DISCORD_BOT_TOKEN;
        this.guildId = options.guildId || process.env.DISCORD_GUILD_ID;
        this.defaultTag = options.defaultTag || DEFAULT_TAG;
        this.nameSource = options.nameSource || DEFAULT_NAME_SOURCE;
        this.dryRun = Boolean(options.dryRun);
        this.client = null;
        this.guild = null;
    }

    validateConfig() {
        const missing = [];
        if (!this.token) missing.push('DISCORD_BOT_TOKEN');
        if (!this.guildId) missing.push('DISCORD_GUILD_ID');
        if (missing.length > 0) {
            throw new Error(`Missing required Discord config: ${missing.join(', ')}`);
        }
    }

    async connect() {
        this.validateConfig();
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
        });

        await this.client.login(this.token);
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Discord ready timeout (15s)')), 15000);
            this.client.once('ready', () => {
                clearTimeout(timeout);
                resolve();
            });
        });

        this.guild = await this.client.guilds.fetch(this.guildId);
        if (!this.guild) {
            throw new Error(`Discord guild ${this.guildId} not found`);
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.destroy();
            this.client = null;
            this.guild = null;
        }
    }

    async syncMembers() {
        const startedAt = Date.now();
        const report = {
            success: false,
            dryRun: this.dryRun,
            guildId: this.guildId,
            readFromDiscord: 0,
            skippedBots: 0,
            added: 0,
            updated: 0,
            unchanged: 0,
            errors: [],
            elapsedMs: 0
        };

        try {
            await this.connect();

            const discordMembers = await this.guild.members.fetch();
            report.readFromDiscord = discordMembers.size;

            const candidates = [];
            for (const [, discordMember] of discordMembers) {
                if (discordMember.user.bot) {
                    report.skippedBots += 1;
                    continue;
                }
                candidates.push(discordMember);
            }

            const ids = candidates.map((m) => m.user.id);
            const existingMembers = await Member.find({ id: { $in: ids } }, { id: 1, name: 1, date: 1, tag: 1 }).lean();
            const existingById = new Map(existingMembers.map((m) => [m.id, m]));

            let nextKey = await getNextKeyStart();
            const ops = [];

            for (const discordMember of candidates) {
                const normalized = buildMemberDoc(discordMember, {
                    defaultTag: this.defaultTag,
                    nameSource: this.nameSource
                });

                const existing = existingById.get(normalized.id);
                if (!existing) {
                    nextKey += 1;
                    report.added += 1;
                    ops.push({
                        updateOne: {
                            filter: { id: normalized.id },
                            update: {
                                $setOnInsert: {
                                    key: nextKey,
                                    index: '',
                                    idoneita: false,
                                    watchdog: false,
                                    promoted: false,
                                    affiliazioniOrg: '',
                                    orgValidation: null,
                                    note: '',
                                    richiami: 0
                                },
                                $set: normalized
                            },
                            upsert: true
                        }
                    });
                    continue;
                }

                const hasDiff =
                    existing.name !== normalized.name ||
                    (existing.date || '') !== (normalized.date || '') ||
                    (existing.tag || '') !== (normalized.tag || '');

                if (!hasDiff) {
                    report.unchanged += 1;
                    continue;
                }

                report.updated += 1;
                ops.push({
                    updateOne: {
                        filter: { id: normalized.id },
                        update: {
                            $set: {
                                name: normalized.name,
                                date: normalized.date,
                                tag: normalized.tag
                            }
                        }
                    }
                });
            }

            if (!this.dryRun && ops.length > 0) {
                await Member.bulkWrite(ops, { ordered: false });
            }

            report.success = true;
            report.elapsedMs = Date.now() - startedAt;
            logger.info('Discord members sync completed', report);
            return report;
        } catch (error) {
            report.elapsedMs = Date.now() - startedAt;
            report.errors.push(error.message || String(error));
            logger.error('Discord members sync failed', {
                error: error.message || String(error),
                guildId: this.guildId,
                dryRun: this.dryRun
            });
            return report;
        } finally {
            await this.disconnect();
        }
    }
}

module.exports = {
    DiscordMemberSyncService,
    buildMemberDoc
};

