import { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMemberDetail } from '../../hooks/useMemberDetail';
import { useDiscordAvatar } from '../../hooks/useDiscordAvatar';
import DeleteMemberDialog from './DeleteMemberDialog';

export default function MemberDetailModal({
    member,
    open,
    onOpenChange,
    discordBotToken,
    onMemberUpdate,
    deleteMemberFunction
}) {
    if (!member) return null;

    const {
        editedName,
        editedNote,
        loadingOrgValidation,
        handleNameChange,
        handleIdoneitaToggle,
        handleDaTenereDOcchioToggle,
        handleNoteInputChange,
        handleNoteSave,
        validateMember,
        resetValidation,
        deleteMember,
        togglePromotion,
    } = useMemberDetail(member, onMemberUpdate, deleteMemberFunction);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const handleDeleteClick = useCallback(() => {
        setShowDeleteDialog(true);
    }, []);

    const handleDeleteConfirm = useCallback(async (selectedReasons) => {
        try {
            await deleteMember(selectedReasons);
            onOpenChange(false);
        } catch (error) {
            alert(`Errore nell'eliminazione: ${error.message}`);
        }
    }, [deleteMember, onOpenChange]);

    const handlePromote = useCallback(async () => {
        if (!member.idoneita) {
            alert('Il membro deve essere idoneo per essere promosso a LSE.');
            return;
        }

        if (!confirm(`Sei sicuro di voler promuovere "${member.name}" a LSE?\n\nIl membro verrà nascosto dalla lista principale e l'idoneità sarà bloccata.`)) {
            return;
        }

        try {
            const message = await togglePromotion();
            alert(message);
        } catch (error) {
            alert(`Errore nella promozione: ${error.message}`);
        }
    }, [member, togglePromotion]);

    const handleKeyDown = useCallback((e, action) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            action();
        }
    }, []);

    const hasValidationFailed = member.orgValidation?.isValid === false;
    const hasValidationPassed = member.orgValidation?.isValid === true;
    const isPromoted = member.promoted === true || member.tag === 'LSE';
    const canToggleIdoneita = !isPromoted && !hasValidationFailed && !member.watchdog;
    const canToggleWatchdog = !hasValidationFailed && !member.idoneita;
    
    // Verifica se ci sono problemi di validazione per abilitare l'eliminazione
    const hasValidationIssues = member.orgValidation?.issues && member.orgValidation.issues.length > 0;
    const canDelete = hasValidationIssues;

    // Carica l'avatar Discord usando il bot tramite endpoint backend
    const { avatarUrl } = useDiscordAvatar(member.id, discordBotToken);

    const orgImageUrl = hasValidationPassed && member.orgValidation?.mainOrgImageUrl
        ? member.orgValidation.mainOrgImageUrl
        : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[874px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Dettagli membro: {member.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header con avatar e info base */}
                    <div className="flex items-start gap-4">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={member.name}
                                className="w-20 h-20 rounded-full object-cover ring-2 ring-gray-300 dark:ring-gray-600"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-700 dark:text-gray-200">
                                {(member.name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                        )}
                        {orgImageUrl && (
                            <img
                                src={orgImageUrl}
                                alt="Organizzazione"
                                className="w-20 h-20 rounded-full object-cover ring-2 ring-cyan-500"
                            />
                        )}
                        <div className="flex-1">
                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nome (modificabile)
                                </label>
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.target.blur();
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600 dark:text-gray-400">ID Discord:</span>
                                    <span className="ml-2 font-mono text-gray-900 dark:text-gray-100">{member.id || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600 dark:text-gray-400">Tag:</span>
                                    <span className="ml-2 text-gray-900 dark:text-gray-100">{member.tag || 'LSE-P'}</span>
                                </div>
                                {member.date && (
                                    <div className="col-span-2">
                                        <span className="text-gray-600 dark:text-gray-400">Data ingresso Discord:</span>
                                        <span className="ml-2 text-gray-900 dark:text-gray-100">{member.date}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Toggle Idoneità e Da tenere d'occhio */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Idoneità
                                </label>
                                <button
                                    onClick={() => handleIdoneitaToggle(!member.idoneita)}
                                    disabled={!canToggleIdoneita}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        member.idoneita
                                            ? 'bg-green-500'
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    } ${!canToggleIdoneita ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            member.idoneita ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            {!canToggleIdoneita && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {isPromoted && 'Bloccato: membro promosso'}
                                    {hasValidationFailed && !isPromoted && 'Bloccato: validazione fallita'}
                                    {member.watchdog && !isPromoted && !hasValidationFailed && 'Bloccato: "da tenere d\'occhio" attivo'}
                                </p>
                            )}
                        </div>

                        <div className="p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Da tenere d'occhio
                                </label>
                                <button
                                    onClick={() => handleDaTenereDOcchioToggle(!member.watchdog)}
                                    disabled={!canToggleWatchdog}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        member.watchdog
                                            ? 'bg-yellow-500'
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    } ${!canToggleWatchdog ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            member.watchdog ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            {!canToggleWatchdog && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {hasValidationFailed && 'Bloccato: validazione fallita'}
                                    {member.idoneita && !hasValidationFailed && 'Bloccato: idoneità attiva'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Validazione organizzazioni RSI */}
                    <div className="p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Validazione organizzazioni RSI
                            </h3>
                            <div className="flex gap-2">
                                {!hasValidationPassed && (
                                    <button
                                        onClick={validateMember}
                                        disabled={loadingOrgValidation}
                                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                    >
                                        {loadingOrgValidation ? 'Validazione...' : 'Valida'}
                                    </button>
                                )}
                                {member.orgValidation && (
                                    <button
                                        onClick={resetValidation}
                                        className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                        Resetta Validazione
                                    </button>
                                )}
                            </div>
                        </div>
                        {loadingOrgValidation ? (
                            <div className="text-center py-4">
                                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Validazione in corso...</p>
                            </div>
                        ) : hasValidationPassed ? (
                            <div className="text-sm text-green-600 dark:text-green-400">
                                ✓ Validazione superata
                                {member.orgValidation?.mainOrgName && (
                                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                                        Organizzazione: {member.orgValidation.mainOrgName}
                                    </p>
                                )}
                            </div>
                        ) : hasValidationFailed ? (
                            <div className="text-sm text-red-600 dark:text-red-400">
                                ✕ Validazione fallita
                                {member.orgValidation?.issues && member.orgValidation.issues.length > 0 && (
                                    <ul className="mt-2 list-disc list-inside text-xs text-gray-600 dark:text-gray-400">
                                        {member.orgValidation.issues.map((issue, idx) => (
                                            <li key={idx}>{issue}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Nessuna validazione disponibile
                            </div>
                        )}
                        {member.affiliazioniOrg && (
                            <details className="mt-3">
                                <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                                    Mostra affiliazioni org
                                </summary>
                                <pre className="mt-2 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                    {member.affiliazioniOrg}
                                </pre>
                            </details>
                        )}
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Note
                        </label>
                        <textarea
                            value={editedNote}
                            onChange={(e) => handleNoteInputChange(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, handleNoteSave)}
                            placeholder="Aggiungi note per questo membro..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[100px]"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Premere Enter per salvare (Shift+Enter per andare a capo)
                        </p>
                    </div>

                    {/* Azioni */}
                    <div className="flex gap-2 pt-4 border-t border-gray-300 dark:border-gray-600">
                        {member.idoneita && !isPromoted && (
                            <button
                                onClick={handlePromote}
                                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                            >
                                Promuovi a LSE
                            </button>
                        )}
                        {isPromoted && (
                            <button
                                onClick={handlePromote}
                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                                Rimuovi da LSE
                            </button>
                        )}
                        <button
                            onClick={handleDeleteClick}
                            disabled={!canDelete}
                            className={`px-4 py-2 bg-red-500 text-white rounded shadow-md hover:bg-red-600 hover:shadow-lg transition-all duration-200 ml-auto ${
                                !canDelete ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            title={!canDelete ? 'Il membro deve avere almeno un problema di validazione per essere eliminato' : ''}
                        >
                            Elimina Membro
                        </button>
                    </div>
                </div>
            </DialogContent>

            {/* Dialog per selezione motivazioni eliminazione */}
            <DeleteMemberDialog
                member={member}
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={handleDeleteConfirm}
            />
        </Dialog>
    );
}
