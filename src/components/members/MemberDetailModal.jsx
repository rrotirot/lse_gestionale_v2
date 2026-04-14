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
        handleRichiamiChange,
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

    const issuesLen = Array.isArray(member.orgValidation?.issues) ? member.orgValidation.issues.length : 0;
    // Regola UI: se c'è anche solo 1 issue, la validazione è da considerarsi FALLITA.
    const hasValidationFailed = member.orgValidation?.isValid === false || issuesLen > 0;
    const hasValidationPassed = member.orgValidation?.isValid === true && issuesLen === 0;
    const isPromoted = member.promoted === true || member.tag === 'LSE';
    const canToggleIdoneita = !isPromoted && !hasValidationFailed && !member.watchdog;
    const canToggleWatchdog = !hasValidationFailed && !member.idoneita;
    
    // Verifica se ci sono problemi di validazione per abilitare l'eliminazione
    const hasValidationIssues = issuesLen > 0;
    const canDelete = hasValidationIssues;

    // Carica l'avatar Discord usando il bot tramite endpoint backend
    const { avatarUrl } = useDiscordAvatar(member.id, discordBotToken);

    const orgImageUrl = hasValidationPassed && member.orgValidation?.mainOrgImageUrl
        ? member.orgValidation.mainOrgImageUrl
        : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 !w-screen !max-w-none !h-screen !max-h-none !p-0 !flex !flex-col !gap-0 overflow-hidden border-0 bg-transparent rounded-none">
                <div className="relative w-full max-w-[1100px] mx-auto h-full flex flex-col ui-float bg-[#0b0f18]/90 border border-white/10 rounded-xl overflow-hidden my-3 sm:my-4">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition"
                        aria-label="Chiudi dettagli membro"
                        title="Chiudi"
                    >
                        <span className="text-xl leading-none">×</span>
                    </button>
                    <div className="px-4 sm:px-6 py-4 sm:py-5">
                        <DialogHeader>
                            <DialogTitle>Dettagli membro: {member.name}</DialogTitle>
                        </DialogHeader>
                    </div>

                {/* Body scrollabile per evitare zoom-out */}
                <div className="relative flex-1 overflow-y-auto px-4 sm:px-6 pr-1">
                    {/* Fade gradients (stacco scroll) */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none sticky top-0 z-20 h-5 -mt-1 bg-gradient-to-b from-[rgba(10,12,18,0.60)] via-[rgba(10,12,18,0.25)] to-transparent backdrop-blur-[2px]"
                    />
                    <div className="space-y-4">
                    {/* Header con avatar e info base */}
                    <div className="ui-float p-4">
                        <div className="flex items-start gap-4">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={member.name}
                                className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-300 dark:ring-gray-600"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-700 dark:text-gray-200">
                                {(member.name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                        )}
                        {orgImageUrl && (
                            <img
                                src={orgImageUrl}
                                alt="Organizzazione"
                                className="w-16 h-16 rounded-full object-cover ring-2 ring-cyan-500"
                            />
                        )}
                        <div className="flex-1">
                            <div className="mb-3">
                                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300/80 mb-1">
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
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 px-3 py-2">
                                    <div className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-400">ID Discord</div>
                                    <div className="mt-0.5 font-mono text-gray-900 dark:text-gray-100 break-all">{member.id || '—'}</div>
                                </div>
                                <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 px-3 py-2">
                                    <div className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-400">Tag</div>
                                    <div className="mt-0.5 font-semibold text-gray-900 dark:text-gray-100">{member.tag || 'LSE-P'}</div>
                                </div>
                                <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/40 px-3 py-2">
                                    <div className="text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-400">Stato</div>
                                    <div className="mt-0.5 font-semibold">
                                        {isPromoted ? (
                                            <span className="text-purple-600 dark:text-purple-300">Promosso</span>
                                        ) : member.watchdog ? (
                                            <span className="text-yellow-700 dark:text-yellow-300">Da tenere d'occhio</span>
                                        ) : member.idoneita ? (
                                            <span className="text-emerald-700 dark:text-emerald-300">Idoneo</span>
                                        ) : (
                                            <span className="text-gray-700 dark:text-gray-200">Standard</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {member.date && (
                                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Data ingresso Discord:</span>{' '}
                                    <span className="text-gray-700 dark:text-gray-200">{member.date}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    </div>

                    {/* Toggle Idoneità e Da tenere d'occhio */}
                    <div className="ui-float p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300/80 mb-3">
                            Stato membro
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`relative p-4 rounded-lg border bg-white/60 dark:bg-gray-800/40 overflow-hidden ${
                            !canToggleIdoneita
                                ? 'border-red-500/40 dark:border-red-500/35 bg-red-500/[0.03]'
                                : 'border-gray-200 dark:border-gray-700'
                        }`}>
                            {!canToggleIdoneita && (
                                <>
                                    <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(transparent_1px,rgba(239,68,68,0.08)_1px)] [background-size:10px_10px] opacity-40"
                                    />
                                </>
                            )}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Idoneità
                                    </label>
                                    {!canToggleIdoneita && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600/20 text-red-200 border border-red-500/30 px-2 py-0.5 text-[11px] font-bold tracking-wide">
                                            <span className="text-[12px] leading-none">⛔</span>
                                            BLOCCATO
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleIdoneitaToggle(!member.idoneita)}
                                    disabled={!canToggleIdoneita}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors overflow-hidden ${
                                        member.idoneita
                                            ? 'bg-green-500'
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    } ${!canToggleIdoneita ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
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

                        <div className={`relative p-4 rounded-lg border bg-white/60 dark:bg-gray-800/40 overflow-hidden ${
                            !canToggleWatchdog
                                ? 'border-red-500/40 dark:border-red-500/35 bg-red-500/[0.03]'
                                : 'border-gray-200 dark:border-gray-700'
                        }`}>
                            {!canToggleWatchdog && (
                                <>
                                    <div
                                        aria-hidden="true"
                                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(transparent_1px,rgba(239,68,68,0.08)_1px)] [background-size:10px_10px] opacity-40"
                                    />
                                </>
                            )}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Da tenere d'occhio
                                    </label>
                                    {!canToggleWatchdog && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600/20 text-red-200 border border-red-500/30 px-2 py-0.5 text-[11px] font-bold tracking-wide">
                                            <span className="text-[12px] leading-none">⛔</span>
                                            BLOCCATO
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDaTenereDOcchioToggle(!member.watchdog)}
                                    disabled={!canToggleWatchdog}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors overflow-hidden ${
                                        member.watchdog
                                            ? 'bg-yellow-500'
                                            : 'bg-gray-300 dark:bg-gray-600'
                                    } ${!canToggleWatchdog ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
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
                    </div>

                    {/* Richiami */}
                    <div className="ui-float p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300/80">
                                Richiami
                            </div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {Number.isFinite(Number(member.richiami)) ? Number(member.richiami).toFixed(1).replace('.0', '') : '0'}
                                <span className="text-xs font-normal text-gray-500 dark:text-gray-400"> / 3</span>
                            </div>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={3}
                            step={0.5}
                            value={Number.isFinite(Number(member.richiami)) ? Number(member.richiami) : 0}
                            onChange={(e) => handleRichiamiChange(e.target.value)}
                            className="w-full accent-amber-500"
                        />
                        <div className="mt-2 flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                            <span>0</span>
                            <span>1</span>
                            <span>2</span>
                            <span>3</span>
                        </div>
                    </div>

                    {/* Validazione organizzazioni RSI */}
                    <div className="p-4 ui-float">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300/80">
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
                        ) : (
                            <>
                                {/* UI stile screenshot */}
                                {(member.affiliazioniOrg || member.orgValidation) ? (
                                    <div className="mt-2">
                                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                            Affiliazioni Org Star Citizen:
                                        </div>

                                        <div
                                            className={[
                                                "rounded-md border p-4",
                                                "bg-[#140f1c] text-gray-100",
                                                "shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]",
                                                hasValidationFailed ? "border-red-600/70" : hasValidationPassed ? "border-emerald-500/70" : "border-gray-700/60"
                                            ].join(" ")}
                                        >
                                            {/* Header */}
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <div className="text-[11px] uppercase tracking-wide text-gray-300/80">
                                                        Affiliazioni rilevate
                                                    </div>
                                                    <div className="mt-1">
                                                        {(() => {
                                                            // 1) Preferisci orgs[] (con url) se presenti
                                                            const orgs = Array.isArray(member.orgValidation?.orgs) ? member.orgValidation.orgs : [];
                                                            const fromOrgs = orgs
                                                                .map(o => ({
                                                                    name: String(o?.name || '').trim(),
                                                                    handle: String(o?.handle || '').trim(),
                                                                    url: String(o?.url || '').trim(),
                                                                    sid: String(o?.sid || '').trim(),
                                                                }))
                                                                // se manca il nome, mostriamo comunque qualcosa (fallback su SID)
                                                                .map(o => ({
                                                                    ...o,
                                                                    name: o.name || (o.handle && !String(o.handle).startsWith('spectrum:') ? o.handle : ''),
                                                                }))
                                                                .filter(o => o.name);

                                                            // 2) Fallback: costruisci dai nomi in orgs_string / affiliazioniOrg (separati da virgola)
                                                            // Fallback: senza SID non possiamo costruire URL affidabili.
                                                            // In quel caso mostriamo solo testo non-link.
                                                            const raw = String(member.orgValidation?.orgs_string || member.affiliazioniOrg || '').trim();
                                                            const fromString = raw
                                                                ? raw.split(',').map(s => s.trim()).filter(Boolean).map((name) => {
                                                                    const norm = name.toLowerCase().replace(/\s+/g, ' ').trim();

                                                                    // Prova a trovare l'org corrispondente in orgValidation.orgs (per ricavare SID/URL)
                                                                    const match = fromOrgs.find(o => String(o.name || '').toLowerCase().replace(/\s+/g, ' ').trim() === norm);

                                                                    // Fallback: se coincide con la main org e abbiamo SID mainOrgHandle
                                                                    const mainName = String(member.orgValidation?.mainOrgName || '').trim();
                                                                    const mainHandle = String(member.orgValidation?.mainOrgHandle || '').trim();
                                                                    const mainNorm = mainName.toLowerCase().replace(/\s+/g, ' ').trim();
                                                                    const handleFromMain = (mainHandle && mainNorm && norm === mainNorm) ? mainHandle : '';

                                                                    return {
                                                                        name,
                                                                        handle: match?.handle || handleFromMain || '',
                                                                        sid: match?.sid || (match?.handle && !String(match.handle).startsWith('spectrum:') ? String(match.handle) : '') || '',
                                                                        url: match?.url || '',
                                                                    };
                                                                })
                                                                : [];

                                                            const links = fromOrgs.length > 0 ? fromOrgs : fromString;

                                                            if (links.length === 0) {
                                                                return (
                                                                    <div className="text-sm font-semibold text-gray-100 break-words">
                                                                        —
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {links.map((o, idx) => {
                                                                        const rawUrl = String(o.url || '').trim();
                                                                        const handle = String(o.handle || '').trim();
                                                                        const sidRaw = String(o.sid || '').trim();

                                                                        const sidCandidate = (sidRaw && !sidRaw.startsWith('spectrum:') && sidRaw !== 'MAIN')
                                                                            ? sidRaw
                                                                            : '';

                                                                        // Link:
                                                                        // - se abbiamo SID estratto: usa /en/orgs/<SID>
                                                                        // - altrimenti usa l'url già fornito dal backend (può essere /en/orgs/<handle> o spectrum)
                                                                        const url = sidCandidate
                                                                            ? `https://robertsspaceindustries.com/en/orgs/${encodeURIComponent(sidCandidate)}`
                                                                            : (rawUrl || '');

                                                                        const cls = "inline-flex items-center rounded-full border border-white/20 bg-transparent px-3 py-1 text-sm font-semibold text-gray-100 relative z-10";
                                                                        // Mostra SEMPRE il SID se disponibile, altrimenti fallback al nome
                                                                        const label = sidCandidate || String(o.sid || '').trim() || o.name;

                                                                        if (!url) {
                                                                            return (
                                                                                <span
                                                                                    key={`${o.handle || o.name}-${idx}`}
                                                                                    className={`${cls} opacity-80`}
                                                                                    title="SID non disponibile per creare il link"
                                                                                >
                                                                                    <span className="truncate max-w-[18rem]">{label}</span>
                                                                                </span>
                                                                            );
                                                                        }

                                                                        return (
                                                                            <a
                                                                                key={`${o.handle || o.name}-${idx}`}
                                                                                href={url}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className={`pointer-events-auto ${cls} cursor-pointer hover:border-white/40 hover:bg-white/5 transition-colors`}
                                                                                title="Apri organizzazione su RSI"
                                                                            >
                                                                                <span className="truncate max-w-[18rem]">{label}</span>
                                                                            </a>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>

                                                <div className="shrink-0">
                                                    {hasValidationPassed ? (
                                                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-3 py-1 text-xs font-semibold">
                                                            <span className="text-base leading-none">✓</span>
                                                            Validazione OK
                                                        </span>
                                                    ) : hasValidationFailed ? (
                                                        <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 px-3 py-1 text-xs font-semibold">
                                                            <span className="text-base leading-none">✕</span>
                                                            Validazione fallita
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 rounded-full bg-gray-500/10 text-gray-200 border border-gray-500/20 px-3 py-1 text-xs font-semibold">
                                                            <span className="text-base leading-none">—</span>
                                                            Non validato
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quick facts */}
                                            {member.orgValidation && (
                                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <div className="rounded-md border border-white/5 bg-white/5 px-3 py-2">
                                                        <div className="text-[11px] text-gray-300/80">Main org</div>
                                                        <div className="mt-0.5 flex items-start justify-between gap-2">
                                                            <div className="text-sm font-semibold text-gray-100 break-words">
                                                                {member.orgValidation.mainOrgName || '—'}
                                                            </div>
                                                            {member.orgValidation?.mainOrgUrl && (
                                                                <a
                                                                    href={member.orgValidation.mainOrgUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="shrink-0 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 underline underline-offset-2"
                                                                    title="Apri la main org su RSI"
                                                                >
                                                                    Apri
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-md border border-white/5 bg-white/5 px-3 py-2">
                                                        <div className="text-[11px] text-gray-300/80">Solo 1 org</div>
                                                        <div className="mt-0.5 text-sm font-semibold">
                                                            {typeof member.orgValidation.hasOnlyOneOrg === 'boolean' ? (
                                                                <span className={member.orgValidation.hasOnlyOneOrg ? 'text-emerald-300' : 'text-red-300'}>
                                                                    {member.orgValidation.hasOnlyOneOrg ? 'Sì' : 'No'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-100">—</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-md border border-white/5 bg-white/5 px-3 py-2">
                                                        <div className="text-[11px] text-gray-300/80">Main org corretta</div>
                                                        <div className="mt-0.5 text-sm font-semibold">
                                                            {typeof member.orgValidation.hasMainName === 'boolean' ? (
                                                                <span className={member.orgValidation.hasMainName ? 'text-emerald-300' : 'text-red-300'}>
                                                                    {member.orgValidation.hasMainName ? 'Sì' : 'No'}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-100">—</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {member.orgValidation?.issues && member.orgValidation.issues.length > 0 && (
                                                <div className="mt-4 rounded-md border border-red-500/25 bg-red-500/10 p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-xs font-semibold text-red-200">
                                                            Problemi rilevati
                                                        </div>
                                                        <div className="text-[11px] text-red-200/80">
                                                            {member.orgValidation.issues.length} issue
                                                        </div>
                                                    </div>
                                                    <ul className="mt-2 space-y-1 text-xs text-gray-100">
                                                        {member.orgValidation.issues.map((issue, idx) => (
                                                            <li key={idx} className="flex gap-2">
                                                                <span className="mt-[2px] text-red-300">•</span>
                                                                <span className="leading-relaxed">{issue}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Hint */}
                                            {hasValidationFailed && (
                                                <div className="mt-3 text-[11px] text-gray-300/90">
                                                    Suggerimento: correggi la main org su RSI oppure assicurati di avere una sola organizzazione.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Nessuna validazione disponibile
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Note */}
                    <div className="p-4 ui-float">
                        <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300/80 mb-2">
                            Note
                        </label>
                        <textarea
                            value={editedNote}
                            onChange={(e) => handleNoteInputChange(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, handleNoteSave)}
                            placeholder="Aggiungi note per questo membro..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[88px] leading-relaxed"
                        />
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Enter per salvare, Shift+Enter per andare a capo
                            </p>
                            <button
                                onClick={handleNoteSave}
                                className="px-3 py-1.5 text-xs bg-gray-700 dark:bg-gray-600 text-white rounded hover:bg-gray-800 dark:hover:bg-gray-700 self-start sm:self-auto"
                                title="Salva note"
                            >
                                Salva note
                            </button>
                        </div>
                    </div>

                        {/* Spazio per footer sticky */}
                        <div className="h-0" />
                    </div>
                    <div
                        aria-hidden="true"
                        className="pointer-events-none sticky bottom-0 z-20 h-8 bg-gradient-to-t from-[rgba(10,12,18,0.65)] via-[rgba(10,12,18,0.28)] to-transparent backdrop-blur-[2px]"
                    />
                </div>

                {/* Footer sticky (semi-trasparente per effetto meno "staccato") */}
                <div className="relative pt-2 ui-float--subtle flex flex-wrap gap-2 items-center px-4 sm:px-6 pb-3 overflow-hidden">
                    {/* soft separator instead of hard border */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute left-0 top-0 h-[1px] w-full bg-gradient-to-r from-transparent via-white/12 to-transparent"
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute left-0 top-0 h-6 w-full bg-gradient-to-b from-white/6 to-transparent"
                    />
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
