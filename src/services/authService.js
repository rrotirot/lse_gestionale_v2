import { getApiBaseUrl, getStoredAuthToken } from "../lib/runtime-config";

/**
 * Servizio per le chiamate API relative all'autenticazione
 */

export const authService = {
    /**
     * Effettua il login
     */
    async login(username, password) {
        const rsiApiUrl = getApiBaseUrl();
        // Verifica che l'URL sia valido
        if (!rsiApiUrl || rsiApiUrl.trim() === '') {
            throw new Error('URL del server non configurato. Controlla le impostazioni.');
        }

        try {
            const response = await fetch(`${rsiApiUrl}/api/v1/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
                throw new Error(error.message || `Errore nel login: ${response.status}`);
            }
            
            return response.json();
        } catch (error) {
            // Gestione errori di rete
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                throw new Error(`Impossibile connettersi al server. Verifica che il server sia avviato su ${rsiApiUrl}`);
            }
            // Rilancia altri errori così come sono
            throw error;
        }
    },

    /**
     * Genera un codice di verifica
     */
    async generateVerificationCode() {
        const token = getStoredAuthToken();
        if (!token) {
            throw new Error('Token di autenticazione non trovato');
        }

        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/auth/verification-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
            throw new Error(error.message || `Errore nella generazione codice: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Verifica il codice RSI
     */
    async verifyCode(rsiHandle, verificationCode) {
        const token = getStoredAuthToken();
        if (!token) {
            throw new Error('Token di autenticazione non trovato');
        }

        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/auth/verify-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ rsiHandle, verificationCode }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
            throw new Error(error.message || `Errore nella verifica: ${response.status}`);
        }

        return response.json();
    },
};

