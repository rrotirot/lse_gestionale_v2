import React from 'react';

export default function CalendarPreview({ events = [], onNavigateToCalendar }) {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
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
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
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
    
    // Verifica se una data è oggi
    const isToday = (day) => {
        if (!day) return false;
        return (
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear()
        );
    };
    
    // Conta eventi del mese corrente
    const currentMonthEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    }).length;
    
    return (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {monthNames[currentMonth]} {currentYear}
                </h4>
            </div>
            
            {/* Giorni della settimana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-1">
                        {day.charAt(0)}
                    </div>
                ))}
            </div>
            
            {/* Giorni del mese */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => (
                    <div
                        key={index}
                        className={`
                            aspect-square p-1 rounded text-xs font-medium flex items-center justify-center
                            ${!day ? 'cursor-default' : ''}
                            ${isToday(day) 
                                ? 'bg-blue-500 text-white font-bold' 
                                : hasEvents(day)
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                    : 'text-gray-700 dark:text-gray-300'
                            }
                        `}
                    >
                        {day}
                    </div>
                ))}
            </div>
            
            {/* Info eventi */}
            {currentMonthEvents > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentMonthEvents} {currentMonthEvents === 1 ? 'evento' : 'eventi'} questo mese
                    </p>
                </div>
            )}
        </div>
    );
}

