import React from 'react';

export default function MembersActions({ 
    onAddMember, 
    onCheckDb,
    onValidateAll, 
    validatingAll = false, 
    validationProgress = { current: 0, total: 0 },
    checkingDb = false,
    disabled = false 
}) {
    return (
        <div className="flex items-center justify-end gap-2">
            <button
                onClick={onAddMember}
                disabled={disabled}
                className="h-10 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded text-sm border-2 border-green-700 dark:border-green-600 hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Aggiungi Membro
            </button>
            <button
                onClick={onCheckDb}
                disabled={checkingDb || disabled}
                className="h-10 px-3 py-2 rounded text-sm bg-slate-700 dark:bg-slate-600 text-white border-slate-800 dark:border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </button>
            <button
                onClick={onValidateAll}
                disabled={validatingAll || disabled}
                className="h-10 px-3 py-2 rounded text-sm bg-blue-500 dark:bg-blue-600 text-white border-blue-600 dark:border-blue-700 hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Valida tutti i membri senza validazione"
            >
                {validatingAll ? (
                    <>
                        <span className="animate-spin">⏳</span>
                        <span>Validazione... {validationProgress.current}/{validationProgress.total}</span>
                    </>
                ) : (
                    <>
                        <span>✓</span>
                        <span>Valida tutti</span>
                    </>
                )}
            </button>
        </div>
    );
}

