import { getApiBaseUrl, getStoredAuthToken } from "../lib/runtime-config";

/**
 * Servizio per le chiamate API relative all'utente
 */

export const userService = {
    /**
     * Aggiorna lo username
     */
    async updateUsername(newUsername) {
        const token = getStoredAuthToken();
        if (!token) {
            throw new Error('Token di autenticazione non trovato');
        }

        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/user/username`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ username: newUsername }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
            throw new Error(error.message || `Errore nell'aggiornamento username: ${response.status}`);
        }

        return response.json();
    },

    /**
     * Cambia la password
     */
    async changePassword(currentPassword, newPassword) {
        const token = getStoredAuthToken();
        if (!token) {
            throw new Error('Token di autenticazione non trovato');
        }

        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/user/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
                currentPassword: currentPassword || undefined, 
                newPassword 
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
            throw new Error(error.message || `Errore nel cambio password: ${response.status}`);
        }

        return response.json();
    },
};

