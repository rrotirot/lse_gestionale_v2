import React from 'react';
import { Button } from "@/components/ui/button";

export default function MembersActions({ 
    onAddMember, 
    onCheckDb,
    onResetAllValidation,
    onValidateAll, 
    validatingAll = false, 
    validationProgress = { current: 0, total: 0 },
    validationEtaSeconds = null,
    checkingDb = false,
    resettingAllValidation = false,
    disabled = false 
}) {
    const total = Number(validationProgress?.total || 0);
    const current = Number(validationProgress?.current || 0);
    const progressPct = validatingAll && total > 0
        ? Math.max(0, Math.min(100, Math.round((current / total) * 100)))
        : 0;

    const formatEta = (secs) => {
        if (!Number.isFinite(secs) || secs === null) return null;
        const s = Math.max(0, Math.floor(secs));
        const mm = String(Math.floor(s / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        return `${mm}:${ss}`;
    };
    const etaLabel = formatEta(validationEtaSeconds);

    return (
        <div className="flex items-center justify-end gap-2 flex-wrap ui-float--subtle px-2 py-2 rounded-xl border border-white/10">
            <Button
                onClick={onAddMember}
                disabled={disabled}
                className="h-10 bg-green-600 hover:bg-green-700 text-white"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Aggiungi Membro
            </Button>
            <Button
                onClick={onCheckDb}
                disabled={checkingDb || disabled}
                variant="secondary"
                size="lg"
                className="h-10 px-3 ui-float--subtle border border-white/10 bg-transparent hover:bg-white/5"
                title="Controlla la presenza dei membri nel DB"
            >
                {checkingDb ? (
                    <>
                        <span className="animate-spin">⏳</span>
                        <span>Controllo DB...</span>
                    </>
                ) : (
                    <>
                        <span>🗄️</span>
                        <span>Controlla DB</span>
                    </>
                )}
            </Button>
            <Button
                onClick={onResetAllValidation}
                disabled={resettingAllValidation || disabled}
                variant="destructive"
                size="lg"
                className="h-10 px-3 ui-float--subtle border border-white/10 bg-transparent hover:bg-white/5"
                title="Resetta la validazione RSI per tutti i membri (temporaneo)"
            >
                {resettingAllValidation ? (
                    <>
                        <span className="animate-spin">⏳</span>
                        <span>Reset...</span>
                    </>
                ) : (
                    <>
                        <span>↺</span>
                        <span>Reset validazione (tutti)</span>
                    </>
                )}
            </Button>
            <Button
                onClick={onValidateAll}
                disabled={validatingAll || disabled}
                className="relative overflow-hidden h-10 px-3 ui-float--subtle border border-white/10 bg-transparent hover:bg-white/5 text-white"
                title="Valida tutti i membri senza validazione"
            >
                {validatingAll && (
                    <>
                        {/* progress background */}
                        <span
                            aria-hidden="true"
                            className="absolute inset-0 bg-black/10"
                        />
                        <span
                            aria-hidden="true"
                            className="absolute left-0 top-0 h-full bg-white/20 transition-[width] duration-200"
                            style={{ width: `${progressPct}%` }}
                        />
                        {/* subtle bottom bar */}
                        <span
                            aria-hidden="true"
                            className="absolute left-0 bottom-0 h-[3px] bg-white/60 transition-[width] duration-200"
                            style={{ width: `${progressPct}%` }}
                        />
                    </>
                )}
                {validatingAll ? (
                    <>
                        <span className="relative z-10 animate-spin">⏳</span>
                        <span className="relative z-10">
                            Validazione... {current}/{total} ({progressPct}%){etaLabel ? ` — ETA ${etaLabel}` : ''}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="relative z-10">✓</span>
                        <span className="relative z-10">Valida tutti</span>
                    </>
                )}
            </Button>
        </div>
    );
}

