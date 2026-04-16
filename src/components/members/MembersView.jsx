import React, { useState, useEffect, useRef } from 'react';
import { useMembers } from '../../hooks/useMembers';
import MemberList from './MemberList';
import AddMemberModal from './AddMemberModal';
import { membersService } from '../../services/membersService';
import { getApiBaseUrl } from '../../lib/runtime-config';

export default function MembersView({ 
    discordBotToken,
    onMemberSelect,
    members = [],
    filtered = [],
    onRefresh
}) {
    const rsiApiUrl = getApiBaseUrl();
    const { loading, error, addMember } = useMembers();

    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [newMember, setNewMember] = useState({
        name: '',
        id: '',
        tag: 'LSE-P',
        index: '',
        date: '',
        idoneita: false,
        watchdog: false,
        promoted: false,
        note: ''
    });
    const [validatingAll, setValidatingAll] = useState(false);
    const validationProgress = useRef({ current: 0, total: 0 });
    const [avatarCache, setAvatarCache] = useState({});

    // Non carica i membri qui, vengono passati come props

    // Funzione per gestire l'aggiunta di un membro
    const handleAddMember = async () => {
        // Gestisci importazione da file se presente
        if (newMember.importFile) {
            const formData = new FormData();
            formData.append('file', newMember.importFile);

            try {
                const response = await fetch(`${rsiApiUrl}/api/v1/members/import`, {
                    method: 'POST',
                    body: formData,
                });

                let result;
                try {
                    result = await response.json();
                } catch (e) {
                    throw new Error(`Errore nell'importazione: risposta non valida dal server (${response.status})`);
                }

                if (result.success) {
                    let message = `Importazione completata: ${result.message}`;
                    if (result.errors && result.errors.length > 0) {
                        message += `\nErrori: ${result.errors.map(e => e.error).join(', ')}`;
                    }
                    alert(message);
                    setNewMember({
                        name: '',
                        id: '',
                        tag: 'LSE-P',
                        index: '',
                        date: '',
                        idoneita: false,
                        watchdog: false,
                        promoted: false,
                        note: '',
                        importFile: null
                    });
                    setShowAddMemberModal(false);
                    if (onRefresh) {
                        setTimeout(() => onRefresh(), 300);
                    }
                } else {
                    alert(`Errore nell'importazione: ${result.error}`);
                }
                } catch (err) {
                    console.error('Import error:', err);
                    alert(`Errore nell'importazione: ${err.message}`);
                }
            return;
        }

        // Gestisci aggiunta singolo membro
        if (!newMember.name.trim()) {
            alert('Il nome è obbligatorio');
            return;
        }

        const maxKey = members.length > 0 
            ? Math.max(...members.map(m => m.key || 0))
            : 0;
        const newKey = maxKey + 1;

        const memberToSave = {
            key: newKey,
            name: newMember.name.trim(),
            id: newMember.id.trim() || '',
            tag: newMember.tag || 'LSE-P',
            index: newMember.index.trim() || '',
            date: newMember.date.trim() || '',
            idoneita: newMember.idoneita || false,
            watchdog: newMember.watchdog || false,
            promoted: newMember.promoted || false,
            note: newMember.note.trim() || '',
            affiliazioniOrg: '',
            orgValidation: null
        };

        try {
            await addMember(memberToSave);
            setNewMember({
                name: '',
                id: '',
                tag: 'LSE-P',
                index: '',
                date: '',
                idoneita: false,
                watchdog: false,
                promoted: false,
                note: ''
            });
            setShowAddMemberModal(false);
            if (onRefresh) {
                setTimeout(() => onRefresh(), 300);
            }
        } catch (err) {
            alert(`Errore nell'aggiunta membro: ${err.message}`);
        }
    };

    // Funzione per validare tutti i membri
    const validateAllMembers = async () => {
        const membersToValidate = members.filter(m => !m.orgValidation);
        if (membersToValidate.length === 0) {
            alert('Nessun membro da validare');
            return;
        }

        setValidatingAll(true);
        validationProgress.current = { current: 0, total: membersToValidate.length };

        for (let i = 0; i < membersToValidate.length; i++) {
            const member = membersToValidate[i];
            validationProgress.current.current = i + 1;
            
            try {
                await membersService.validateMember(member.key);
            } catch (err) {
                console.error(`Errore nella validazione di ${member.name}:`, err);
            }
        }

        setValidatingAll(false);
        if (onRefresh) {
            setTimeout(() => onRefresh(), 300);
        }
    };

    // discordBotToken viene passato direttamente a MemberCard

    if (loading && filtered.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400">Caricamento membri...</p>
                </div>
            </div>
        );
    }

    if (error && filtered.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 dark:text-red-400 mb-4">Errore: {error}</p>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Riprova
                    </button>
                )}
            </div>
        );
    }

    return (
        <>
            {/* Pulsanti di azione */}
            <div className="flex items-center justify-end gap-2 mb-4">
                <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded text-sm shadow-md hover:bg-green-700 dark:hover:bg-green-600 hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Aggiungi Membro
                </button>
                <button
                    onClick={validateAllMembers}
                    disabled={validatingAll || filtered.length === 0}
                    className="px-3 py-2 rounded text-sm bg-blue-500 dark:bg-blue-600 text-white border-blue-600 dark:border-blue-700 shadow-md hover:bg-blue-600 dark:hover:bg-blue-700 hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Valida tutti i membri senza validazione"
                >
                    {validatingAll ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            <span>Validazione... {validationProgress.current.current}/{validationProgress.current.total}</span>
                        </>
                    ) : (
                        <>
                            <span>✓</span>
                            <span>Valida tutti</span>
                        </>
                    )}
                </button>
            </div>

            {/* Lista membri */}
            <MemberList
                members={filtered}
                onMemberSelect={onMemberSelect}
                discordBotToken={discordBotToken}
            />

            {/* Modal aggiungi membro */}
            <AddMemberModal
                open={showAddMemberModal}
                onOpenChange={setShowAddMemberModal}
                newMember={newMember}
                setNewMember={setNewMember}
                onSave={handleAddMember}
            />
        </>
    );
}
