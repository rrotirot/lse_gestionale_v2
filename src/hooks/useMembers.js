import { useState, useCallback, useMemo } from 'react';
import { membersService } from '../services/membersService';

/**
 * Hook personalizzato per gestire i membri
 */
export function useMembers() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Carica tutti i membri dal backend
     */
    const loadMembers = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const data = await membersService.getAllMembers();
            if (data.success && data.members) {
                setMembers(data.members);
                return data.members;
            } else {
                throw new Error(data.error || 'Risposta non valida dal server');
            }
        } catch (err) {
            console.error('❌ Errore nel caricamento membri:', err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    });

    /**
     * Aggiunge un nuovo membro
     */
    const addMember = useCallback(async (member) => {
        try {
            const newMember = await membersService.addMember(member);
            setMembers(prev => [...prev, newMember]);
            return newMember;
        } catch (err) {
            console.error('❌ Errore nell\'aggiunta membro:', err);
            throw err;
        }
    });

    /**
     * Aggiorna un membro esistente
     */
    const updateMember = useCallback(async (memberKey, memberData) => {
        try {
            const updatedMember = await membersService.updateMember(memberKey, memberData);
            setMembers(prev => prev.map(m => m.key === memberKey ? updatedMember : m));
            return updatedMember;
        } catch (err) {
            console.error('❌ Errore nell\'aggiornamento membro:', err);
            throw err;
        }
    });

    /**
     * Elimina un membro
     */
    const deleteMember = useCallback(async (memberKey) => {
        try {
            await membersService.deleteMember(memberKey);
            setMembers(prev => prev.filter(m => m.key !== memberKey));
        } catch (err) {
            console.error('❌ Errore nell\'eliminazione membro:', err);
            throw err;
        }
    });

    /**
     * Valida un membro
     */
    const validateMember = useCallback(async (memberKey) => {
        try {
            const validatedMember = await membersService.validateMember(memberKey);
            setMembers(prev => prev.map(m => m.key === memberKey ? validatedMember : m));
            return validatedMember;
        } catch (err) {
            console.error('❌ Errore nella validazione membro:', err);
            throw err;
        }
    });

    return {
        members,
        loading,
        error,
        loadMembers,
        addMember,
        updateMember,
        deleteMember,
        validateMember,
        setMembers, // Per aggiornamenti manuali se necessario
    };
}

