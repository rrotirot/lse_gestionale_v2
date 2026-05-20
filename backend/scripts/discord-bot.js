const { Client, GatewayIntentBits } = require('discord.js');
const { logger } = require('../lib/logger');
const Member = require('../models/Member');

const DEFAULT_TAG = process.env.DISCORD_SYNC_DEFAULT_TAG || 'LSE-P';

function determineTag(discordMember, defaultTag) {
    if (!discordMember || !discordMember.roles || !discordMember.roles.cache) {
        return defaultTag;
    }

    // Controlla se l'utente ha il ruolo "OPERATORE"
    const hasOperatoreRole = discordMember.roles.cache.some(
        role => role.name && role.name.toUpperCase() === 'OPERATORE'
    );
    if (hasOperatoreRole) {
        return 'OPERATORE';
    }

    // Controlla se l'utente ha il ruolo "P-LSE" o "LSE-P"
    const hasLsePRole = discordMember.roles.cache.some(
        role => role.name && (role.name.toUpperCase() === 'P-LSE' || role.name.toUpperCase() === 'LSE-P')
    );
    if (hasLsePRole) {
        return 'LSE-P';
    }

    // Controlla se l'utente ha il ruolo "LSE"
    const hasLseRole = discordMember.roles.cache.some(
        role => role.name && role.name.toUpperCase() === 'LSE'
    );
    if (hasLseRole) {
        return 'LSE';
    }

    return defaultTag;
}

class DiscordBot {
    constructor() {
        this.client = null;
        this.guild = null;
        this.isReady = false;
    }

    async initialize() {
        if (this.isReady && this.client) {
            return true;
        }

        const token = process.env.DISCORD_BOT_TOKEN;
        const guildId = process.env.DISCORD_GUILD_ID;

        if (!token || !guildId) {
            logger.warn('Discord bot not configured - missing DISCORD_BOT_TOKEN or DISCORD_GUILD_ID');
            return false;
        }

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers
            ]
        });

        this.client.once('ready', () => {
            logger.info(`Discord bot logged in as ${this.client.user.tag}`);
            this.guild = this.client.guilds.cache.get(guildId);
            if (!this.guild) {
                logger.error(`Guild ${guildId} not found`);
                return;
            }
            this.isReady = true;
            logger.info(`Connected to guild: ${this.guild.name}`);
        });

        this.client.on('error', (error) => {
            logger.error('Discord bot error:', error);
        });

        // Sincronizzazione in tempo reale al cambio di ruolo su Discord
        this.client.on('guildMemberUpdate', async (oldMember, newMember) => {
            try {
                const oldRoles = oldMember.roles.cache.map(r => r.id).sort().join(',');
                const newRoles = newMember.roles.cache.map(r => r.id).sort().join(',');
                if (oldRoles === newRoles) {
                    return;
                }

                logger.info(`Discord roles updated for member ${newMember.user.tag}`);

                const newTag = determineTag(newMember, DEFAULT_TAG);

                const result = await Member.findOneAndUpdate(
                    { id: newMember.user.id },
                    { $set: { tag: newTag } },
                    { new: true }
                );

                if (result) {
                    logger.info(`[Real-time Sync] Updated tag to '${newTag}' in DB for member ${newMember.user.tag}`);
                }
            } catch (error) {
                logger.error(`Error handling guildMemberUpdate for ${newMember.user.id}:`, error);
            }
        });

        try {
            await this.client.login(token);
            // Wait for ready event
            await new Promise((resolve) => {
                const checkReady = () => {
                    if (this.isReady) {
                        resolve();
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                checkReady();
            });
            return true;
        } catch (error) {
            logger.error('Failed to login Discord bot:', error);
            return false;
        }
    }

    async syncMembers() {
        if (!this.isReady || !this.guild) {
            throw new Error('Bot not ready');
        }

        logger.info('Starting Discord member sync...');

        try {
            // Fetch all members
            const members = await this.guild.members.fetch();
            logger.info(`Fetched ${members.size} members from Discord`);

            // Get existing members from DB
            const existingMembers = await Member.find({}, 'id name tag');
            const existingById = new Map(existingMembers.map(m => [m.id, m]));

            let added = 0;
            let updated = 0;
            let skipped = 0;

            // Find max key
            const maxKeyDoc = await Member.findOne().sort({ key: -1 });
            let maxKey = maxKeyDoc ? maxKeyDoc.key : 0;

            for (const [memberId, member] of members) {
                // Skip bots
                if (member.user.bot) continue;

                const currentTag = determineTag(member, DEFAULT_TAG);
                const existing = existingById.get(memberId);

                if (existing) {
                    if (existing.tag !== currentTag) {
                        await Member.updateOne({ id: memberId }, { $set: { tag: currentTag } });
                        updated++;
                    } else {
                        skipped++;
                    }
                    continue;
                }

                // Create new member
                const memberData = {
                    key: ++maxKey,
                    name: member.user.username,
                    id: memberId,
                    tag: currentTag,
                    index: '',
                    date: member.joinedAt ? member.joinedAt.toISOString().split('T')[0] : '',
                    idoneita: false,
                    watchdog: false,
                    promoted: false,
                    note: '',
                    affiliazioniOrg: '',
                    orgValidation: null
                };

                await Member.create(memberData);
                added++;
            }

            logger.info(`Discord sync completed: ${added} added, ${updated} updated, ${skipped} skipped`);
            return { success: true, added, updated, skipped };

        } catch (error) {
            logger.error('Discord sync error:', error);
            throw error;
        }
    }

    async kickMember(discordId, reason = 'Removed from LSE member list') {
        if (!this.isReady || !this.guild) {
            throw new Error('Bot not ready');
        }

        try {
            const member = await this.guild.members.fetch(discordId);
            if (!member) {
                logger.warn(`Member ${discordId} not found in guild for kick`);
                return { success: false, error: 'Member not found' };
            }

            await member.kick(reason);
            logger.info(`Kicked member ${member.user.tag} (${discordId}) with reason: ${reason}`);
            return { success: true };

        } catch (error) {
            logger.error(`Failed to kick member ${discordId}:`, error);
            return { success: false, error: error.message };
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.destroy();
            this.isReady = false;
            logger.info('Discord bot disconnected');
        }
    }
}

module.exports = new DiscordBot();