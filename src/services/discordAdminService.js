import { getApiBaseUrl, getStoredAuthToken } from "../lib/runtime-config";

/**
 * Service for Discord Bot Admin API requests
 */
export const discordAdminService = {
    _getHeaders() {
        const token = getStoredAuthToken();
        const headers = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    },

    /**
     * Fetch Discord Bot status from backend
     */
    async getBotStatus() {
        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/admin/discord/status`, {
            method: 'GET',
            headers: this._getHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Errore nel recupero stato bot: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Start persistent Discord bot
     */
    async startBot() {
        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/admin/discord/start`, {
            method: 'POST',
            headers: this._getHeaders(),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
            throw new Error(error.error || `Errore nell'avvio del bot: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Stop persistent Discord bot
     */
    async stopBot() {
        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/admin/discord/stop`, {
            method: 'POST',
            headers: this._getHeaders(),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
            throw new Error(error.error || `Errore nell'arresto del bot: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Trigger members sync job (dry-run or live)
     */
    async triggerSyncMembers(dryRun = true) {
        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/admin/discord/sync-members`, {
            method: 'POST',
            headers: this._getHeaders(),
            body: JSON.stringify({ dryRun }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
            throw new Error(error.error || `Errore nell'avvio del sync: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Get active job status by ID
     */
    async getJobStatus(jobId) {
        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/admin/jobs/${jobId}`, {
            method: 'GET',
            headers: this._getHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Errore nel caricamento del job: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Fetch execution runs history
     */
    async getSyncHistory() {
        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/admin/discord/sync-history`, {
            method: 'GET',
            headers: this._getHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Errore nel caricamento dello storico: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Fetch all registered web users (Admin only)
     */
    async getAdminUsers() {
        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/admin/users`, {
            method: 'GET',
            headers: this._getHeaders(),
        });
        if (!response.ok) {
            throw new Error(`Errore nel caricamento degli utenti: ${response.status}`);
        }
        return response.json();
    },

    /**
     * Trigger apply changes job (push DB to Discord)
     */
    async triggerApplyChanges() {
        const rsiApiUrl = getApiBaseUrl();
        const response = await fetch(`${rsiApiUrl}/api/v1/admin/discord/apply-changes`, {
            method: 'POST',
            headers: this._getHeaders(),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Errore sconosciuto' }));
            throw new Error(error.error || `Errore nell'avvio dell'applicazione modifiche: ${response.status}`);
        }
        return response.json();
    },
};
