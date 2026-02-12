import React, { useState } from 'react';
import EventCard from './events/EventCard';

export default function UpcomingEvents({ events, isUserVerified, onEditEvent, onDeleteEvent, showActions = true, limitTo, onNavigateToCalendar }) {
    const [showHistory, setShowHistory] = useState(false);
    // Filtra eventi: futuri o history a seconda dello stato
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    let filteredEvents;
    filteredEvents = showHistory ? events.filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate < now;
    }) : events.filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= now;
    });
    
    // Ordina per data (più vicini prima)
    const sortedEvents = filteredEvents.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        // Se hanno la stessa data, ordina per orario
        if (dateA.getTime() === dateB.getTime()) {
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        }
        return dateA - dateB;
    });

    return (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl shadow-2xl p-2 sm:p-3 lg:p-4 w-full max-w-full mx-auto min-w-0 h-full">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                    {showHistory ? 'Storia Eventi' : 'Eventi Futuri'}
                </h4>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="px-4 py-2 text-sm bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors font-medium"
                >
                    {showHistory ? 'Recenti' : 'History'}
                </button>
            </div>
            <div className="border-b border-gray-200 dark:border-gray-600 mb-4"></div>
            <div className={`w-full ${sortedEvents.length === 0 ? 'flex items-center justify-center h-full px-4' : 'space-y-2 sm:space-y-3 max-h-[calc(100vh-150px)] sm:max-h-[calc(100vh-200px)] overflow-y-auto px-4'}`}>
                {sortedEvents.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center">
                        {showHistory
                            ? (isUserVerified ? 'Nessun evento passato' : 'Nessun evento passato disponibile')
                            : (isUserVerified ? 'Nessun evento programmato' : 'Nessun evento futuro programmato')
                        }
                    </p>
                ) : (
                    <>
                        {(limitTo ? sortedEvents.slice(0, limitTo) : sortedEvents).map((event, index) => {
                            const eventDate = new Date(event.date);
                            eventDate.setHours(0, 0, 0, 0);
                            const isPast = eventDate < new Date();
                            return (
                                <EventCard
                                    key={event._id || event.id}
                                    event={event}
                                    isUserVerified={isUserVerified}
                                    onEdit={showActions ? onEditEvent : null}
                                    onDelete={showActions ? onDeleteEvent : null}
                                    isPast={isPast}
                                />
                            );
                        })}

                    </>
                )}
            </div>
        </div>
    );
}

