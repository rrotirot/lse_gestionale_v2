import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getApiBaseUrl } from '../lib/runtime-config';

export default function LoginPage() {
    const { login } = useAuth();
    const rsiApiUrl = getApiBaseUrl();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!username || !password) {
            setError('Username e password sono richiesti');
            setLoading(false);
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            setError('Le password non corrispondono');
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                const result = await login(username, password, rememberMe);
                if (!result.success) {
                    setError(result.error || 'Errore nel login');
                }
                // Se success, il login gestisce la navigazione tramite AuthContext
            } else {
                // Registrazione
                if (!rsiApiUrl || rsiApiUrl.trim() === '') {
                    setError('URL del server non configurato. Controlla le impostazioni.');
                    setLoading(false);
                    return;
                }

                const endpoint = '/api/v1/auth/register';
                try {
                    const response = await fetch(`${rsiApiUrl}${endpoint}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ username, password }),
                    });

                    let data;
                    try {
                        data = await response.json();
                    } catch (jsonError) {
                        // Se la risposta non è JSON valido
                        if (!response.ok) {
                            setError(`Errore nella registrazione: ${response.status} ${response.statusText}`);
                            setLoading(false);
                            return;
                        }
                        throw jsonError;
                    }

                    if (response.ok && data.success) {
                        // Dopo la registrazione, effettua automaticamente il login
                        const loginResult = await login(username, password, rememberMe);
                        if (!loginResult.success) {
                            setError(loginResult.error || 'Registrazione completata ma login fallito');
                        }
                    } else {
                        setError(data.error || 'Errore nella registrazione');
                    }
                } catch (fetchError) {
                    if (fetchError.message === 'Failed to fetch' || fetchError.name === 'TypeError') {
                        setError(`Impossibile connettersi al server. Verifica che il server sia avviato su ${rsiApiUrl}`);
                    } else {
                        setError(fetchError.message || 'Errore durante la registrazione');
                    }
                }
            }
        } catch (error) {
            console.error('Errore:', error);
            // Mostra un messaggio più descrittivo
            if (error.message && error.message.includes('connettersi al server')) {
                setError(error.message);
            } else if (error.message && error.message.includes('non configurato')) {
                setError(error.message);
            } else {
                setError(error.message || 'Errore di connessione al server. Verifica che il server sia avviato.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full ui-float border border-white/10 bg-transparent rounded-xl shadow-2xl p-8">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                            <img 
                            src="/logo.png" 
                            alt="LSE Logo" 
                            className="h-16 w-16 object-contain"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = 'flex';
                                }
                            }}
                        />
                        <div className="h-16 w-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-xl hidden">
                            LSE
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        GESTIONALE LSE
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        {isLogin ? 'Accedi al tuo account' : 'Crea un nuovo account'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 ui-float--subtle border border-red-500/40 bg-red-500/10 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Inserisci il tuo username"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Inserisci la tua password"
                            required
                            disabled={loading}
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Conferma Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Conferma la password"
                                required
                                disabled={loading}
                            />
                        </div>
                    )}

                    {isLogin && (
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                disabled={loading}
                            />
                            <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                Resta connesso
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 dark:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Caricamento...</span>
                            </>
                        ) : (
                            <span>{isLogin ? 'Accedi' : 'Registrati'}</span>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                            setPassword('');
                            setConfirmPassword('');
                        }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        disabled={loading}
                    >
                        {isLogin 
                            ? 'Non hai un account? Registrati' 
                            : 'Hai già un account? Accedi'}
                    </button>
                </div>
            </div>
        </div>
    );
}

