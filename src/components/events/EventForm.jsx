import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function EventForm({
    open,
    onOpenChange,
    eventData,
    onChange,
    onSave,
    isEditing = false,
    loading = false
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-0 bg-[#0b0f18]/95 ui-float">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Modifica Evento' : 'Crea Nuovo Evento'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Modifica i dettagli dell\'evento' : 'Inserisci i dettagli del nuovo evento'}
                    </DialogDescription>
                </DialogHeader>

                {/* Form */}
                <div className="space-y-4">
                    {/* Titolo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Titolo <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={eventData.title || ''}
                            onChange={(e) => onChange({ ...eventData, title: e.target.value })}
                            className="w-full px-4 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500/60 dark:focus:ring-blue-400/60 focus:border-transparent bg-transparent text-gray-900 dark:text-white"
                            placeholder="Titolo evento"
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Data */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Data <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={eventData.date || ''}
                            onChange={(e) => onChange({ ...eventData, date: e.target.value })}
                            className="w-full px-4 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500/60 dark:focus:ring-blue-400/60 focus:border-transparent bg-transparent text-gray-900 dark:text-white"
                            required
                            disabled={loading}
                        />
                    </div>

                    {/* Ora inizio e fine */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Ora inizio
                            </label>
                            <input
                                type="time"
                                value={eventData.startTime || ''}
                                onChange={(e) => onChange({ ...eventData, startTime: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Ora fine
                            </label>
                            <input
                                type="time"
                                value={eventData.endTime || ''}
                                onChange={(e) => onChange({ ...eventData, endTime: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Tipo e Location */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tipo
                            </label>
                            <select
                                value={eventData.type || 'evento'}
                                onChange={(e) => onChange({ ...eventData, type: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                disabled={loading}
                            >
                                <option value="evento">Evento</option>
                                <option value="riunione">Riunione</option>
                                <option value="attività">Attività</option>
                                <option value="discord">Discord Bot</option>
                                <option value="altro">Altro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Location
                            </label>
                            <input
                                type="text"
                                value={eventData.location || ''}
                                onChange={(e) => onChange({ ...eventData, location: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Luogo (opzionale)"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Descrizione */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Descrizione
                        </label>
                        <textarea
                            value={eventData.description || ''}
                            onChange={(e) => onChange({ ...eventData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                            placeholder="Descrizione evento (opzionale)"
                            disabled={loading}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <button
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={onSave}
                        disabled={loading || !eventData.title || !eventData.date}
                        className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Salvataggio...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {isEditing ? 'Salva Modifiche' : 'Crea Evento'}
                            </>
                        )}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

