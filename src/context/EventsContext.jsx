import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { eventsService } from '../services/eventsService';
import { useAuth } from '../hooks/useAuth';

const EventsContext = createContext(null);

export function EventsProvider({ children }) {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Carica eventi dal backend
    const loadEvents = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const eventsData = await eventsService.getAllEvents();
            setEvents(Array.isArray(eventsData) ? eventsData : []);
        } catch (error) {
            console.error('Errore nel caricamento eventi:', error);
            setError(error.message || 'Errore di connessione');
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Carica eventi all'avvio
    useEffect(() => {
        loadEvents(); // subito, dà feedback veloce all'utente

        const intervalId = setInterval(loadEvents, 5 * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [loadEvents]);

    // Crea un nuovo evento
    const createEvent = useCallback(async (eventData) => {
        try {
            // Aggiungi createdBy se disponibile
            const eventToCreate = {
                ...eventData,
                createdBy: user?.username || 'system'
            };

            const newEvent = await eventsService.createEvent(eventToCreate);
            setEvents(prevEvents => [...prevEvents, newEvent]);
            return { success: true, event: newEvent };
        } catch (error) {
            console.error('Errore nella creazione evento:', error);
            return { success: false, error: error.message || 'Errore di connessione' };
        }
    }, [user]);

    // Aggiorna un evento esistente
    const updateEvent = useCallback(async (eventId, eventData) => {
        try {
            const updatedEvent = await eventsService.updateEvent(eventId, eventData);
            setEvents(prevEvents =>
                prevEvents.map(e => (e._id || e.id) === eventId ? updatedEvent : e)
            );
            return { success: true, event: updatedEvent };
        } catch (error) {
            console.error('Errore nell\'aggiornamento evento:', error);
            return { success: false, error: error.message || 'Errore di connessione' };
        }
    }, []);

    // Elimina un evento
    const deleteEvent = useCallback(async (eventId) => {
        try {
            await eventsService.deleteEvent(eventId);
            setEvents(prevEvents => prevEvents.filter(e => (e._id || e.id) !== eventId));
            return { success: true };
        } catch (error) {
            console.error('Errore nell\'eliminazione evento:', error);
            return { success: false, error: error.message || 'Errore di connessione' };
        }
    }, []);

    const value = {
        events,
        loading,
        error,
        loadEvents,
        createEvent,
        updateEvent,
        deleteEvent,
    };

    return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEventsContext() {
    const context = useContext(EventsContext);
    if (!context) {
        throw new Error('useEventsContext deve essere usato all\'interno di EventsProvider');
    }
    return context;
}

