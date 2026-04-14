import { useState, useEffect, useRef, useCallback } from 'react';
import { membersService } from '../services/membersService';

const rsiApiUrl = import.meta.env.VITE_RSI_API_URL

/**
 * Hook personalizzato per gestire i dettagli di un membro
 */
export function useMemberDetail(selectedMember, onMemberUpdate, deleteMemberFunction) {
    const [editedName, setEditedName] = useState('');
    const [editedNote, setEditedNote] = useState('');
    const [loadingOrgValidation, setLoadingOrgValidation] = useState(false);
    const nameChangeDebounceTimer = useRef(null);

    // Aggiorna editedNote e editedName quando cambia selectedMember
    useEffect(() => {
        if (nameChangeDebounceTimer.current) {
            clearTimeout(nameChangeDebounceTimer.current);
            nameChangeDebounceTimer.current = null;
        }

        if (selectedMember) {
            setEditedNote(selectedMember.note || '');
            setEditedName(selectedMember.name || '');
        }
    }, [selectedMember]);

    // Funzione per salvare il nome modificato nel database
    const saveNameToDatabase = useCallback(async (newName, currentMember) => {
        if (!newName || newName.trim() === '' || !currentMember) {
            return;
        }

        const trimmedName = newName.trim();

        if (trimmedName === currentMember.name) {
            return;
        }

        const updatedMember = {
            ...currentMember,
            name: trimmedName,
            affiliazioniOrg: '',
            orgValidation: null
        };

        try {
            await membersService.updateMember(currentMember.key, updatedMember);
            onMemberUpdate(updatedMember);
        } catch (error) {
            console.error('❌ Errore nell\'aggiornamento nome:', error);
            throw error;
        }
    }, [onMemberUpdate]);

    // Funzione per gestire il cambio nome
    const handleNameChange = useCallback((newName) => {
        setEditedName(newName);

        if (!selectedMember) return;

        if (nameChangeDebounceTimer.current) {
            clearTimeout(nameChangeDebounceTimer.current);
        }
        nameChangeDebounceTimer.current = setTimeout(() => {
            saveNameToDatabase(newName, selectedMember);
        }, 1000);
    }, [selectedMember, saveNameToDatabase]);

    // Funzione per gestire il toggle dell'idoneità
    const handleIdoneitaToggle = useCallback(async (newValue) => {
        if (!selectedMember) return;

        if (selectedMember.promoted === true || selectedMember.tag === 'LSE') {
            console.warn('⚠️ Impossibile modificare idoneità: membro promosso');
            return;
        }

        if (selectedMember.orgValidation?.isValid === false) {
            console.warn('⚠️ Impossibile modificare idoneità: validazione fallita');
            return;
        }

        if (selectedMember.watchdog === true) {
            console.warn('⚠️ Impossibile modificare idoneità: "da tenere d\'occhio" è attivo');
            return;
        }

        const updatedMember = {
            ...selectedMember,
            idoneita: newValue,
            watchdog: newValue ? false : selectedMember.watchdog,
            orgValidation: selectedMember.orgValidation || null
        };

        try {
            await membersService.updateMember(selectedMember.key, updatedMember);
            onMemberUpdate(updatedMember);
        } catch (error) {
            console.error('❌ Errore nell\'aggiornamento idoneità:', error);
            throw error;
        }
    }, [selectedMember, onMemberUpdate]);

    // Funzione per gestire il toggle "da tenere d'occhio"
    const handleDaTenereDOcchioToggle = useCallback(async (newValue) => {
        if (!selectedMember) return;

        if (selectedMember.orgValidation?.isValid === false) {
            console.warn('⚠️ Impossibile modificare "da tenere d\'occhio": validazione fallita');
            return;
        }

        if (selectedMember.idoneita === true) {
            console.warn('⚠️ Impossibile modificare "da tenere d\'occhio": idoneità è attivo');
            return;
        }

        const updatedMember = {
            ...selectedMember,
            watchdog: newValue,
            idoneita: newValue ? false : selectedMember.idoneita,
            orgValidation: selectedMember.orgValidation || null
        };

        try {
            await membersService.updateMember(selectedMember.key, updatedMember);
            onMemberUpdate(updatedMember);
        } catch (error) {
            console.error('❌ Errore nell\'aggiornamento watchdog:', error);
            throw error;
        }
    }, [selectedMember, onMemberUpdate]);

    // Funzione per salvare le note
    const handleNoteSave = useCallback(async () => {
        if (!selectedMember) return;

        const updatedMember = {
            ...selectedMember,
            note: editedNote,
            orgValidation: selectedMember.orgValidation || null
        };

        try {
            await membersService.updateMember(selectedMember.key, updatedMember);
            onMemberUpdate(updatedMember);
        } catch (error) {
            console.error('❌ Errore nell\'aggiornamento note:', error);
            throw error;
        }
    }, [selectedMember, editedNote, onMemberUpdate]);

    // Funzione per gestire il cambio note
    const handleNoteInputChange = useCallback((newNote) => {
        setEditedNote(newNote);
    }, []);

    // Slider richiami (0..3, step 0.5)
    const handleRichiamiChange = useCallback(async (newValue) => {
        if (!selectedMember) return;
        const n = Number(newValue);
        const safe = Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : 0;

        // Regola: da 1 richiamo in su -> automaticamente "da tenere d'occhio"
        const shouldBeWatchdog = safe >= 1;

        const updatedMember = {
            ...selectedMember,
            richiami: safe,
            watchdog: shouldBeWatchdog ? true : selectedMember.watchdog,
            // Se watchdog viene attivato automaticamente, idoneità va disattivata per coerenza UI/regole esistenti
            idoneita: shouldBeWatchdog ? false : selectedMember.idoneita,
            orgValidation: selectedMember.orgValidation || null
        };

        try {
            await membersService.updateMember(selectedMember.key, updatedMember);
            onMemberUpdate(updatedMember);
        } catch (error) {
            console.error('❌ Errore nell\'aggiornamento richiami:', error);
            throw error;
        }
    }, [selectedMember, onMemberUpdate]);

    // Funzione per validare il membro
    const validateMember = useCallback(async () => {
        if (!selectedMember) return;

        setLoadingOrgValidation(true);
        try {
            const validatedMember = await membersService.validateMember(selectedMember.key);
            onMemberUpdate(validatedMember);
        } catch (error) {
            console.error('❌ Errore nella validazione:', error);
            throw error;
        } finally {
            setLoadingOrgValidation(false);
        }
    }, [selectedMember, onMemberUpdate]);

    // Funzione per resettare la validazione
    const resetValidation = useCallback(async () => {
        if (!selectedMember || !rsiApiUrl) return;

        try {
            // Recupera il token di autenticazione
            let authToken = null;
            try {
                authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            } catch {
                // Ignora errori
            }

            const headers = {
                'Content-Type': 'application/json',
            };
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            const response = await fetch(`${rsiApiUrl}/api/v1/members/${selectedMember.key}/reset-validation`, {
                method: 'PUT',
                headers,
            });

            if (!response.ok) {
                throw new Error('Errore nel reset della validazione');
            }

            const updatedMember = {
                ...selectedMember,
                affiliazioniOrg: '',
                orgValidation: null
            };
            onMemberUpdate(updatedMember);
        } catch (error) {
            console.error('❌ Errore nel reset validazione:', error);
            throw error;
        }
    }, [selectedMember, onMemberUpdate]);

    // Funzione per eliminare il membro
    const deleteMember = useCallback(async (deletionReasons = []) => {
        if (!selectedMember) return;

        try {
            if (deleteMemberFunction) {
                // Usa la funzione di eliminazione del context se disponibile
                const result = await deleteMemberFunction(selectedMember.key, deletionReasons);
                if (!result.success) {
                    throw new Error(result.error || 'Errore nell\'eliminazione');
                }
            } else {
                // Fallback al service diretto
                await membersService.deleteMember(selectedMember.key, deletionReasons);
            }
            return true;
        } catch (error) {
            console.error('❌ Errore nell\'eliminazione membro:', error);
            throw error;
        }
    }, [selectedMember, deleteMemberFunction]);

    // Funzione per promuovere/rimuovere promozione
    const togglePromotion = useCallback(async () => {
        if (!selectedMember) return;

        const isPromoted = selectedMember.promoted || selectedMember.tag === 'LSE';
        const updatedMember = {
            ...selectedMember,
            tag: isPromoted ? 'LSE-P' : 'LSE',
            promoted: !isPromoted,
            idoneita: isPromoted ? selectedMember.idoneita : true
        };

        try {
            await membersService.updateMember(selectedMember.key, updatedMember);
            onMemberUpdate(updatedMember);
            return isPromoted ? 'Membro rimosso dalla promozione' : 'Membro promosso a LSE con successo!';
        } catch (error) {
            console.error('❌ Errore nella promozione:', error);
            throw error;
        }
    }, [selectedMember, onMemberUpdate]);

    return {
        editedName,
        editedNote,
        loadingOrgValidation,
        handleNameChange,
        handleIdoneitaToggle,
        handleDaTenereDOcchioToggle,
        handleNoteInputChange,
        handleNoteSave,
        handleRichiamiChange,
        saveNameToDatabase,
        validateMember,
        resetValidation,
        deleteMember,
        togglePromotion,
    };
}
