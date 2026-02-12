import React, { useState } from 'react';

export default function Calendar({ events = [], onDateSelect, selectedDate }) {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    const monthNames = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

    // Ottieni il primo giorno del mese e quanti giorni ci sono
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Crea array di giorni del mese
    const days = [];
    // Aggiungi giorni vuoti all'inizio
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    // Aggiungi i giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
    }

    // Verifica se una data ha eventi
    const hasEvents = (day) => {
        if (!day) return false;
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.some(event => {
            const eventDate = new Date(event.date);
            const eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
            return eventDateStr === dateStr;
        });
    };

    // Ottieni gli eventi per una data specifica
    const getEventsForDay = (day) => {
        if (!day) return [];
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(event => {
            const eventDate = new Date(event.date);
            const eventDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
            return eventDateStr === dateStr;
        });
    };

    // Colori per categoria evento - corrispondono esattamente ai colori del testo nella lista eventi
    // Usa le stesse tonalità: 700 per light mode, 400 per dark mode
    const getEventTypeColor = (type) => {
        switch (type) {
            case 'riunione':
                return 'bg-purple-700 dark:bg-purple-400'; // Viola: corrisponde a text-purple-700 dark:text-purple-400
            case 'attività':
                return 'bg-green-700 dark:bg-green-400'; // Verde: corrisponde a text-green-700 dark:text-green-400
            case 'discord':
                return 'bg-indigo-700 dark:bg-indigo-400'; // Indaco: corrisponde a text-indigo-700 dark:text-indigo-400
            case 'altro':
                return 'bg-gray-700 dark:bg-gray-400'; // Grigio: corrisponde a text-gray-700 dark:text-gray-400
            case 'evento':
            default:
                return 'bg-blue-700 dark:bg-blue-400'; // Blu: corrisponde a text-blue-700 dark:text-blue-400
        }
    };

    // Verifica se una data è oggi
    const isToday = (day) => {
        if (!day) return false;
        return (
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear()
        );
    };

    // Verifica se una data è selezionata
    const isSelected = (day) => {
        if (!day || !selectedDate) return false;
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const selectedDateStr = selectedDate instanceof Date
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
            : selectedDate;
        return dateStr === selectedDateStr;
    };

    // Navigazione mese
    const goToPreviousMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const goToNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const goToToday = () => {
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
    };

    const handleDayClick = (day) => {
        if (!day) return;
        const date = new Date(currentYear, currentMonth, day);
        if (onDateSelect) {
            onDateSelect(date);
        }
    };

    return (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg shadow-xl px-2 py-6 w-full">
            {/* Header calendario */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={goToPreviousMonth}
                    className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Mese precedente"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {monthNames[currentMonth]} {currentYear}
                    </h3>
                    <button
                        onClick={goToToday}
                        className="px-4 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Oggi
                    </button>
                </div>
                <button
                    onClick={goToNextMonth}
                    className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Mese successivo"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Giorni della settimana */}
            <div className="grid grid-cols-7 gap-2 mb-3">
                {daysOfWeek.map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-3">
                        {day}
                    </div>
                ))}
            </div>

            {/* Giorni del mese */}
            <div className="grid grid-cols-7 gap-3">
                {days.map((day, index) => (
                    <button
                        key={index}
                        onClick={() => handleDayClick(day)}
                        disabled={!day}
                         className={`
                             w-full h-18 p-2 rounded-xl text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center
                            ${!day ? 'cursor-default opacity-0' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500'}
                            ${isToday(day)
                                ? 'bg-blue-500 text-white font-bold ring-2 ring-blue-400 shadow-lg'
                                : isSelected(day)
                                    ? 'bg-green-500 text-white font-bold ring-2 ring-green-400 shadow-lg'
                                    : 'text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/50 hover:shadow-md'
                            }
                            ${hasEvents(day) && !isToday(day) && !isSelected(day)
                                ? 'ring-2 ring-purple-400 dark:ring-purple-500'
                                : ''
                            }
                        `}
                    >
                        <div className="flex flex-col items-center justify-center h-full gap-1.5">
                             <span className="leading-none text-sm font-bold">{day}</span>
                            {hasEvents(day) && (() => {
                                const dayEvents = getEventsForDay(day);
                                // Se c'è un solo evento, mostra un pallino
                                if (dayEvents.length === 1) {
                                    const eventType = (dayEvents[0].type || 'evento').toLowerCase().trim();
                                     return (
                                         <div className={`w-2 h-2 ${getEventTypeColor(eventType)} rounded-full shadow-sm`} title={dayEvents[0].title}></div>
                                     );
                                }
                                // Se ci sono più eventi, mostra pallini colorati per categoria
                                const uniqueTypes = [...new Set(dayEvents.map(e => {
                                    const eventType = e.type || 'evento';
                                    // Normalizza il tipo per gestire variazioni
                                    return eventType.toLowerCase().trim();
                                }))];

                                // Ordina i tipi per mostrare sempre lo stesso ordine (evento, riunione, attività, discord, altro)
                                const typeOrder = ['evento', 'riunione', 'attività', 'discord', 'altro'];
                                const sortedTypes = uniqueTypes.sort((a, b) => {
                                    const indexA = typeOrder.indexOf(a);
                                    const indexB = typeOrder.indexOf(b);
                                    if (indexA === -1 && indexB === -1) return 0;
                                    if (indexA === -1) return 1;
                                    if (indexB === -1) return -1;
                                    return indexA - indexB;
                                });

                                return (
                                    <div className="flex flex-wrap gap-1 justify-center items-center">
                                        {sortedTypes.slice(0, 3).map((type, idx) => {
                                            const normalizedType = type.toLowerCase().trim();
                                            const count = dayEvents.filter(e => (e.type || 'evento').toLowerCase().trim() === normalizedType).length;
                                             return (
                                                 <div
                                                     key={`${normalizedType}-${idx}`}
                                                     className={`w-2 h-2 ${getEventTypeColor(normalizedType)} rounded-full shadow-sm`}
                                                     title={`${count} ${type}${count > 1 ? 'i' : ''}`}
                                                 ></div>
                                             );
                                        })}
                                         {sortedTypes.length > 3 && (
                                             <div className="w-2 h-2 bg-gray-500 rounded-full shadow-sm" title={`+${sortedTypes.length - 3} altre categorie`}></div>
                                         )}
                                    </div>
                                );
                            })()}
                        </div>
                    </button>
                ))}
            </div>

            {/* Legenda */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap gap-3 text-sm">
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                         <span className="text-gray-700 dark:text-gray-300">Oggi</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                         <span className="text-gray-700 dark:text-gray-300">Selezionato</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 border-2 border-purple-500 rounded-full bg-transparent"></div>
                         <span className="text-gray-700 dark:text-gray-300">Eventi</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-blue-700 dark:bg-blue-400 rounded-full"></div>
                         <span className="text-gray-700 dark:text-gray-300">Evento</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-purple-700 dark:bg-purple-400 rounded-full"></div>
                         <span className="text-gray-700 dark:text-gray-300">Riunione</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-green-700 dark:bg-green-400 rounded-full"></div>
                         <span className="text-gray-700 dark:text-gray-300">Attività</span>
                     </div>
                     <div className="flex items-center gap-2">
                         <div className="w-2 h-2 bg-indigo-700 dark:bg-indigo-400 rounded-full"></div>
                         <span className="text-gray-700 dark:text-gray-300">Discord</span>
                     </div>
                </div>
            </div>
        </div>
    );
}



