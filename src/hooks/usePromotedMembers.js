import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../lib/runtime-config';

export const usePromotedMembers = () => {
    const [promotedMembers, setPromotedMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPromotedMembers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${getApiBaseUrl()}/api/v1/promoted-members`);
            const data = await response.json();

            if (data.success) {
                setPromotedMembers(data.members);
            } else {
                setError(data.error || 'Errore nel caricamento membri promossi');
            }
        } catch (err) {
            setError('Errore di connessione');
            console.error('Errore caricamento membri promossi:', err);
        } finally {
            setLoading(false);
        }
    };

    const updatePromotedMember = async (key, updates) => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/v1/promoted-members/${key}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            const data = await response.json();

            if (data.success) {
                // Aggiorna lo stato locale
                setPromotedMembers(prev =>
                    prev.map(member =>
                        member.key === key ? data.member : member
                    )
                );
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            console.error('Errore aggiornamento membro promosso:', err);
            return { success: false, error: 'Errore di connessione' };
        }
    };

    const deletePromotedMember = async (key, deletionReasons = []) => {
        try {
            const response = await fetch(`${getApiBaseUrl()}/api/v1/promoted-members/${key}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ deletionReasons }),
            });

            const data = await response.json();

            if (data.success) {
                // Rimuovi dalla lista locale
                setPromotedMembers(prev => prev.filter(member => member.key !== key));
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (err) {
            console.error('Errore eliminazione membro promosso:', err);
            return { success: false, error: 'Errore di connessione' };
        }
    };

    useEffect(() => {
        fetchPromotedMembers();
    }, []);

    return {
        promotedMembers,
        loading,
        error,
        refetch: fetchPromotedMembers,
        updateMember: updatePromotedMember,
        deleteMember: deletePromotedMember,
    };
};