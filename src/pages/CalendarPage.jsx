import React, { useState, useEffect } from 'react';
import { useEvents } from '../hooks/useEvents';
import { useAuth } from '../hooks/useAuth';
import Calendar from '../Calendar';
import Header from '../components/layout/Header';
import UpcomingEvents from '../components/UpcomingEvents';
import EventForm from '../components/events/EventForm';

export default function CalendarPage({ user, onNavigateToHome, onLogout, onUpdateUser, isUserVerified = false }) {
    const { events, loading: eventsLoading, createEvent, updateEvent, deleteEvent } = useEvents();
    const [selectedDate, setSelectedDate] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null); // null = nuovo evento, altrimenti ID evento da modificare
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        type: 'evento'
    });
    const [saving, setSaving] = useState(false);

    // Gestione selezione data
    const handleDateSelect = (date) => {
        // Blocca la creazione se non verificato
        if (!isUserVerified) {
            alert('Accesso negato: Devi verificare il tuo account RSI con rank organizzazione >= 4 per creare o modificare eventi.\n\nVai nelle Impostazioni Utente per completare la verifica.');
            return;
        }
        
        setSelectedDate(date);
        // Usa formattazione locale per evitare problemi di fuso orario
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        setNewEvent({ 
            title: '',
            description: '',
            date: dateStr,
            startTime: '',
            endTime: '',
            location: '',
            type: 'evento'
        });
        setEditingEvent(null);
        setShowEventModal(true);
    };

    // Gestione modifica evento
    const handleEditEvent = (event) => {
        // Blocca la modifica se non verificato
        if (!isUserVerified) {
            alert('Accesso negato: Devi verificare il tuo account RSI con rank organizzazione >= 4 per creare o modificare eventi.\n\nVai nelle Impostazioni Utente per completare la verifica.');
            return;
        }
        
        const eventId = event._id || event.id;
        console.log('📝 Click su modifica evento:', { event, eventId });
        
        if (!eventId) {
            alert('Errore: Impossibile trovare l\'ID dell\'evento');
            console.error('❌ Evento senza ID:', event);
            return;
        }

        // Gestisci la data evitando problemi di fuso orario
        let dateStr;
        if (event.date) {
            const eventDate = new Date(event.date);
            // Se la data è già in formato stringa YYYY-MM-DD, usala direttamente
            if (typeof event.date === 'string' && event.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                dateStr = event.date;
            } else {
                // Altrimenti formatta usando i metodi locali
                const year = eventDate.getFullYear();
                const month = String(eventDate.getMonth() + 1).padStart(2, '0');
                const day = String(eventDate.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
            }
        } else {
            dateStr = '';
        }

        setNewEvent({
            title: event.title || '',
            description: event.description || '',
            date: dateStr,
            startTime: event.startTime || '',
            endTime: event.endTime || '',
            location: event.location || '',
            type: event.type || 'evento'
        });
        setEditingEvent(eventId);
        setShowEventModal(true);
    };

    // Gestione eliminazione evento
    const handleDeleteEvent = async (eventId) => {
        // Blocca la cancellazione se non verificato
        if (!isUserVerified) {
            alert('Accesso negato: Devi verificare il tuo account RSI con rank organizzazione >= 4 per eliminare eventi.\n\nVai nelle Impostazioni Utente per completare la verifica.');
            return;
        }
        if (!window.confirm('Sei sicuro di voler eliminare questo evento?')) {
            return;
        }

        const result = await deleteEvent(eventId);
        if (!result.success) {
            alert(`Errore nell'eliminazione: ${result.error}`);
        }
    };

    // Salva nuovo evento o modifica esistente
    const handleSaveEvent = async () => {
        if (!newEvent.title || !newEvent.date) {
            alert('Titolo e data sono obbligatori');
            return;
        }

        const isEditing = editingEvent !== null;
        
        // Verifica che l'ID sia presente se stiamo modificando
        if (isEditing && !editingEvent) {
            alert('Errore: ID evento non valido per la modifica');
            console.error('❌ editingEvent è null o undefined durante la modifica');
            return;
        }

        setSaving(true);

        try {
            const eventData = {
                title: newEvent.title,
                description: newEvent.description || '',
                date: newEvent.date,
                startTime: newEvent.startTime || '',
                endTime: newEvent.endTime || '',
                location: newEvent.location || '',
                type: newEvent.type || 'evento'
            };

            let result;
            if (isEditing) {
                result = await updateEvent(editingEvent, eventData);
            } else {
                result = await createEvent(eventData);
            }

            if (result.success) {
                setShowEventModal(false);
                setNewEvent({
                    title: '',
                    description: '',
                    date: '',
                    startTime: '',
                    endTime: '',
                    location: '',
                    type: 'evento'
                });
                setEditingEvent(null);
                setSelectedDate(null);
            } else {
                alert(`Errore ${isEditing ? 'nella modifica' : 'nella creazione'} dell'evento: ${result.error}`);
            }
        } catch (error) {
            console.error(`Errore ${editingEvent ? 'nella modifica' : 'nella creazione'} evento:`, error);
            alert('Errore di connessione al server');
        } finally {
            setSaving(false);
        }
    };

    return (
            <div className="min-h-screen bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
            <Header
                user={user}
                onLogout={onLogout}
                onUpdateUser={onUpdateUser}
                onNavigateToHome={onNavigateToHome}
                showHomeButton={true}
            />

            {/* Main Content */}
            <main className="w-full mx-auto px-1 sm:px-2 lg:px-3 xl:px-4 py-4 sm:py-6">
                <div className="mb-3 sm:mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        Calendario Eventi
                    </h2>
                     <p className="text-sm text-gray-600 dark:text-gray-400">
                         {isUserVerified ? 'Clicca su una data per creare un nuovo evento' : 'Visualizza eventi futuri - Verifica RSI richiesta per gestire eventi'}
                     </p>
                </div>

                {/* Avviso se non verificato */}
                {!isUserVerified && (
                    <div className="mb-3 p-2 sm:p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <p className="text-xs sm:text-sm font-medium text-amber-800 dark:text-amber-300">
                                    Verifica RSI richiesta
                                </p>
                                <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                    Per creare, modificare o eliminare eventi, devi verificare il tuo account RSI con rank organizzazione &gt;= 4. Vai nelle Impostazioni Utente per completare la verifica.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                    {/* Calendario Grande */}
                    <div className="lg:col-span-2 w-full min-w-0 flex justify-start">
                        <Calendar
                            events={events}
                            onDateSelect={handleDateSelect}
                            selectedDate={selectedDate}
                        />
                    </div>

                    {/* Lista Eventi - Card Dinamica */}
                    <UpcomingEvents
                        events={events}
                        isUserVerified={isUserVerified}
                        onEditEvent={handleEditEvent}
                        onDeleteEvent={handleDeleteEvent}
                    />
                </div>

                {/* Dialog per creare/modificare evento */}
                <EventForm
                    open={showEventModal}
                    onOpenChange={(open) => {
                        setShowEventModal(open);
                        if (!open) {
                            setEditingEvent(null);
                            setNewEvent({
                                title: '',
                                description: '',
                                date: '',
                                startTime: '',
                                endTime: '',
                                location: '',
                                type: 'evento'
                            });
                        }
                    }}
                    eventData={newEvent}
                    onChange={setNewEvent}
                    onSave={handleSaveEvent}
                    isEditing={editingEvent !== null}
                    loading={saving}
                />
            </main>
        </div>
    );
}




