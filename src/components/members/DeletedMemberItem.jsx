import React from 'react';
import { useDiscordAvatar } from '../../hooks/useDiscordAvatar';

export default function DeletedMemberItem({ member, discordBotToken, onRestore, authToken, onRefresh }) {
    const { avatarUrl } = useDiscordAvatar(member.id, discordBotToken);

    const deletedDate = member.deletedAt ? new Date(member.deletedAt) : null;
    const formattedDate = deletedDate ? deletedDate.toLocaleString('it-IT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'N/A';

    const reasons = member.deletionReasons && member.deletionReasons.length > 0
        ? member.deletionReasons
        : (member.orgValidation?.issues && member.orgValidation.issues.length > 0
            ? member.orgValidation.issues
            : []);

    return (
        <div
            key={member._id || member.key}
            className="p-4 rounded-lg ui-float border border-white/10 bg-transparent hover:bg-white/5 transition-colors"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        {member.id && avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={member.name}
                                className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-300 dark:ring-gray-600"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200">
                                {(member.name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                {member.name || 'Nome non disponibile'}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {member.tag || 'LSE-P'} — ID: <span className="font-mono">{member.id || '—'}</span>
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                        <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Eliminato da:</span> {member.deletedBy || 'system'}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Data eliminazione:</span> {formattedDate}
                        </p>
                        {reasons.length > 0 && (
                            <div className="mt-2">
                                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {member.deletionReasons && member.deletionReasons.length > 0
                                        ? 'Motivazioni eliminazione:'
                                        : 'Problemi di validazione (motivazione implicita):'}
                                </p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    {reasons.map((reason, index) => (
                                        <li key={index} className="text-red-600 dark:text-red-400 text-sm">
                                            {reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {member.note && (
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                <span className="font-medium">Note:</span> {member.note}
                            </p>
                        )}
                    </div>
                    <div className="mt-4">
                        <button
                            onClick={onRestore}
                            className="px-4 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded border border-green-300 dark:border-green-700 transition-colors"
                        >
                            ↻ Ripristina Membro
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

