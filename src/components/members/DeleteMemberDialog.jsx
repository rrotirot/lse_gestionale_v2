import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function DeleteMemberDialog({ 
    member, 
    open, 
    onOpenChange, 
    onConfirm 
}) {
    const [selectedReasons, setSelectedReasons] = useState([]);

    // Recupera le motivazioni dai problemi di validazione
    const validationIssues = member?.orgValidation?.issues || [];

    // Reset delle selezioni quando si apre/chiude il dialog
    useEffect(() => {
        if (open) {
            setSelectedReasons([]);
        }
    }, [open]);

    const toggleReason = useCallback((issue) => {
        setSelectedReasons(prev => {
            if (prev.includes(issue)) {
                return prev.filter(r => r !== issue);
            } else {
                return [...prev, issue];
            }
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (selectedReasons.length === 0) {
            alert('Seleziona almeno una motivazione per l\'eliminazione.');
            return;
        }
        onConfirm(selectedReasons);
        onOpenChange(false);
    }, [selectedReasons, onConfirm, onOpenChange]);

    if (!member) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Elimina Membro: {member.name}</DialogTitle>
                    <DialogDescription>
                        Seleziona le motivazioni per l'eliminazione. Il membro verrà spostato nella lista dei membri eliminati.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {validationIssues.length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Nessun problema di validazione disponibile per questo membro.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Problemi di validazione rilevati:
                            </p>
                            {validationIssues.map((issue, index) => {
                                const isSelected = selectedReasons.includes(issue);
                                return (
                                    <label
                                        key={index}
                                        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleReason(issue)}
                                            className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                        />
                                        <span className={`flex-1 text-sm ${
                                            isSelected
                                                ? 'text-red-700 dark:text-red-300 font-medium'
                                                : 'text-gray-700 dark:text-gray-300'
                                        }`}>
                                            {issue}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedReasons.length === 0}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Conferma Eliminazione
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}





