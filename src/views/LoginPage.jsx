import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getApiBaseUrl } from '../lib/runtime-config';

export default function LoginPage() {
    const { login } = useAuth();
    const rsiApiUrl = getApiBaseUrl();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [passwordChecks, setPasswordChecks] = useState({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setPasswordChecks({
            length: password.length >= 6,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
        });
    }, [password]);

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

        if (!isLogin) {
            const allChecks = Object.values(passwordChecks).every(Boolean);
            if (!allChecks) {
                setError('La password non soddisfa tutti i requisiti');
                setLoading(false);
                return;
            }
        }

        try {
            if (isLogin) {
                const result = await login(username, password, rememberMe);
                if (!result.success) {
                    setError(result.error || 'Errore nel login');
                }
            } else {
                // Nota: rsiApiUrl può essere una stringa vuota "" in produzione (per URL relativi via Traefik)
                if (rsiApiUrl === undefined || rsiApiUrl === null) {
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
                        if (!response.ok) {
                            setError(`Errore nella registrazione: ${response.status} ${response.statusText}`);
                            setLoading(false);
                            return;
                        }
                        throw jsonError;
                    }

                    if (response.ok && data.success) {
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
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Inserisci la tua password"
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                                disabled={loading}
                                title={showPassword ? "Nascondi password" : "Mostra password"}
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856A3.5 3.5 0 1112 5c4.478 0 8.268 2.943 9.543 7a10.079 10.079 0 01-1.563 4.803m0 0c.926 1.025 2.36 1.694 3.972 1.694a4 4 0 100-8" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 1l22 22" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {!isLogin && (
                            <div className="mt-2 space-y-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">La password deve contenere:</p>
                                <ul className="text-xs space-y-0.5">
                                    <li className={passwordChecks.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                                        {passwordChecks.length ? '✓' : '○'} Minimo 6 caratteri
                                    </li>
                                    <li className={passwordChecks.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                                        {passwordChecks.uppercase ? '✓' : '○'} Almeno una lettera maiuscola
                                    </li>
                                    <li className={passwordChecks.lowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                                        {passwordChecks.lowercase ? '✓' : '○'} Almeno una lettera minuscola
                                    </li>
                                    <li className={passwordChecks.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                                        {passwordChecks.number ? '✓' : '○'} Almeno un numero
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Conferma Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                                        confirmPassword && password
                                            ? password === confirmPassword
                                                ? 'border-green-500 dark:border-green-500 focus:ring-green-500 dark:focus:ring-green-500'
                                                : 'border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-500'
                                            : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400'
                                    }`}
                                    placeholder="Conferma la password"
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                                    disabled={loading}
                                    title={showConfirmPassword ? "Nascondi password" : "Mostra password"}
                                >
                                    {showConfirmPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856A3.5 3.5 0 1112 5c4.478 0 8.268 2.943 9.543 7a10.079 10.079 0 01-1.563 4.803m0 0c.926 1.025 2.36 1.694 3.972 1.694a4 4 0 100-8" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 1l22 22" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {confirmPassword && password && (
                                <div className="mt-2 flex items-center gap-2">
                                    {password === confirmPassword ? (
                                        <>
                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">Le password coincidono</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-sm text-red-600 dark:text-red-400 font-medium">Le password non coincidono</span>
                                        </>
                                    )}
                                    </div>
                                 )}
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
                            setPasswordChecks({ length: false, uppercase: false, lowercase: false, number: false });
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
