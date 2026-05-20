import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function MembersHelpModal({ open, onOpenChange }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-0 bg-[#0b0f18]/95 ui-float">
                <DialogHeader>
                    <DialogTitle>Legenda e Comandi</DialogTitle>
                    <DialogDescription>
                        Guida completa per l'utilizzo dell'interfaccia
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    {/* Legenda colori card */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Legenda Colori Card</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">I colori delle card indicano lo stato del membro:</p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 rounded border-2 border-green-500 bg-green-100 dark:bg-green-900/20">
                                <div className="w-6 h-6 rounded-full bg-green-500 flex-shrink-0"></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-green-900 dark:text-green-100">Verde - Idoneità</p>
                                    <p className="text-xs text-green-700 dark:text-green-300">Membro con idoneità attiva, pronto per le operazioni</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded border-2 border-yellow-500 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30">
                                <div className="w-6 h-6 rounded-full bg-yellow-500 flex-shrink-0"></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Giallo - Da tenere d'occhio</p>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300">Membro segnato come "watchdog", richiede attenzione particolare</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded border-2 border-red-500 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-900/40">
                                <div className="w-6 h-6 rounded-full bg-red-500 flex-shrink-0"></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-900 dark:text-red-100">Rosso - Validazione fallita</p>
                                    <p className="text-xs text-red-700 dark:text-red-300">Validazione organizzazioni RSI fallita, problemi rilevati</p>
                                </div>
                            </div>
                             <div className="flex items-center gap-3 p-3 rounded border-2 border-cyan-500 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30">
                                 <div className="w-6 h-6 rounded-full bg-cyan-500 flex-shrink-0"></div>
                                 <div className="flex-1">
                                     <p className="text-sm font-medium text-cyan-900 dark:text-cyan-100">Cyan - Validazione superata</p>
                                     <p className="text-xs text-cyan-700 dark:text-cyan-300">Validazione organizzazioni RSI superata con successo</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-3 p-3 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                                 <div className="w-6 h-6 rounded-full bg-gray-400 flex-shrink-0"></div>
                                 <div className="flex-1">
                                     <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Grigio - Nessuna condizione speciale</p>
                                     <p className="text-xs text-gray-600 dark:text-gray-400">Membro senza idoneità, watchdog o validazione RSI</p>
                                 </div>
                             </div>
                        </div>
                     </section>

                     {/* Legenda badge */}
                     <section>
                         <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Legenda Badge</h3>
                         <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">I badge mostrano informazioni aggiuntive sul membro:</p>
                         <div className="space-y-3">
                             <div className="flex items-center gap-3 p-3 rounded bg-gray-50 dark:bg-gray-900">
                                 <div className="w-6 h-6 bg-green-700 text-white rounded flex items-center justify-center text-sm font-bold">★</div>
                                 <div className="flex-1">
                                     <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Stella Verde - Idoneità</p>
                                     <p className="text-xs text-gray-600 dark:text-gray-400">Membro con idoneità attiva</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-3 p-3 rounded bg-gray-50 dark:bg-gray-900">
                                 <div className="w-6 h-6 bg-yellow-600 text-white rounded flex items-center justify-center">
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                     </svg>
                                 </div>
                                 <div className="flex-1">
                                     <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Occhio Giallo - Watchdog</p>
                                     <p className="text-xs text-gray-600 dark:text-gray-400">Membro da tenere sotto controllo</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-3 p-3 rounded bg-gray-50 dark:bg-gray-900">
                                 <div className="w-6 h-6 bg-cyan-700 text-white rounded flex items-center justify-center text-sm font-bold">✓</div>
                                 <div className="flex-1">
                                     <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Spunta Cyan - Validazione OK</p>
                                     <p className="text-xs text-gray-600 dark:text-gray-400">Validazione organizzazioni RSI superata</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-3 p-3 rounded bg-gray-50 dark:bg-gray-900">
                                 <div className="px-2 py-1 bg-red-700 text-white rounded text-xs font-bold">404</div>
                                 <div className="flex-1">
                                     <p className="text-sm font-medium text-gray-900 dark:text-gray-100">404 Rosso - Errore 404</p>
                                     <p className="text-xs text-gray-600 dark:text-gray-400">Errore nel recupero dati RSI</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-3 p-3 rounded bg-gray-50 dark:bg-gray-900">
                                 <div className="px-2 py-1 bg-red-700 text-white rounded text-xs font-bold">N/A</div>
                                 <div className="flex-1">
                                     <p className="text-sm font-medium text-gray-900 dark:text-gray-100">N/A Rosso - Nessuna Org</p>
                                     <p className="text-xs text-gray-600 dark:text-gray-400">Nessuna organizzazione trovata</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-3 p-3 rounded bg-gray-50 dark:bg-gray-900">
                                 <div className="w-6 h-6 bg-red-700 text-white rounded flex items-center justify-center text-sm font-bold">✕</div>
                                 <div className="flex-1">
                                     <p className="text-sm font-medium text-gray-900 dark:text-gray-100">X Rosso - Validazione Fallita</p>
                                     <p className="text-xs text-gray-600 dark:text-gray-400">Validazione fallita per incongruenze</p>
                                 </div>
                             </div>
                         </div>
                     </section>

                     {/* Legenda comandi */}
                     <section>
                         <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Legenda Comandi</h3>
                         <div className="space-y-2">
                             <div className="flex items-center justify-between p-3 rounded bg-gray-50 dark:bg-gray-900">
                                 <div>
                                     <p className="font-medium text-gray-900 dark:text-gray-100">Aggiungi Membro <span className="text-yellow-600 dark:text-yellow-400 text-xs">(Provvisorio)</span></p>
                                     <p className="text-sm text-gray-600 dark:text-gray-400">Pulsante per aggiungere un nuovo membro - Funzionalità temporanea</p>
                                 </div>
                                 <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">+ Aggiungi</span>
                             </div>
                             <div className="flex items-center justify-between p-3 rounded bg-gray-50 dark:bg-gray-900">
                                 <div>
                                     <p className="font-medium text-gray-900 dark:text-gray-100">Valida Tutti</p>
                                     <p className="text-sm text-gray-600 dark:text-gray-400">Valida tutti i membri senza validazione RSI</p>
                                 </div>
                                 <span className="text-sm text-green-600 dark:text-green-400 font-medium">Valida Tutti</span>
                             </div>
                             <div className="flex items-center justify-between p-3 rounded bg-gray-50 dark:bg-gray-900">
                                 <div>
                                     <p className="font-medium text-gray-900 dark:text-gray-100">Modifica Membro</p>
                                     <p className="text-sm text-gray-600 dark:text-gray-400">Clicca su una card per modificare il membro</p>
                                 </div>
                                 <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">Clic Card</span>
                             </div>
                             <div className="flex items-center justify-between p-3 rounded bg-gray-50 dark:bg-gray-900">
                                 <div>
                                     <p className="font-medium text-gray-900 dark:text-gray-100">Membri Eliminati</p>
                                     <p className="text-sm text-gray-600 dark:text-gray-400">Visualizza e ripristina membri eliminati</p>
                                 </div>
                                 <span className="text-sm text-red-600 dark:text-red-400 font-medium">🗑️</span>
                             </div>
                             <div className="flex items-center justify-between p-3 rounded bg-gray-50 dark:bg-gray-900">
                                 <div>
                                     <p className="font-medium text-gray-900 dark:text-gray-100">Salva Modifiche</p>
                                     <p className="text-sm text-gray-600 dark:text-gray-400">Nei campi modificabili (nome, note)</p>
                                 </div>
                                 <kbd className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded border border-gray-300 dark:border-gray-600 font-mono text-sm">
                                     Enter
                                 </kbd>
                             </div>
                         </div>
                     </section>
                </div>
            </DialogContent>
        </Dialog>
    );
}

