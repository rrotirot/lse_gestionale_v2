import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function EventCard({ 
    event, 
    isUserVerified = false, 
    onEdit, 
    onDelete,
    isPast = false 
}) {
    // Regex per estrarre link dalla descrizione
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    // Formatta la data in italiano
    const formattedDate = event.date 
        ? new Date(event.date).toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        : '';

    return (
        <div
            className={`ui-float p-5 rounded-lg border transition-all w-auto max-w-[580px] ${
                isPast
                    ? 'border-white/10 bg-white/5'
                    : 'border-blue-500/30 bg-blue-500/10'
            }`}
        >
            <div className="flex items-start justify-between gap-3 mb-3 w-full">
                <div className="flex-1 min-w-0 pr-2">
                    <h5 className={`font-bold text-lg mb-2 break-words ${
                        isPast 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-white'
                    }`}>
                        {event.title}
                    </h5>
                    <div className={`space-y-1 ${
                        isPast 
                            ? 'text-gray-600 dark:text-gray-400' 
                            : 'text-blue-100'
                    }`}>
                        <p className="text-sm font-medium break-words">
                            {formattedDate}
                        </p>
                        {event.startTime && (
                            <p className="text-sm">
                                {event.startTime}
                                {event.endTime ? ` - ${event.endTime}` : ''}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-auto">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
                        event.type === 'riunione' ? 'bg-purple-500 text-white' :
                        event.type === 'attività' ? 'bg-green-500 text-white' :
                        event.type === 'discord' ? 'bg-indigo-500 text-white' :
                        event.type === 'altro' ? 'bg-gray-500 text-white' :
                        'bg-blue-400 text-white'
                    }`}>
                        {event.type}
                    </span>
                    {isUserVerified && (
                        <div className="flex gap-1">
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(event)}
                                    className={`p-1.5 rounded transition-colors ${
                                        isPast
                                            ? 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            : 'hover:bg-blue-700 text-white'
                                    }`}
                                    title="Modifica evento"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(event._id || event.id)}
                                    className={`p-1.5 rounded transition-colors ${
                                        isPast
                                            ? 'hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400'
                                            : 'hover:bg-red-600 text-white'
                                    }`}
                                    title="Elimina evento"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {event.location && (
                <div className={`flex items-center gap-2 mb-3 w-full ${
                    isPast 
                        ? 'text-gray-600 dark:text-gray-400' 
                        : 'text-blue-100'
                }`}>
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium break-words">{event.location}</span>
                </div>
            )}
            
             {event.description && (
                 <div className={`mt-3 text-sm w-full ${
                     isPast
                         ? 'text-gray-700 dark:text-gray-300'
                         : 'text-white'
                 }`}>
                     <div className="prose prose-sm dark:prose-invert max-w-none w-full">
                         <ReactMarkdown
                             components={{
                                 a: ({ href, children }) => (
                                     <a
                                         href={href}
                                         target="_blank"
                                         rel="noopener noreferrer"
                                         className={`underline hover:no-underline break-all font-normal ${
                                             isPast
                                                 ? 'text-blue-600 dark:text-blue-400'
                                                 : 'text-blue-200 hover:text-white'
                                         }`}
                                     >
                                         {children}
                                     </a>
                                 ),
                             }}
                         >
                             {event.description}
                         </ReactMarkdown>
                     </div>
                 </div>
             )}
        </div>
    );
}

