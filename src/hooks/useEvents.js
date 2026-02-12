import { useEventsContext } from '../context/EventsContext';

/**
 * Hook per accedere al contesto degli eventi
 * Questo è un wrapper per semplificare l'uso del context
 */
export function useEvents() {
    return useEventsContext();
}

