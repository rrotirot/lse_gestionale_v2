const { Client, GatewayIntentBits } = require('discord.js');
const { logger } = require('../lib/logger');
const Member = require('../models/Member');
const PromotedMember = require('../models/PromotedMember');

const DEFAULT_TAG = process.env.DISCORD_SYNC_DEFAULT_TAG || 'LSE-P';
const NAME_SOURCE = process.env.DISCORD_SYNC_NAME_SOURCE || 'displayName';

function cleanMemberName(name) {
    if (!name) return '';
    return name
        .replace(/\[\s*(LSE-P|P-LSE|LSE|OPERATORE)\s*\]/gi, '')
        .replace(/\(\s*(LSE-P|P-LSE|LSE|OPERATORE)\s*\)/gi, '')
        .replace(/\{\s*(LSE-P|P-LSE|LSE|OPERATORE)\s*\}/gi, '')
        .replace(/\b(LSE-P|P-LSE|LSE|OPERATORE)\s*[\-|\|]\s*/gi, '')
        .replace(/\s*[\-|\|]\s*(LSE-P|P-LSE|LSE|OPERATORE)\b/gi, '')
        .replace(/\b(LSE-P|P-LSE|LSE)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function pickName(discordMember, nameSource) {
    let name = '';
    if (nameSource === 'displayName' && discordMember.displayName) {
        name = discordMember.displayName;
    } else {
        name = discordMember.user?.username || '';
    }
    return cleanMemberName(name);
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
            const existingMembers = await Member.find({}, 'id name tag').lean();
            const promotedMembers = await PromotedMember.find({}, 'id name tag').lean();
            
            const existingById = new Map();
            existingMembers.forEach(m => existingById.set(m.id, { ...m, isPromoted: false }));
            promotedMembers.forEach(m => existingById.set(m.id, { ...m, isPromoted: true }));

            let added = 0;
            let updated = 0;
            let skipped = 0;

            // Find max key
            const maxKeyDoc = await Member.findOne().sort({ key: -1 });
            const maxKeyPromotedDoc = await PromotedMember.findOne().sort({ key: -1 });
            let maxKey = Math.max(
                maxKeyDoc ? maxKeyDoc.key : 0,
                maxKeyPromotedDoc ? maxKeyPromotedDoc.key : 0
            );

            for (const [memberId, member] of members) {
                // Skip bots
                if (member.user.bot) continue;

                const currentTag = determineTag(member, null);
                const existing = existingById.get(memberId);

                if (existing) {
                    const finalTag = currentTag || existing.tag; // Mantiene il tag attuale se non ha ruoli specifici in Discord
                    const cleanName = pickName(member, NAME_SOURCE);
                    const nameChanged = existing.name !== cleanName;
                    const discordAvatarUrl = member.user.avatar ? `https://cdn.discordapp.com/avatars/${memberId}/${member.user.avatar}.png?size=128` : null;
                    
                    if (existing.tag !== finalTag || nameChanged || (discordAvatarUrl && existing.discordAvatar !== discordAvatarUrl)) {
                        const updateData = { tag: finalTag, name: cleanName };
                        if (discordAvatarUrl) {
                            updateData.discordAvatar = discordAvatarUrl;
                        }
                        if (existing.isPromoted) {
                            await PromotedMember.updateOne({ id: memberId }, { $set: updateData });
                        } else {
                            await Member.updateOne({ id: memberId }, { $set: updateData });
                        }
                        updated++;
                    } else {
                        skipped++;
                    }

                    // Se l'utente ha il ruolo OPERATORE o tag LSE, aggiorniamo il nickname su Discord
                    try {
                        const currentNickname = member.nickname || member.displayName || member.user?.username || '';
                        const cleanNameNick = cleanMemberName(currentNickname);
                        if (cleanNameNick) {
                            const tagUpper = String(finalTag).toUpperCase();
                            const tagPrefix = (tagUpper === 'LSE' || tagUpper === 'OPERATORE') ? 'LSE' : tagUpper;
                            const newNickname = `[${tagPrefix}] ${cleanNameNick}`;
                            if (member.nickname !== newNickname) {
                                await member.setNickname(newNickname);
                                logger.info(`Updated nickname for Discord user ${memberId} to: "${newNickname}" via syncMembers`);
                            }
                        }
                    } catch (nickError) {
                        logger.warn(`Failed to update nickname for Discord user ${memberId} via syncMembers: ${nickError.message}`);
                    }

                    continue;
                }

                // Skip if they are new and don't have any specific LSE/LSE-P roles
                if (!currentTag) {
                    skipped++;
                    continue;
                }

                // Create new member
                const memberData = {
                    key: ++maxKey,
                    name: pickName(member, NAME_SOURCE),
                    id: memberId,
                    tag: currentTag,
                    index: '',
                    date: member.joinedAt ? member.joinedAt.toISOString().split('T')[0] : '',
                    idoneita: false,
                    watchdog: false,
                    promoted: false,
                    note: '',
                    affiliazioniOrg: '',
                    orgValidation: null,
                    discordAvatar: member.user.avatar ? `https://cdn.discordapp.com/avatars/${memberId}/${member.user.avatar}.png?size=128` : null
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

    async updateMemberRole(discordId, newTag) {
        if (!this.isReady || !this.guild) {
            logger.warn('Discord bot not ready, skipping role update');
            return { success: false, error: 'Bot not ready' };
        }

        try {
            const member = await this.guild.members.fetch(discordId);
            if (!member) {
                logger.warn(`Member ${discordId} not found in guild for role update`);
                return { success: false, error: 'Member not found in Discord server' };
            }

            const tagUpper = String(newTag).toUpperCase();
            const roleLsePNames = ['LSE-P', 'P-LSE'];
            const roleLseNames = ['LSE', 'OPERATORE'];

            const roleLseP = this.guild.roles.cache.find(r => roleLsePNames.includes(String(r.name).toUpperCase()));
            const roleLse = this.guild.roles.cache.find(r => roleLseNames.includes(String(r.name).toUpperCase()));

            if (tagUpper === 'LSE' || tagUpper === 'OPERATORE') {
                if (roleLse) {
                    await member.roles.add(roleLse);
                    logger.info(`Added role ${roleLse.name} to Discord user ${member.user.tag}`);
                } else {
                    logger.warn(`Role LSE/OPERATORE not found on Discord server`);
                }

                if (roleLseP && member.roles.cache.has(roleLseP.id)) {
                    await member.roles.remove(roleLseP);
                    logger.info(`Removed role ${roleLseP.name} from Discord user ${member.user.tag}`);
                }
            } else if (tagUpper === 'LSE-P' || tagUpper === 'P-LSE') {
                if (roleLseP) {
                    await member.roles.add(roleLseP);
                    logger.info(`Added role ${roleLseP.name} to Discord user ${member.user.tag}`);
                } else {
                    logger.warn(`Role LSE-P/P-LSE not found on Discord server`);
                }

                if (roleLse && member.roles.cache.has(roleLse.id)) {
                    await member.roles.remove(roleLse);
                    logger.info(`Removed role ${roleLse.name} from Discord user ${member.user.tag}`);
                }
            }

            // Aggiorna anche il nickname su Discord per riflettere il cambio tag (es. [LSE-P] Name -> [LSE] Name)
            try {
                const currentNickname = member.nickname || member.displayName || member.user?.username || '';
                const cleanName = cleanMemberName(currentNickname);
                if (cleanName) {
                    const tagPrefix = (tagUpper === 'LSE' || tagUpper === 'OPERATORE') ? 'LSE' : tagUpper;
                    const newNickname = `[${tagPrefix}] ${cleanName}`;
                    if (member.nickname !== newNickname) {
                        await member.setNickname(newNickname);
                        logger.info(`Updated nickname for Discord user ${discordId} to: "${newNickname}"`);
                    }
                }
            } catch (nickError) {
                logger.warn(`Failed to update nickname for Discord user ${discordId}: ${nickError.message}`);
            }

            return { success: true };
        } catch (error) {
            logger.error(`Failed to update roles for Discord user ${discordId}:`, error);
            return { success: false, error: error.message };
        }
    }

    async applyAllRolesToDiscord() {
        if (!this.isReady || !this.guild) {
            throw new Error('Bot not ready');
        }

        logger.info('Starting to apply database changes (roles & nicknames) to Discord...');

        try {
            const regularMembers = await Member.find({ id: { $ne: '', $exists: true } });
            const promotedMembers = await PromotedMember.find({ id: { $ne: '', $exists: true } });
            const members = [...regularMembers, ...promotedMembers];
            logger.info(`Found ${members.length} members with Discord ID in DB`);

            let successCount = 0;
            let failCount = 0;
            const errors = [];

            for (const member of members) {
                try {
                    const res = await this.updateMemberRole(member.id, member.tag);
                    if (res.success) {
                        successCount++;
                    } else {
                        failCount++;
                        errors.push(`${member.name} (${member.id}): ${res.error}`);
                    }
                    // Introduce a tiny delay (100ms) to avoid rate limits
                    await new Promise(r => setTimeout(r, 100));
                } catch (err) {
                    failCount++;
                    errors.push(`${member.name} (${member.id}): ${err.message}`);
                }
            }

            logger.info(`Apply DB to Discord completed: ${successCount} successful, ${failCount} failed`);
            return {
                success: true,
                processed: members.length,
                added: 0,
                updated: successCount,
                unchanged: 0,
                failed: failCount,
                errors
            };
        } catch (error) {
            logger.error('Failed to apply database roles to Discord:', error);
            throw error;
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