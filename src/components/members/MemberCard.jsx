import React from 'react';
import { useDiscordAvatar } from '../../hooks/useDiscordAvatar';

export default function MemberCard({ member, onSelect, discordBotToken }) {
    const hasValidationFailed = member.orgValidation?.isValid === false;
    const hasValidationPassed = member.orgValidation?.isValid === true;
    
    // Carica l'avatar Discord usando il bot tramite endpoint backend
    const { avatarUrl } = useDiscordAvatar(member.id, discordBotToken);

    // Verifica se l'errore è un 404 (Not Found)
    const has404Error = hasValidationFailed && member.orgValidation?.issues?.some(issue =>
        issue.toLowerCase().includes('not found') ||
        issue.toLowerCase().includes('404') ||
        issue.toLowerCase().includes('errore nel recupero dati')
    );

    // Verifica se non ci sono organizzazioni trovate
    const hasNoOrgFound = hasValidationFailed && !has404Error && member.orgValidation?.issues?.some(issue =>
        issue.toLowerCase().includes('nessuna organizzazione trovata nei registri pubblici')
    );

    // Verifica se la validazione è fallita per incongruenza nome org o multiple org
    const hasOrgMismatchError = hasValidationFailed && !has404Error && !hasNoOrgFound && member.orgValidation?.issues?.some(issue =>
        issue.toLowerCase().includes('organizzazioni invece di 1') ||
        issue.toLowerCase().includes('nome è') ||
        issue.toLowerCase().includes('logistic space economy')
    );

    // --- Old-style card look (from screenshot): dark card + colored border + square badges on right ---
    const borderColor = member.idoneita
        ? 'border-green-500'
        : member.watchdog
            ? 'border-amber-500'
            : hasValidationFailed
                ? 'border-red-500'
                : hasValidationPassed
                    ? 'border-cyan-500'
                    : 'border-slate-700';

    const bgColor = member.idoneita
        ? 'bg-emerald-950/40'
        : member.watchdog
            ? 'bg-amber-950/30'
            : hasValidationFailed
                ? 'bg-rose-950/35'
                : hasValidationPassed
                    ? 'bg-cyan-950/30'
                    : 'bg-slate-950/35';

    const badgeBase = 'w-6 h-6 rounded-md flex items-center justify-center border shadow-sm';
    const badgeMap = {
        green: `${badgeBase} bg-green-600/90 border-green-700 text-white`,
        yellow: `${badgeBase} bg-amber-600/90 border-amber-700 text-white`,
        cyan: `${badgeBase} bg-cyan-600/90 border-cyan-700 text-white`,
        red: `${badgeBase} bg-red-600/90 border-red-700 text-white`,
        redText: `${badgeBase} px-2 w-auto text-[10px] font-bold bg-red-600/90 border-red-700 text-white`,
    };

    const rightBadges = [];
    if (member.idoneita) rightBadges.push({ type: 'star', cls: badgeMap.green });
    if (member.watchdog) rightBadges.push({ type: 'eye', cls: badgeMap.yellow });
    if (hasValidationPassed) rightBadges.push({ type: 'check', cls: badgeMap.cyan });
    if (has404Error) rightBadges.push({ type: '404', cls: badgeMap.redText });
    if (hasNoOrgFound) rightBadges.push({ type: 'N/A', cls: badgeMap.redText });
    if (hasOrgMismatchError) rightBadges.push({ type: 'X', cls: badgeMap.red });

    return (
        <article
            onClick={() => onSelect(member)}
            className={`cursor-pointer rounded-lg p-3 shadow-sm hover:shadow-md transition relative overflow-hidden border-2 ${borderColor} ${bgColor}`}
        >
            {!!member.note && String(member.note).trim() !== '' && (
                <div
                    className="absolute left-0 top-0 h-0 w-0 z-10"
                    style={{
                        borderTop: '18px solid rgb(250 204 21)', // yellow-400
                        borderRight: '18px solid transparent',
                    }}
                    title="Note presenti"
                />
            )}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-600">
                        {member.id && avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={member.name}
                                className="w-11 h-11 object-cover"
                                onError={(e) => {
                                    const img = e.target;
                                    img.style.display = 'none';
                                }}
                            />
                        ) : (
                            <span className="text-slate-200 text-sm font-semibold">
                                {(member.name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-slate-100 truncate">
                            {member.name}
                        </h3>
                        <div className="text-xs text-slate-300">
                            {member.tag || 'LSE-P'}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {rightBadges.map((badge, idx) => (
                        <div key={`${badge.type}-${idx}`} className={badge.cls} title={badge.type}>
                            {badge.type === '404' && '404'}
                            {badge.type === 'N/A' && 'N/A'}
                            {badge.type === 'X' && '✕'}
                            {badge.type === 'check' && '✓'}
                            {badge.type === 'star' && (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            )}
                            {badge.type === 'eye' && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </article>
    );
}
