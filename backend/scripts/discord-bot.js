const { Client, GatewayIntentBits } = require('discord.js');
const { logger } = require('./lib/logger');
const Member = require('./models/Member');

class DiscordBot {
    constructor() {
        this.client = null;
        this.guild = null;
        this.isReady = false;
    }

    async initialize() {
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
            const existingMembers = await Member.find({}, 'id name');
            const existingIds = new Set(existingMembers.map(m => m.id));

            let added = 0;
            let skipped = 0;

            // Find max key
            const maxKeyDoc = await Member.findOne().sort({ key: -1 });
            let maxKey = maxKeyDoc ? maxKeyDoc.key : 0;

            for (const [memberId, member] of members) {
                // Skip bots
                if (member.user.bot) continue;

                // Skip if already exists
                if (existingIds.has(memberId)) {
                    skipped++;
                    continue;
                }

                // Create new member
                const memberData = {
                    key: ++maxKey,
                    name: member.user.username,
                    id: memberId,
                    tag: 'LSE-P',
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

            logger.info(`Discord sync completed: ${added} added, ${skipped} skipped`);
            return { success: true, added, skipped };

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