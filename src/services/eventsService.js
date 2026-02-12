/**
 * Servizio per le chiamate API relative agli eventi
 */
const rsiApiUrl = import.meta.env.VITE_RSI_API_URL

export const eventsService = {
    /**
     * Carica tutti gli eventi dal backend
     */
    async getAllEvents() {
        const response = await fetch(`${rsiApiUrl}/api/v1/events`);
        if (!response.ok) {
            throw new Error(`Errore nel caricamento eventi: ${response.status}`);
        }
        const data = await response.json();
        // Supporta sia la vecchia struttura (array) che la nuova (oggetto con success/events)
        return data.events || data;
    },

    /**
     * Crea un nuovo evento
     */
    async createEvent(eventData) {
        const response = await fetch(`${rsiApiUrl}/api/v1/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
            throw new Error(error.message || error.error || `Errore nella creazione evento: ${response.status}`);
        }
        const data = await response.json();
        // Supporta sia la vecchia struttura che la nuova (con success/event)
        return data.event || data;
    },

    /**
     * Aggiorna un evento esistente
     */
    async updateEvent(eventId, eventData) {
        const response = await fetch(`${rsiApiUrl}/api/v1/events/${eventId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
            throw new Error(error.message || error.error || `Errore nell'aggiornamento evento: ${response.status}`);
        }
        const data = await response.json();
        // Supporta sia la vecchia struttura che la nuova (con success/event)
        return data.event || data;
    },

    /**
     * Elimina un evento
     */
    async deleteEvent(eventId) {
        const response = await fetch(`${rsiApiUrl}/api/v1/events/${eventId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
            throw new Error(error.message || error.error || `Errore nell'eliminazione evento: ${response.status}`);
        }
        return response.json();
    },
};

