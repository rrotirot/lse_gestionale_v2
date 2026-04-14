import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useMemberFilters } from '../hooks/useMemberFilters';
import { membersService } from '../services/membersService';
import { useAuth } from '../hooks/useAuth';

const MembersContext = createContext(null);
const rsiApiUrl = import.meta.env.VITE_RSI_API_URL

export function MembersProvider({ children }) {
    const { authToken } = useAuth();
    const [members, setMembers] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [avatarCache, setAvatarCache] = useState({});
    const [showDeletedMembers, setShowDeletedMembers] = useState(false);
    const [deletedMembers, setDeletedMembers] = useState([]);
    const [loadingDeletedMembers, setLoadingDeletedMembers] = useState(false);

    // Bot token Discord
    const [discordBotToken] = useState(() => {
        try {
            if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_DISCORD_BOT_TOKEN) {
                return import.meta.env.VITE_DISCORD_BOT_TOKEN;
            }
        } catch (e) {
            // Ignora errori
        }
        try {
            const saved = localStorage.getItem('discord_bot_token');
            return saved || null;
        } catch {
            return null;
        }
    });

    // Usa useMemberFilters per gestire i filtri
    const filters = useMemberFilters(members);

    const normalizeKey = (k) => {
        const n = typeof k === 'number' ? k : parseInt(String(k), 10);
        return Number.isFinite(n) ? n : null;
    };

    // Funzione per ricaricare i membri dal database
    const refreshMembers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            console.log(`🔄 Tentativo di caricamento membri da ${rsiApiUrl}/api/X/members`);
            const response = await fetch(`${rsiApiUrl}/api/v1/members`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            console.log(`📡 Risposta ricevuta: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const data = await response.json();
                console.log('📦 Dati ricevuti:', { success: data.success, count: data.count, hasMembers: !!data.members, membersLength: data.members?.length });
                
                if (data.success && data.members) {
                    setMembers(data.members);
                    const membersWithValidation = data.members.filter(m => m.orgValidation).length;
                    console.log(`✅ Lista membri aggiornata: ${data.count} membri (${membersWithValidation} con validazione)`);

                    // Aggiorna anche il membro selezionato se esiste ancora
                    setSelectedMember(prevSelected => {
                        if (!prevSelected) return null;
                        const prevKey = normalizeKey(prevSelected.key);
                        // Se la key non è normalizzabile (NaN/null), non provare a "riallineare"
                        // per evitare di sostituire/azzerare la selezione durante i refresh.
                        if (prevKey === null) return prevSelected;

                        const updatedSelected = data.members.find(m => normalizeKey(m.key) === prevKey);
                        // Se non lo troviamo, manteniamo la selezione corrente (evita chiusure improvvise della modal)
                        return updatedSelected || prevSelected;
                    });
                } else {
                    console.warn('⚠️ Risposta non valida:', data);
                    setError(data.error || 'Errore nel caricamento membri');
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error(`❌ Errore HTTP ${response.status}:`, errorData.error || response.statusText);
                setError(errorData.error || `Errore HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Errore nel refresh membri:', error.message);
            setError(error.message || 'Errore di connessione');
        } finally {
            setLoading(false);
        }
    }, []);

    // Funzione per caricare i membri eliminati
    const loadDeletedMembers = useCallback(async () => {
        if (!authToken) {
            console.warn('⚠️ AuthToken mancanti per caricare membri eliminati');
            return;
        }

        setLoadingDeletedMembers(true);
        try {
            console.log(`🔄 Richiesta membri eliminati a ${rsiApiUrl}/api/X/deleted-members`);
            const response = await fetch(`${rsiApiUrl}/api/v1/deleted-members`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
            });

            console.log(`📡 Risposta status: ${response.status} ${response.statusText}`);

            if (response.ok) {
                const data = await response.json();
                console.log('📦 Dati ricevuti:', data);
                if (data.success && data.members) {
                    setDeletedMembers(data.members);
                    console.log(`✅ Caricati ${data.count} membri eliminati`);
                } else {
                    console.warn('⚠️ Risposta non valida:', data);
                    setDeletedMembers([]);
                }
            } else {
                let errorMessage = 'Errore sconosciuto';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || response.statusText;
                    console.error('❌ Errore nel caricamento membri eliminati:', {
                        status: response.status,
                        statusText: response.statusText,
                        error: errorData
                    });
                } catch (parseError) {
                    console.error('❌ Errore nel parsing della risposta:', parseError);
                    errorMessage = `Errore HTTP ${response.status}: ${response.statusText}`;
                }
                setError(errorMessage);
            }
        } catch (error) {
            console.error('❌ Errore nel caricamento membri eliminati:', error);
            setError(error.message || 'Errore di connessione al server');
        } finally {
            setLoadingDeletedMembers(false);
        }
    }, [authToken]);

    // Carica i membri eliminati quando si apre la card
    useEffect(() => {
        if (showDeletedMembers && authToken) {
            console.log('🔄 Caricamento membri eliminati...');
            loadDeletedMembers();
        }
    }, [showDeletedMembers, authToken, loadDeletedMembers]);

    // Funzione per ottenere l'avatar Discord
    const getDiscordAvatar = useCallback(async (userId) => {
        if (!userId) return null;

        const defaultAvatarIndex = parseInt(userId) % 5;
        const defaultAvatar = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;

        if (!discordBotToken) {
            setAvatarCache(prev => {
                if (!prev[userId]) {
                    return { ...prev, [userId]: defaultAvatar };
                }
                return prev;
            });
            return defaultAvatar;
        }

        const setDefaultAvatar = () => {
            setAvatarCache(prev => {
                if (!prev[userId]) {
                    return { ...prev, [userId]: defaultAvatar };
                }
                return prev;
            });
        };

        setDefaultAvatar();
        return defaultAvatar;
    }, [discordBotToken]);

    // Funzione sincrona per ottenere l'URL dell'avatar (con cache)
    const getDiscordAvatarUrl = useCallback((userId) => {
        if (!userId) return null;

        if (avatarCache[userId]) {
            return avatarCache[userId];
        }

        setTimeout(() => {
            getDiscordAvatar(userId).catch(() => {
                // Ignora errori
            });
        }, 0);

        const defaultAvatarIndex = parseInt(userId) % 5;
        return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
    }, [avatarCache, getDiscordAvatar]);

    // Precàrica gli avatar dei membri visibili nella lista
    useEffect(() => {
        const memberIds = filters.filtered.slice(0, 20)
            .map(m => m.id)
            .filter(id => id && !avatarCache[id]);

        memberIds.forEach(userId => {
            getDiscordAvatar(userId).catch(() => {
                // Ignora errori
            });
        });
    }, [filters.filtered, avatarCache, getDiscordAvatar]);

    // Funzione per aggiornare un membro
    const updateMember = useCallback(async (memberKey, memberData) => {
        try {
            const response = await membersService.updateMember(memberKey, memberData);
            if (response.success) {
                const targetKey = normalizeKey(memberKey);
                // Aggiorna lo stato locale
                setMembers(prevMembers =>
                    prevMembers.map(m => normalizeKey(m.key) === targetKey ? { ...m, ...memberData } : m)
                );
                // Aggiorna anche il membro selezionato se è quello modificato
                if (selectedMember && normalizeKey(selectedMember.key) === targetKey) {
                    setSelectedMember({ ...selectedMember, ...memberData });
                }
                // Non ricaricare tutti i membri, l'aggiornamento locale è sufficiente
                return { success: true, member: response.member || memberData };
            } else {
                return { success: false, error: response.error || 'Errore nell\'aggiornamento' };
            }
        } catch (error) {
            console.error('Errore nell\'aggiornamento membro:', error);
            return { success: false, error: error.message || 'Errore di connessione' };
        }
    }, [selectedMember]);

    // Funzione per aggiungere un membro
    const addMember = useCallback(async (memberData) => {
        try {
            const response = await membersService.addMember(memberData);
            if (response.success) {
                setTimeout(() => refreshMembers(), 300);
                return { success: true, member: response.member };
            } else {
                return { success: false, error: response.error || 'Errore nell\'aggiunta' };
            }
        } catch (error) {
            console.error('Errore nell\'aggiunta membro:', error);
            return { success: false, error: error.message || 'Errore di connessione' };
        }
    }, [refreshMembers]);

    // Funzione per eliminare un membro
    const deleteMember = useCallback(async (memberKey, deletionReasons = []) => {
        try {
            const response = await membersService.deleteMember(memberKey, deletionReasons);
            if (response.success) {
                const targetKey = normalizeKey(memberKey);
                // Rimuovi il membro dalla lista locale
                setMembers(prevMembers => prevMembers.filter(m => normalizeKey(m.key) !== targetKey));
                // Chiudi il modal se il membro eliminato era selezionato
                if (selectedMember && normalizeKey(selectedMember.key) === targetKey) {
                    setSelectedMember(null);
                }
                return { success: true };
            } else {
                return { success: false, error: response.error || 'Errore nell\'eliminazione' };
            }
        } catch (error) {
            console.error('Errore nell\'eliminazione membro:', error);
            return { success: false, error: error.message || 'Errore di connessione' };
        }
    }, [selectedMember]);

    const value = {
        // Stato
        members,
        selectedMember,
        loading,
        error,
        avatarCache,
        showDeletedMembers,
        deletedMembers,
        loadingDeletedMembers,
        discordBotToken,
        
        // Filtri
        ...filters,
        
        // Funzioni
        setSelectedMember,
        refreshMembers,
        loadDeletedMembers,
        setShowDeletedMembers,
        getDiscordAvatar,
        getDiscordAvatarUrl,
        updateMember,
        addMember,
        deleteMember,
    };

    return <MembersContext.Provider value={value}>{children}</MembersContext.Provider>;
}

export function useMembersContext() {
    const context = useContext(MembersContext);
    if (!context) {
        throw new Error('useMembersContext deve essere usato all\'interno di MembersProvider');
    }
    return context;
}
