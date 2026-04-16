/**
 * Utility per la gestione degli avatar Discord
 */
import { getApiBaseUrl, getStoredAuthToken } from '../lib/runtime-config';

const rsiApiUrl = getApiBaseUrl();

/**
 * Ottiene l'URL dell'avatar Discord dall'ID utente
 * @param {string} userId - ID utente Discord
 * @param {string} discordBotToken - Token del bot Discord (opzionale)
 * @returns {string} URL dell'avatar
 */
export function getDiscordAvatarUrl(userId, discordBotToken = null) {
    if (!userId) {
        return null;
    }

    // Se abbiamo il bot token, usa l'API Discord con il token
    if (discordBotToken) {
        return `https://cdn.discordapp.com/avatars/${userId}/avatar.png?size=128`;
    }

    // Fallback: usa l'API pubblica Discord (può non funzionare per tutti gli utenti)
    return `https://cdn.discordapp.com/avatars/${userId}/avatar.png?size=128`;
}

/**
 * Ottiene l'avatar Discord dall'API ufficiale usando il bot token tramite endpoint backend
 * @param {string} userId - ID utente Discord
 * @param {string} discordBotToken - Token del bot Discord (non usato direttamente, serve solo per compatibilità)
 * @returns {Promise<string|null>} URL dell'avatar o null se errore
 */
export async function getDiscordAvatar(userId, discordBotToken) {
    if (!userId) {
        return null;
    }

    // Ottieni l'URL del backend
    const apiUrl = rsiApiUrl;

    // Ottieni il token di autenticazione
    const authToken = getStoredAuthToken();

    try {
        const response = await fetch(`${apiUrl}/api/v1/discord/avatar/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            },
        });

        if (!response.ok) {
            // Se errore, usa l'avatar di default
            const defaultAvatarIndex = parseInt(userId) % 6;
            return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
        }

        const data = await response.json();
        
        if (data.success && data.avatarUrl) {
            return data.avatarUrl;
        }

        // Fallback: avatar di default
        const defaultAvatarIndex = parseInt(userId) % 6;
        return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
    } catch (error) {
        console.error('Errore nel recupero avatar Discord:', error);
        // Fallback: avatar di default
        const defaultAvatarIndex = parseInt(userId) % 6;
        return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
    }
}

