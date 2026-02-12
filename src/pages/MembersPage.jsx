import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMembersContext } from '../context/MembersContext';
import Header from '../components/layout/Header';
import MembersActions from '../components/members/MembersActions';
import MemberList from '../components/members/MemberList';
import MemberDetailModal from '../components/members/MemberDetailModal';
import AddMemberModal from '../components/members/AddMemberModal';
import MembersHelpModal from '../components/members/MembersHelpModal';
import MembersSearch from '../components/members/MembersSearch';
import MembersFilters from '../components/members/MembersFilters';
import DeletedMemberItem from '../components/members/DeletedMemberItem';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { membersService } from '../services/membersService';

const rsiApiUrl = import.meta.env.VITE_RSI_API_URL

export default function MembersPage({ onNavigateToHome }) {
    const { user, isUserVerified, logout, updateUser } = useAuth();
    const {
        members,
        filtered,
        loading,
        error,
        selectedMember,
        setSelectedMember,
        query,
        setQuery,
        filterValue,
        handleFilterChange,
        filterOptions,
        refreshMembers,
        showDeletedMembers,
        setShowDeletedMembers,
        deletedMembers,
        loadingDeletedMembers,
        loadDeletedMembers,
        discordBotToken,
        addMember,
        updateMember,
        deleteMember,
        resetFilters,
        selectedTag,
    } = useMembersContext();

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
        note: '',
        importFile: null
    });
    const [validatingAll, setValidatingAll] = useState(false);
    const validationProgress = useRef({ current: 0, total: 0 });
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);

    // Carica i membri quando la pagina viene montata
    useEffect(() => {
        refreshMembers();  // subito, dà feedback veloce all'utente

        const intervalId = setInterval(refreshMembers, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, []);
    
    // Imposta il filtro iniziale se presente
    useEffect(() => {
        const tag = sessionStorage.getItem('memberFilterTag');
        if (tag) {
            handleFilterChange(tag);
            sessionStorage.removeItem('memberFilterTag');
        }
    }, [handleFilterChange]);

    // Resetta i filtri quando la pagina viene chiusa
    useEffect(() => {
        return () => {
            resetFilters();
        };
    }, [resetFilters]);

    // Verifica che l'utente sia verificato
    useEffect(() => {
        if (!isUserVerified()) {
            // Potrebbe essere gestito meglio con un redirect
            console.warn('Utente non verificato, accesso negato');
        }
    }, [isUserVerified]);

    // Mostra il pulsante back to top quando scrollato oltre il 25%
    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY;
            const threshold = window.innerHeight * 0.25;
            setShowBackToTop(scrolled > threshold);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Funzione per gestire l'aggiunta di un membro
    const handleAddMember = async () => {
        // Se è presente un file, importa da file
        if (newMember.importFile) {
            try {
                const result = await membersService.uploadMembersFile(newMember.importFile);

                if (result.success) {
                    alert(`Importazione completata: ${result.message}`);
                    setShowAddMemberModal(false);
                } else {
                    alert(`Errore nell'importazione: ${result.error}`);
                }
            } catch (error) {
                alert(`Errore nell'importazione: ${error.message}`);
            }
            return;
        }

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

        const result = await addMember(memberToSave);
        if (result.success) {
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
        } else {
            alert(`Errore nell'aggiunta membro: ${result.error}`);
        }
    };

    // Funzione per validare tutti i membri
    const handleValidateAll = async () => {
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
        setTimeout(() => refreshMembers(), 300);
    };

    if (!isUserVerified()) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <Header
                    user={user}
                    onLogout={logout}
                    onUpdateUser={updateUser}
                    onNavigateToHome={onNavigateToHome}
                    showHomeButton={true}
                />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                            Accesso Negato
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Devi verificare il tuo account RSI con rank organizzazione &gt;= 4 per accedere alla gestione membri.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
            <Header
                user={user}
                onLogout={logout}
                onUpdateUser={updateUser}
                onNavigateToHome={onNavigateToHome}
                showHomeButton={true}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Loading o Error */}
                {loading && filtered.length === 0 && (
                    <LoadingSpinner message="Caricamento membri..." />
                )}

                {error && filtered.length === 0 && (
                    <ErrorMessage
                        error={error}
                        onRetry={refreshMembers}
                    />
                )}

                {/* Azioni */}
                {!loading && (
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="max-w-[42rem] flex-1">
                                <MembersSearch
                                    value={query}
                                    onChange={setQuery}
                                    placeholder="Cerca membri..."
                                />
                            </div>
                            <div className="max-w-xs">
                                <MembersFilters
                                    filterValue={filterValue}
                                    onFilterChange={handleFilterChange}
                                    filterOptions={filterOptions}
                                />
                            </div>
                        </div>
                        <MembersActions
                            onAddMember={() => setShowAddMemberModal(true)}
                            onValidateAll={handleValidateAll}
                            validatingAll={validatingAll}
                            validationProgress={validationProgress.current}
                            disabled={loading}
                        />
                    </div>
                )}

                {/* Lista membri */}
                {!loading && !error && (
                    <>
                        {/* Membri LSE-P */}
                        {(() => {
                            const lsePFiltered = selectedTag === 'Tutti' ? filtered.filter(m => m.tag === 'LSE-P') : selectedTag === 'LSE-P' ? filtered : [];
                            return lsePFiltered.length > 0 && (
                                <div className="mb-8">
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                                        Membri LSE-P ({lsePFiltered.length})
                                    </h4>
                                    <MemberList
                                        members={lsePFiltered}
                                        onMemberSelect={setSelectedMember}
                                        discordBotToken={discordBotToken}
                                    />
                                </div>
                            );
                        })()}

                        {/* Membri LSE */}
                        {(() => {
                            const lseFiltered = selectedTag === 'Tutti' ? filtered.filter(m => m.tag === 'LSE') : selectedTag === 'LSE' ? filtered : [];
                            return lseFiltered.length > 0 && (
                                <div className="mb-8">
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                        Membri LSE ({lseFiltered.length})
                                    </h4>
                                    <MemberList
                                        members={lseFiltered}
                                        onMemberSelect={setSelectedMember}
                                        discordBotToken={discordBotToken}
                                    />
                                </div>
                            );
                        })()}

                        {/* Se non ci sono membri filtrati */}
                        {filtered.length === 0 && (
                            <EmptyState
                                title="Nessun membro trovato"
                                message="Non ci sono membri che corrispondono ai filtri selezionati."
                            />
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <MemberDetailModal
                member={selectedMember}
                open={!!selectedMember}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedMember(null);
                        refreshMembers();
                    }
                }}
                discordBotToken={discordBotToken}
                onMemberUpdate={(updatedMember) => {
                    setSelectedMember(updatedMember);
                    updateMember(updatedMember.key? updatedMember.key : updatedMember.member.key, updatedMember);
                }}
                deleteMemberFunction={deleteMember}
            />

            <AddMemberModal
                open={showAddMemberModal}
                onOpenChange={setShowAddMemberModal}
                newMember={newMember}
                setNewMember={setNewMember}
                onSave={handleAddMember}
            />

            <MembersHelpModal
                open={showHelpModal}
                onOpenChange={setShowHelpModal}
            />

            {/* Bottone floating per membri eliminati */}
            <button
                onClick={() => {
                    console.log('🖱️ Click su pulsante membri eliminati');
                    setShowDeletedMembers(true);
                }}
                className="fixed bottom-6 right-20 w-10 h-10 bg-red-600 dark:bg-red-500 rounded-full shadow-lg hover:bg-red-700 dark:hover:bg-red-600 transition-all duration-200 flex items-center justify-center z-30 hover:scale-110 ring-4 ring-red-300 dark:ring-red-700 ring-opacity-50"
                title="Membri eliminati"
            >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>

            {/* Bottone floating per help/legenda */}
            <button
                onClick={() => setShowHelpModal(true)}
                className="fixed bottom-6 right-6 w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 flex items-center justify-center z-30 hover:scale-110 ring-4 ring-blue-300 dark:ring-blue-700 ring-opacity-50"
                title="Legenda e comandi"
            >
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
                </svg>
            </button>

            {/* Dialog per i membri eliminati */}
            <Dialog open={showDeletedMembers} onOpenChange={setShowDeletedMembers}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Membri Eliminati ({deletedMembers.length})</DialogTitle>
                    </DialogHeader>

                    <div className="p-6">
                        {loadingDeletedMembers ? (
                            <LoadingSpinner message="Caricamento membri eliminati..." />
                        ) : deletedMembers.length === 0 ? (
                            <EmptyState
                                title="Nessun membro eliminato"
                                message="Non ci sono membri eliminati nel database."
                            />
                        ) : (
                            <div className="space-y-4">
                                {deletedMembers.map((member) => (
                                    <DeletedMemberItem
                                        key={member._id || member.key}
                                        member={member}
                                        discordBotToken={discordBotToken}
                                        onRestore={async () => {
                                            if (!confirm(`Sei sicuro di voler ripristinare il membro "${member.name}"?\n\nIl membro verrà riportato nella lista principale.`)) {
                                                return;
                                            }

                                            try {
                                                const response = await fetch(`${rsiApiUrl}/api/v1/deleted-members/${member.key}/restore`, {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`
                                                    },
                                                });

                                                if (response.ok) {
                                                    const data = await response.json();
                                                    console.log('✅ Membro ripristinato:', data);
                                                    alert('Membro ripristinato con successo!');
                                                    await loadDeletedMembers();
                                                    setTimeout(() => {
                                                        refreshMembers();
                                                    }, 500);
                                                } else {
                                                    let errorMessage = 'Errore sconosciuto';
                                                    try {
                                                        const errorData = await response.json();
                                                        errorMessage = errorData.error || errorData.message || response.statusText;
                                                    } catch (parseError) {
                                                        errorMessage = `Errore HTTP ${response.status}: ${response.statusText}`;
                                                    }
                                                    alert(`Errore nel ripristino: ${errorMessage}`);
                                                }
                                            } catch (error) {
                                                console.error('Errore nel ripristino membro:', error);
                                                alert(`Errore nel ripristino: ${error.message}`);
                                            }
                                        }}
                                        authToken={localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}
                                        onRefresh={refreshMembers}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Back to Top Button */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`fixed left-4 bottom-4 z-50 bg-indigo-600 dark:bg-indigo-500 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all duration-300 ${showBackToTop ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                aria-label="Torna in alto"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
            </button>
        </div>
    );
}
