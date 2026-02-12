import { useAuth as useAuthContext } from '../context/AuthContext';

/**
 * Hook per accedere al contesto di autenticazione
 * Questo è un wrapper per semplificare l'uso del context
 */
export function useAuth() {
    return useAuthContext();
}

