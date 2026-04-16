import { useState } from 'react';
import { AlertTriangle, Upload, UserPlus } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function AddMemberModal({
    open,
    onOpenChange,
    newMember,
    setNewMember,
    onSave
}) {
    const [isBulkImport, setIsBulkImport] = useState(false);

    // Gestisci cambio file
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        
        if (file) {
            setNewMember({ ...newMember, importFile: file });
        } else {
            setNewMember({ ...newMember, importFile: null });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-0 bg-transparent ui-float">
                <DialogHeader>
                    <DialogTitle>{isBulkImport ? 'Importa Membri da File' : 'Aggiungi Nuovo Membro'}</DialogTitle>
                    <DialogDescription>
                        <AlertTriangle className="mr-1 inline-block size-4 text-yellow-500" />
                        Questa funzionalità è provvisoria e potrebbe essere rimossa in futuro. Utilizzare con cautela.
                    </DialogDescription>
                </DialogHeader>

                {/* Toggle Mode */}
                <div className="flex justify-center mb-4">
                    <div className="flex ui-float--subtle rounded-lg p-1 border border-white/10">
                        <button
                            onClick={() => setIsBulkImport(false)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                                !isBulkImport
                                    ? 'bg-white/10 text-green-200 shadow-sm'
                                    : 'text-gray-300/80'
                            }`}
                        >
                            <UserPlus className="w-4 h-4" />
                            Singolo
                        </button>
                        <button
                            onClick={() => setIsBulkImport(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                                isBulkImport
                                    ? 'bg-white/10 text-green-200 shadow-sm'
                                    : 'text-gray-300/80'
                            }`}
                        >
                            <Upload className="w-4 h-4" />
                            Da File
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Importa da file */}
                    {isBulkImport && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Seleziona File Membri
                            </label>
                            <input
                                type="file"
                                accept=".txt"
                                onChange={handleFileChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Carica un file di testo con formato: "1 | [LSE-P] Nome Cognome (ID) | Data"
                            </p>

                            {/* Formato esempio */}
                            <details className="mt-2">
                                <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                                    Mostra formato esempio
                                </summary>
                                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
{`Elenco membri con tag [LSE-P]
1 | [LSE-P] Mario Rossi (12345) | 2024-01-01
2 | [LSE-P] Luca Bianchi (67890) | 2024-01-02
Fine elenco`}
                                </pre>
                            </details>
                        </div>
                    )}

                    {/* Campi singolo membro */}
                    {!isBulkImport && (
                        <div className="space-y-4">
                            {/* Nome (obbligatorio) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nome <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newMember.name}
                                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Nome completo"
                                    required
                                />
                            </div>

                            {/* ID Discord */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    ID Discord
                                </label>
                                <input
                                    type="text"
                                    value={newMember.id}
                                    onChange={(e) => setNewMember({ ...newMember, id: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="ID Discord (opzionale)"
                                />
                            </div>

                            {/* Tag e Index */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tag
                                    </label>
                                    <select
                                        value={newMember.tag}
                                        onChange={(e) => setNewMember({ ...newMember, tag: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="LSE-P">LSE-P</option>
                                        <option value="LSE">LSE</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Index
                                    </label>
                                    <input
                                        type="text"
                                        value={newMember.index}
                                        onChange={(e) => setNewMember({ ...newMember, index: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Index (opzionale)"
                                    />
                                </div>
                            </div>

                            {/* Data */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Data
                                </label>
                                <input
                                    type="text"
                                    value={newMember.date}
                                    onChange={(e) => setNewMember({ ...newMember, date: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Data (opzionale)"
                                />
                            </div>

                            {/* Checkbox */}
                            <div className="grid grid-cols-3 gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newMember.idoneita}
                                        onChange={(e) => setNewMember({ ...newMember, idoneita: e.target.checked })}
                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Idoneità</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newMember.watchdog}
                                        onChange={(e) => setNewMember({ ...newMember, watchdog: e.target.checked })}
                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Da tenere d'occhio</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newMember.promoted}
                                        onChange={(e) => setNewMember({ ...newMember, promoted: e.target.checked })}
                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">Promosso</span>
                                </label>
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Note
                                </label>
                                <textarea
                                    value={newMember.note}
                                    onChange={(e) => setNewMember({ ...newMember, note: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                    placeholder="Note (opzionale)"
                                ></textarea>
                            </div>
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
                        onClick={onSave}
                        disabled={isBulkImport ? (!newMember.importFile) : !newMember.name.trim()}
                        className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {isBulkImport ? 'Importa Membri' : 'Salva Membro'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}