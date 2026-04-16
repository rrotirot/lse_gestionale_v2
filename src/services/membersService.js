import { getApiBaseUrl, getStoredAuthToken } from "../lib/runtime-config";

/**
 * Servizio per le chiamate API relative ai membri
 */

export const membersService = {
    /**
     * Carica tutti i membri dal backend
     */
    async getAllMembers() {
        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/members`);
        if (!response.ok) {
            throw new Error(`Errore nel caricamento membri: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Carica i membri eliminati
     */
    async getDeletedMembers() {
        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/members/deleted`);
        if (!response.ok) {
            throw new Error(`Errore nel caricamento membri eliminati: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Aggiunge un nuovo membro
     */
    async addMember(member) {
        const rsiApiUrl = getApiBaseUrl();
        // L'endpoint si aspetta un array di membri
        const response = await fetch(`${rsiApiUrl}/api/v1/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ members: [member] }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
            throw new Error(error.message || `Errore nell'aggiunta membro: ${response.status}`);
        }
        const data = await response.json();
        // Restituisci il membro aggiunto (il primo dell'array)
        return data;
    },

    /**
     * Recupera il token di autenticazione
     */
    _getAuthToken() {
        return getStoredAuthToken();
    },

    /**
     * Aggiorna un membro esistente
     */
    async updateMember(memberKey, memberData) {
        const rsiApiUrl = getApiBaseUrl();
        const token = this._getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${rsiApiUrl}/api/v1/members/${memberKey}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(memberData),
        });
        if (!response.ok) {
            throw new Error(`Errore nell'aggiornamento membro: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Elimina un membro
     */
    async deleteMember(memberKey, deletionReasons = []) {
        const rsiApiUrl = getApiBaseUrl();
        const token = this._getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${rsiApiUrl}/api/v1/members/${memberKey}`, {
            method: 'DELETE',
            headers,
            body: JSON.stringify({ deletionReasons }),
        });
        if (!response.ok) {
            throw new Error(`Errore nell'eliminazione membro: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Valida un membro
     */
    async validateMember(memberKey) {
        const rsiApiUrl = getApiBaseUrl();
        const token = this._getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${rsiApiUrl}/api/v1/members/${memberKey}/validate`, {
            method: 'POST',
            headers,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
            throw new Error(error.message || `Errore nella validazione: ${response.status}`);
        }
        const data = await response.json();
        return data.member || data;
    },

    /**
     * Carica membri da file
     */
    async uploadMembersFile(file) {
        const rsiApiUrl = getApiBaseUrl();
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${rsiApiUrl}/api/v1/members/import`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Errore sconosciuto' }));
            throw new Error(error.message || `Errore nel caricamento file: ${response.status}`);
        }
        return response.json();
    },
};

