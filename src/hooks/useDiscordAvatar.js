import { useState, useEffect } from 'react';
import { getDiscordAvatar } from '../utils/discordUtils';

/**
 * Hook per caricare l'avatar Discord usando il bot token tramite endpoint backend
 */
export function useDiscordAvatar(userId, discordBotToken) {
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) {
            setAvatarUrl(null);
            return;
        }

        setLoading(true);
        getDiscordAvatar(userId, discordBotToken)
            .then(url => {
                setAvatarUrl(url);
                setLoading(false);
            })
            .catch(() => {
                // In caso di errore, usa l'avatar di default
                const defaultAvatarIndex = parseInt(userId) % 6;
                setAvatarUrl(`https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`);
                setLoading(false);
            });
    }, [userId, discordBotToken]);

    return { avatarUrl, loading };
}

