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

    let cardClassName = '';

    if (member.idoneita) {
        cardClassName = 'bg-green-100 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-500';
    } else if (member.watchdog) {
        cardClassName = 'bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-2 border-yellow-500 dark:border-yellow-600';
    } else if (hasValidationFailed) {
        cardClassName = 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-900/40 border-2 border-red-500 dark:border-red-600';
    } else if (hasValidationPassed) {
        cardClassName = 'bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 border-2 border-cyan-500 dark:border-cyan-600';
    } else {
        cardClassName = 'bg-white dark:bg-gray-800 border dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500';
    }

    // Prepara lo stile per lo sfondo con immagine org (se validazione superata)
    const orgImageUrl = hasValidationPassed && member.orgValidation?.mainOrgImageUrl
        ? member.orgValidation.mainOrgImageUrl
        : null;

    const backgroundStyle = orgImageUrl
        ? {
            backgroundImage: `url(${orgImageUrl})`,
            backgroundSize: 'contain',
            backgroundPosition: '70% center',
            backgroundRepeat: 'no-repeat',
            position: 'relative'
        }
        : {};

    // Calcola i badge attivi e le loro posizioni dinamiche
    const activeBadges = [];
    if (has404Error) activeBadges.push({ type: '404', color: 'red' });
    if (hasNoOrgFound) activeBadges.push({ type: 'N/A', color: 'red' });
    if (hasOrgMismatchError) activeBadges.push({ type: 'X', color: 'red' });
    if (hasValidationPassed) activeBadges.push({ type: 'check', color: 'cyan' });
    if (member.idoneita) activeBadges.push({ type: 'star', color: 'green' });
    if (member.watchdog) activeBadges.push({ type: 'eye', color: 'yellow' });

    // Funzione per calcolare la posizione dinamica di un badge
    const getBadgeStyle = (index) => {
        const badgeSpacing = 4; // gap tra badge in px
        const rightOffset = 8; // right-2 = 8px
        const topOffset = 8; // top-2 = 8px
        
        // Calcola la larghezza di ogni badge (i badge 404 e N/A sono più larghi)
        const getBadgeWidth = (badge) => {
            if (badge.type === '404' || badge.type === 'N/A') {
                return 32; // px-2 py-1 text-xs = circa 32px di larghezza
            }
            return 24; // w-6 = 24px
        };
        
        // Calcola la posizione right sommando le larghezze dei badge successivi
        let right = rightOffset;
        for (let i = index + 1; i < activeBadges.length; i++) {
            right += getBadgeWidth(activeBadges[i]) + badgeSpacing;
        }
        
        return {
            position: 'absolute',
            top: `${topOffset}px`,
            right: `${right}px`,
            zIndex: 10
        };
    };

    return (
        <article
            onClick={() => onSelect(member)}
            className={`cursor-pointer rounded-lg p-4 shadow-sm hover:shadow-md transition relative overflow-hidden ${cardClassName}`}
            style={backgroundStyle}
        >
            {/* Overlay per trasparenza dell'immagine */}
            {orgImageUrl && (
                <div
                    className="absolute inset-0 bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30 rounded-lg z-0"
                    style={{ opacity: 0.65 }}
                />
            )}
            {member.note && (
                <div
                    className="absolute w-8 h-8 bg-yellow-400 z-20 shadow-md"
                    style={{ 
                        top: '0', 
                        left: '0',
                        clipPath: 'polygon(0 0, 100% 0, 0 100%)'
                    }}
                ></div>
            )}
            <div className="relative z-10">
                {/* Renderizza i badge dinamicamente */}
                {activeBadges.map((badge, index) => {
                    const baseClasses = "bg-opacity-90 text-white rounded shadow-lg border flex items-center justify-center";
                    const colorClasses = {
                        red: "bg-red-700 dark:bg-red-700 border-red-900 dark:border-red-900",
                        cyan: "bg-cyan-700 dark:bg-cyan-700 border-cyan-900 dark:border-cyan-900",
                        green: "bg-green-700 dark:bg-green-700 border-green-900 dark:border-green-900",
                        yellow: "bg-yellow-600 dark:bg-yellow-600 border-yellow-700 dark:border-yellow-700"
                    };
                    
                    return (
                        <div
                            key={`${badge.type}-${index}`}
                            className={`${baseClasses} ${colorClasses[badge.color]} ${
                                badge.type === '404' || badge.type === 'N/A' 
                                    ? 'px-2 py-1 text-xs font-bold' 
                                    : 'w-6 h-6'
                            }`}
                            style={getBadgeStyle(index)}
                        >
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
                    );
                })}
                <div className="flex items-center gap-3">
                    {member.id && avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={member.name}
                            className={`w-12 h-12 rounded-full object-cover ${
                                member.idoneita
                                    ? 'ring-2 ring-green-500'
                                    : member.watchdog
                                        ? 'ring-2 ring-yellow-500 dark:ring-yellow-500'
                                        : hasValidationFailed
                                            ? 'ring-2 ring-red-500 dark:ring-red-500'
                                            : hasValidationPassed
                                                ? 'ring-2 ring-cyan-500 dark:ring-cyan-500'
                                                : ''
                            }`}
                            onError={(e) => {
                                const img = e.target;
                                img.style.display = 'none';
                                const fallback = img.nextElementSibling;
                                if (fallback) {
                                    fallback.style.display = 'flex';
                                }
                            }}
                        />
                    ) : null}
                    <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium ${
                            member.idoneita
                                ? 'bg-green-300 dark:bg-green-800 text-green-900 dark:text-green-200'
                                : member.watchdog
                                    ? 'bg-yellow-300 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-200'
                                    : hasValidationFailed
                                        ? 'bg-red-300 dark:bg-red-800 text-red-900 dark:text-red-200'
                                        : hasValidationPassed
                                            ? 'bg-cyan-300 dark:bg-cyan-800 text-cyan-900 dark:text-cyan-200'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                        } ${member.id ? 'hidden' : ''}`}
                    >
                        {(member.name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div>
                        <h3 className={`font-semibold text-sm ${
                            member.idoneita
                                ? 'text-green-950 dark:text-green-100'
                                : member.watchdog
                                    ? 'text-yellow-950 dark:text-yellow-100'
                                    : hasValidationFailed
                                        ? 'text-red-950 dark:text-red-100'
                                        : hasValidationPassed
                                            ? 'text-cyan-950 dark:text-cyan-100'
                                            : 'text-gray-900 dark:text-gray-100'
                        }`}>
                            {member.name}
                        </h3>
                        <div className={`text-xs ${
                            member.idoneita
                                ? 'text-green-800 dark:text-green-300'
                                : member.watchdog
                                    ? 'text-yellow-800 dark:text-yellow-300'
                                    : hasValidationFailed
                                        ? 'text-red-800 dark:text-red-300'
                                        : hasValidationPassed
                                            ? 'text-cyan-800 dark:text-cyan-300'
                                            : 'text-gray-600 dark:text-gray-300'
                        }`}>
                            {member.tag}
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
