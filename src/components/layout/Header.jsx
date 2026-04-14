import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const rsiApiUrl = import.meta.env.VITE_RSI_API_URL

export default function Header({ 
    user, 
    onLogout, 
    onNavigateToHome,
    showHomeButton = false,
    // Props per la modalità membri
    isMembersView = false,
    // Props per ricerca e filtro
    searchValue = '',
    onSearchChange,
    filterValue = '',
    onFilterChange,
    filterOptions = [],
    // Props per aggiornamento utente
    onUpdateUser
}) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [showEditUsernameModal, setShowEditUsernameModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [rsiHandle, setRsiHandle] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [verificationMessage, setVerificationMessage] = useState('');
    // Stati per il cambio password
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const dropdownRef = useRef(null);
    const userMenuRef = useRef(null);

    // Trova l'opzione selezionata
    const selectedOption = filterOptions.find(opt => opt.value === filterValue) || filterOptions[0];

    // Chiudi dropdown quando si clicca fuori
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        if (isDropdownOpen || isUserMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen, isUserMenuOpen]);

    // Funzione per generare il codice di verifica
    const generateVerificationCode = async () => {
        try {
            setError('');
            // Controlla sia localStorage che sessionStorage per il token
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            
            console.log('🔐 Tentativo generazione codice di verifica');
            console.log('🎫 Token trovato:', !!token);
            console.log('📍 Token da localStorage:', !!localStorage.getItem('authToken'));
            console.log('📍 Token da sessionStorage:', !!sessionStorage.getItem('authToken'));
            
            if (!token) {
                const errorMsg = 'Token di autenticazione non trovato. Effettua il login.';
                console.error('❌', errorMsg);
                setError(errorMsg);
                return;
            }

            const url = `${rsiApiUrl}/api/v1/auth/verification-code`;
            console.log('🌐 Richiesta generazione codice:', url);
            console.log('📤 Headers:', {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token.substring(0, 20)}...` // Mostra solo i primi 20 caratteri per sicurezza
            });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('📡 Risposta server:', response.status, response.statusText);
            console.log('📋 Headers risposta:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                // Prova a leggere il messaggio di errore dal server
                let errorMessage = `Errore HTTP: ${response.status}`;
                try {
                    const errorData = await response.json();
                    console.error('❌ Dati errore dal server:', errorData);
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    console.error('❌ Impossibile parsare risposta errore:', e);
                    // Se non riesce a parsare JSON, usa il messaggio di default
                }

                if (response.status === 404) {
                    errorMessage = 'Endpoint non trovato. Assicurati che il server backend sia avviato e aggiornato.';
                } else if (response.status === 401) {
                    errorMessage = 'Token non valido o mancante. Effettua nuovamente il login.';
                } else if (response.status === 403) {
                    errorMessage = 'Token scaduto o non valido. Effettua nuovamente il login.';
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('✅ Dati ricevuti:', data);

            if (data.success && data.code) {
                setVerificationCode(data.code);
                setError(''); // Pulisci eventuali errori precedenti
                console.log('✅ Codice di verifica impostato:', data.code);
            } else {
                const errorMsg = data.error || 'Errore nella generazione del codice di verifica';
                console.error('❌', errorMsg);
                setError(errorMsg);
            }
        } catch (error) {
            console.error('❌ Errore nella generazione codice:', error);
            console.error('Stack:', error.stack);
            setError(error.message || 'Errore di connessione al server');
        }
    };

    // Inizializza il nuovo username quando si apre il modal
    useEffect(() => {
        if (showEditUsernameModal && user) {
            setNewUsername(user.username || '');
            setError('');
            setRsiHandle('');
            // Se l'utente è già verificato, imposta come verificato
            if (user.rsiVerified) {
                setIsVerified(true);
                setRsiHandle(user.rsiHandle || '');
            } else {
                setIsVerified(false);
                // Verifica che ci sia un token prima di generare il codice
                const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                if (token) {
                    console.log('🔄 Generazione automatica codice di verifica all\'apertura del modal');
                    generateVerificationCode();
                } else {
                    console.warn('⚠️ Token non trovato, impossibile generare codice automaticamente');
                    setError('Token di autenticazione non trovato. Effettua il login.');
                }
            }
            setVerificationMessage('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showEditUsernameModal, user]);

    // Funzione per verificare il codice RSI
    const handleVerifyCode = async () => {
        if (!rsiHandle || !rsiHandle.trim()) {
            setVerificationMessage('Inserisci il tuo handle RSI');
            return;
        }

        if (!verificationCode) {
            setVerificationMessage('Codice di verifica non generato');
            return;
        }

        setIsVerifying(true);
        setVerificationMessage('');

        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch(`${rsiApiUrl}/api/v1/auth/verify-rsi-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    handle: rsiHandle.trim(),
                    code: verificationCode
                })
            });

            const data = await response.json();

            if (data.success) {
                setIsVerified(data.verified);
                
                // Costruisci il messaggio con informazioni dettagliate
                let message = data.message || '';
                if (data.organizationRank !== undefined) {
                    message += ` (Rank organizzazione: ${data.organizationRank}/4)`;
                }
                if (data.mainOrgName !== undefined && data.mainOrgName !== null) {
                    if (data.mainOrgVerified) {
                        message += ` (Main Org: ${data.mainOrgName} ✓)`;
                    } else {
                        message += ` (Main Org: ${data.mainOrgName} ✗ - richiesta: "Logistic Space Economy")`;
                    }
                }
                setVerificationMessage(message);
                
                // Aggiorna sempre lo stato utente se ci sono dati aggiornati (anche se la verifica non è completa)
                if (data.user && onUpdateUser) {
                    onUpdateUser(data.user);
                }
                
                // Se la verifica è riuscita
                if (data.verified && rsiHandle.trim()) {
                    // Se il backend ha aggiornato automaticamente il nome utente
                    if (data.usernameUpdated) {
                        // Chiudi il modal automaticamente
                        setShowEditUsernameModal(false);
                        setNewUsername('');
                        setRsiHandle('');
                        setIsVerified(false);
                        setVerificationCode('');
                        setVerificationMessage('');
                        setIsUserMenuOpen(false);
                    } else {
                        // Se il nome utente non è stato aggiornato automaticamente, imposta l'handle come nuovo username
                        setNewUsername(rsiHandle.trim());
                    }
                }
            } else {
                setIsVerified(false);
                setVerificationMessage(data.error || 'Errore nella verifica');
            }
        } catch (error) {
            console.error('Errore nella verifica codice:', error);
            setIsVerified(false);
            setVerificationMessage('Errore di connessione al server');
        } finally {
            setIsVerifying(false);
        }
    };

    // Funzione per aggiornare il nome utente
    const handleUpdateUsername = async () => {
        if (!newUsername || newUsername.trim().length < 3) {
            setError('Il nome utente deve essere di almeno 3 caratteri');
            return;
        }

        if (newUsername.trim().length > 30) {
            setError('Il nome utente non può superare i 30 caratteri');
            return;
        }

        // Richiedi verifica solo se l'utente non è già verificato
        if (!user.rsiVerified && !isVerified) {
            setError('Devi verificare il codice RSI prima di aggiornare il nome utente');
            return;
        }

        setIsUpdating(true);
        setError('');

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${rsiApiUrl}/api/v1/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    username: newUsername.trim(),
                    rsiHandle: (isVerified && rsiHandle.trim()) ? rsiHandle.trim() : (user.rsiHandle || undefined),
                    rsiVerified: (isVerified || user.rsiVerified) ? true : undefined
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Aggiorna lo stato utente (i dati RSI sono già inclusi nella risposta)
                if (onUpdateUser) {
                    onUpdateUser(data.user);
                }
                setShowEditUsernameModal(false);
                setNewUsername('');
                setRsiHandle('');
                setIsVerified(false);
                setVerificationCode('');
                setVerificationMessage('');
                setIsUserMenuOpen(false);
            } else {
                setError(data.error || 'Errore nell\'aggiornamento del nome utente');
            }
        } catch (error) {
            console.error('Errore nell\'aggiornamento username:', error);
            setError('Errore di connessione al server');
        } finally {
            setIsUpdating(false);
        }
    };

    // Funzione per gestire il cambio password
    const handleChangePassword = async () => {
        // Validazione: per utenti non verificati, richiedi password corrente
        const isVerified = user?.rsiVerified || false;
        
        if (!isVerified && !currentPassword) {
            setPasswordError('La password corrente è obbligatoria per utenti non verificati');
            return;
        }

        if (!newPassword || !confirmPassword) {
            setPasswordError('Nuova password e conferma sono obbligatorie');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('La nuova password deve essere di almeno 6 caratteri');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Le nuove password non corrispondono');
            return;
        }

        setIsChangingPassword(true);
        setPasswordError('');
        setPasswordSuccess('');

        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const response = await fetch(`${rsiApiUrl}/api/v1/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...(isVerified ? {} : { currentPassword }), // Invia currentPassword solo se non verificato
                    newPassword
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setPasswordSuccess('Password cambiata con successo!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                // Reset dopo 3 secondi
                setTimeout(() => {
                    setPasswordSuccess('');
                }, 3000);
            } else {
                setPasswordError(data.error || 'Errore nel cambio password');
            }
        } catch (error) {
            console.error('Errore nel cambio password:', error);
            setPasswordError('Errore di connessione al server');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleOptionSelect = (value) => {
        if (onFilterChange) {
            onFilterChange(value);
        }
        setIsDropdownOpen(false);
    };

    return (
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Prima riga: Logo, Titolo, Pulsanti - distribuiti su tutta la larghezza */}
                <div className="flex items-center justify-between h-16 w-full">
                    {/* Sezione Sinistra: Logo e Titolo */}
                    <div className="flex items-center gap-3">
                        {/* Logo LSE */}
                        <div className="flex items-center">
                            <img 
                                src="/logo.png" 
                                alt="LSE Logo" 
                                className="h-10 w-10 object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) {
                                        e.target.nextSibling.style.display = 'flex';
                                    }
                                }}
                            />
                            <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-sm hidden">
                                LSE
                            </div>
                        </div>
                        {onNavigateToHome ? (
                            <button
                                onClick={onNavigateToHome}
                                className="text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            >
                                {isMembersView ? 'Elenco membri' : 'GESTIONALE LSE'}
                            </button>
                        ) : (
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                {isMembersView ? 'Elenco membri' : 'GESTIONALE LSE'}
                            </h1>
                        )}
                    </div>

                    {/* Sezione Destra: User Menu e Logout */}
                    <div className="flex items-center gap-2">
                        {/* User Menu */}
                        {user && (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                >
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5 justify-end">
                                            {user.username || 'Utente'}
                                            {user.rsiVerified && (
                                                <svg 
                                                    className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" 
                                                    fill="currentColor" 
                                                    viewBox="0 0 20 20"
                                                    title="Verificato RSI"
                                                >
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Benvenuto
                                        </p>
                                    </div>
                                    {user.rsiAvatar ? (
                                        <img
                                            src={user.rsiAvatar}
                                            alt={user.username || 'Avatar'}
                                            className="w-10 h-10 rounded-full object-cover border-2 border-blue-500 dark:border-blue-400"
                                            onError={(e) => {
                                                // Fallback all'avatar generato se l'immagine non carica
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div 
                                        className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold ${user.rsiAvatar ? 'hidden' : ''}`}
                                    >
                                        {(user.username || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <svg 
                                        className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* User Menu Dropdown */}
                                {isUserMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden transform transition-all duration-200 ease-out origin-top-right z-50">
                                        {/* User Info Section */}
                                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                                                {user.username || 'Utente'}
                                                {user.rsiVerified && (
                                                    <svg 
                                                        className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" 
                                                        fill="currentColor" 
                                                        viewBox="0 0 20 20"
                                                        title="Verificato RSI"
                                                    >
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {user.email || (user.rsiHandle ? (
                                                    <span>
                                                        RSI: {user.rsiHandle}
                                                        {user.organizationRank !== null && user.organizationRank !== undefined && (
                                                            <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                                                                Rank {user.organizationRank}
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : 'Membro LSE')}
                                            </p>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="py-1">
                                            {/* Impostazioni Utente */}
                                            <button
                                                onClick={() => {
                                                    setShowEditUsernameModal(true);
                                                    setIsUserMenuOpen(false);
                                                }}
                                                className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span>Impostazioni Utente</span>
                                            </button>


                                            {/* Logout */}
                                            {onLogout && (
                                                <button
                                                    onClick={() => {
                                                        onLogout();
                                                        setIsUserMenuOpen(false);
                                                    }}
                                                    className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                    </svg>
                                                    <span>Esci</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Seconda riga: Barra di ricerca e filtro (solo per vista membri) */}
                {isMembersView && (
                    <div className="flex gap-3 pb-4">
                        {/* Barra di ricerca */}
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchValue}
                                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                                placeholder="Cerca membri..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all shadow-sm hover:shadow-md"
                            />
                        </div>
                        
                        {/* Dropdown filtro personalizzato */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all shadow-sm hover:shadow-md cursor-pointer min-w-[200px] text-left"
                            >
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                </div>
                                <span className="flex-1 truncate">{selectedOption?.label || 'Seleziona filtro'}</span>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <svg 
                                        className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Dropdown menu */}
                            {isDropdownOpen && (
                                <div className="absolute z-50 mt-2 w-full rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden transform transition-all duration-200 ease-out origin-top">
                                    <div 
                                        className="max-h-64 overflow-y-auto"
                                        style={{
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: 'rgb(75 85 99) transparent'
                                        }}
                                    >
                                        {filterOptions.map((option, index) => {
                                            const isSelected = option.value === filterValue;
                                            return (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => handleOptionSelect(option.value)}
                                                    className={`w-full px-4 py-3 text-left text-sm transition-colors duration-150 ${
                                                        isSelected
                                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                    } ${index === 0 ? 'rounded-t-lg' : ''} ${index === filterOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span>{option.label}</span>
                                                        {isSelected && (
                                                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Dialog Impostazioni Utente */}
            <Dialog open={showEditUsernameModal} onOpenChange={(open) => {
                setShowEditUsernameModal(open);
                if (!open) {
                    setError('');
                    setNewUsername('');
                    setRsiHandle('');
                    setIsVerified(false);
                    setVerificationCode('');
                    setVerificationMessage('');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                    setPasswordSuccess('');
                }
            }}>
                <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-hidden p-0">
                    <div className="flex max-h-[90vh] flex-col">
                        <div className="px-6 pt-6">
                            <DialogHeader>
                                <DialogTitle>Impostazioni Utente</DialogTitle>
                                <DialogDescription>
                                    Gestisci le tue impostazioni di profilo e sicurezza
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            {/* Sezione Verifica RSI - Mostra solo se l'utente non è già verificato */}
                            {!user.rsiVerified && (
                            <div className="mb-6 p-6 rounded-xl shadow-lg border-2 border-blue-200 dark:border-blue-700" style={{ backgroundColor: 'hsl(214 33% 16%)' }}>
                            <div className="flex items-center mb-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white">
                                    Verifica RSI
                                </h4>
                            </div>
                            
                            {/* Codice di verifica */}
                            <div className="mb-3">
                                <label className="block text-xs font-medium text-gray-200 mb-1">
                                    Codice di Verifica
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={verificationCode}
                                        readOnly
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            generateVerificationCode();
                                        }}
                                        className="px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                                        title="Rigenera codice"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-gray-300">
                                    Copia questo codice e inseriscilo nella tua bio o descrizione sul profilo RSI
                                </p>
                            </div>

                            {/* Handle RSI */}
                            <div className="mb-3">
                                <label className="block text-xs font-medium text-gray-200 mb-1">
                                    Handle RSI
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={rsiHandle}
                                        onChange={(e) => {
                                            setRsiHandle(e.target.value);
                                            setIsVerified(false);
                                            setVerificationMessage('');
                                        }}
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Il tuo handle RSI"
                                        disabled={isVerifying || isUpdating}
                                    />
                                    <button
                                        onClick={handleVerifyCode}
                                        disabled={isVerifying || !rsiHandle.trim() || !verificationCode}
                                        className="px-4 py-2 text-xs font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 shadow-md hover:shadow-lg"
                                    >
                                        {isVerifying ? (
                                            <>
                                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Verifica...</span>
                                            </>
                                        ) : (
                                            'Verifica'
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Messaggio di verifica */}
                            {verificationMessage && (
                                <div className={`p-4 rounded-lg border-2 text-sm ${
                                    isVerified 
                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-600 dark:text-green-400' 
                                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        {isVerified ? (
                                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                        <span className="font-medium">{verificationMessage}</span>
                                    </div>
                                </div>
                            )}

                            {isVerified && (
                                <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Verifica completata con successo</span>
                                </div>
                            )}
                        </div>
                        )}

                        {/* Sezione Stato Verifica RSI */}
                        {(user.rsiVerified || user.verificationCodeFound !== undefined || user.verificationRankVerified !== undefined || user.verificationMainOrgVerified !== undefined) && (
                            <div className={`mb-6 p-6 rounded-xl shadow-lg border-2 ${
                                user.rsiVerified 
                                    ? 'border-green-200 dark:border-green-700'
                                    : 'border-blue-200 dark:border-blue-700'
                            }`} style={{ backgroundColor: 'hsl(214 33% 16%)' }}>
                                <div className="flex items-center gap-3 mb-4">
                                    {user.rsiVerified ? (
                                        <>
                                            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="text-lg font-semibold text-green-400">Account RSI verificato</span>
                                                <p className="text-xs text-gray-300">Tutte le verifiche completate</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="text-lg font-semibold text-blue-400">Verifica RSI in corso</span>
                                                <p className="text-xs text-gray-300">Completa i requisiti per la verifica</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                {user.rsiHandle && (
                                    <div className="mb-3 text-xs text-gray-300">
                                        <p>
                                            Handle RSI: <span className="font-semibold text-white">{user.rsiHandle}</span>
                                        </p>
                                    </div>
                                )}

                                {/* Condizioni di verifica */}
                                <div className="space-y-2 text-xs">
                                    {/* Se l'utente è verificato (rsiVerified === true), tutte le condizioni sono considerate verificate */}
                                    {user.rsiVerified ? (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-200">Codice di verifica trovato:</span>
                                                <span className="font-semibold text-green-400">
                                                    ✓ Sì
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-200">Rank organizzazione (≥4):</span>
                                                <span className="font-semibold text-green-400">
                                                    ✓ Sì ({user.organizationRank || 4}/4)
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-200">Main Org "Logistic Space Economy":</span>
                                                <span className="font-semibold text-green-400">
                                                    ✓ Sì
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-200">Codice di verifica trovato:</span>
                                                <span className={`font-semibold ${
                                                    user.verificationCodeFound === true
                                                        ? 'text-green-400' 
                                                        : (user.verificationCodeFound === false ? 'text-red-400' : 'text-gray-300')
                                                }`}>
                                                    {user.verificationCodeFound === true
                                                        ? '✓ Sì' 
                                                        : (user.verificationCodeFound === false ? '✗ No' : 'Non verificato')}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-200">Rank organizzazione (≥4):</span>
                                                <span className={`font-semibold ${
                                                    (user.verificationRankVerified === true || (user.organizationRank !== null && user.organizationRank !== undefined && user.organizationRank >= 4)) 
                                                        ? 'text-green-400' 
                                                        : (user.verificationRankVerified === false || (user.organizationRank !== null && user.organizationRank !== undefined && user.organizationRank < 4) ? 'text-red-400' : 'text-gray-300')
                                                }`}>
                                                    {(user.verificationRankVerified === true || (user.organizationRank !== null && user.organizationRank !== undefined && user.organizationRank >= 4)) 
                                                        ? `✓ Sì (${user.organizationRank || 0}/4)` 
                                                        : (user.organizationRank !== null && user.organizationRank !== undefined 
                                                            ? `✗ No (${user.organizationRank}/4)` 
                                                            : 'Non verificato')}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-200">Main Org "Logistic Space Economy":</span>
                                                <span className={`font-semibold ${
                                                    user.verificationMainOrgVerified === true
                                                        ? 'text-green-400' 
                                                        : (user.verificationMainOrgVerified === false ? 'text-red-400' : 'text-gray-300')
                                                }`}>
                                                    {user.verificationMainOrgVerified === true
                                                        ? '✓ Sì' 
                                                        : (user.verificationMainOrgVerified === false 
                                                            ? `✗ No${user.mainOrgName ? ` (${user.mainOrgName})` : ''}` 
                                                            : 'Non verificato')}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Sezione: Profilo Utente */}
                        <div className="mb-6 p-6 rounded-xl shadow-lg border-2 border-purple-200 dark:border-purple-700" style={{ backgroundColor: 'hsl(214 33% 16%)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white">
                                    Profilo Utente
                                </h4>
                            </div>
                            
                            {/* Nuovo Username */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-200 mb-2">
                                    Username
                                </label>
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => {
                                    setNewUsername(e.target.value);
                                    setError('');
                                }}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !isUpdating && (user.rsiVerified || isVerified)) {
                                        handleUpdateUsername();
                                    }
                                }}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Inserisci il nuovo username"
                                disabled={isUpdating || (!user.rsiVerified && !isVerified)}
                            />
                            {error && (
                                <p className="mt-2 text-sm text-red-400">{error}</p>
                            )}
                            <p className="mt-2 text-xs text-gray-300">
                                Il nome utente deve essere tra 3 e 30 caratteri
                            </p>
                            {!user.rsiVerified && !isVerified && (
                                <p className="mt-1 text-xs text-amber-400">
                                    ⚠️ Devi completare la verifica RSI prima di modificare il nome utente
                                </p>
                            )}
                            </div>
                        </div>

                        {/* Sezione: Sicurezza */}
                        <div className="mb-6 p-6 rounded-xl shadow-lg border-2 border-blue-200 dark:border-blue-700" style={{ backgroundColor: 'hsl(214 33% 16%)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h4 className="text-lg font-semibold text-white">
                                    Sicurezza
                                </h4>
                            </div>
                            
                            {/* Cambio Password */}
                            <div className="space-y-4">
                                {/* Password Corrente - Solo per utenti non verificati */}
                                {!user.rsiVerified && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-200 mb-2">
                                            Password Corrente
                                        </label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => {
                                                setCurrentPassword(e.target.value);
                                                setPasswordError('');
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            placeholder="Inserisci la password corrente"
                                            disabled={isChangingPassword}
                                        />
                                    </div>
                                )}

                                {/* Messaggio informativo per utenti verificati */}
                                {user.rsiVerified && (
                                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700">
                                        <div className="flex items-center gap-2 text-blue-400 text-sm">
                                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium">Utente verificato RSI: la password corrente non è richiesta</span>
                                        </div>
                                    </div>
                                )}

                                {/* Nuova Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-200 mb-2">
                                        Nuova Password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            setPasswordError('');
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Inserisci la nuova password"
                                        disabled={isChangingPassword}
                                    />
                                    <p className="mt-1 text-xs text-gray-300">
                                        La password deve essere di almeno 6 caratteri
                                    </p>
                                </div>

                                {/* Conferma Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-200 mb-2">
                                        Conferma Nuova Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setPasswordError('');
                                        }}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter' && !isChangingPassword) {
                                                handleChangePassword();
                                            }
                                        }}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Conferma la nuova password"
                                        disabled={isChangingPassword}
                                    />
                                </div>

                                {/* Messaggi di errore/successo */}
                                {passwordError && (
                                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-sm font-medium text-red-400">{passwordError}</p>
                                        </div>
                                    </div>
                                )}

                                {passwordSuccess && (
                                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-sm font-medium text-green-400">{passwordSuccess}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Pulsante Cambia Password */}
                                <button
                                    onClick={handleChangePassword}
                                    disabled={isChangingPassword || (!user.rsiVerified && !currentPassword) || !newPassword || !confirmPassword}
                                    className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                                >
                                    {isChangingPassword ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Cambio password...</span>
                                        </>
                                    ) : (
                                        'Cambia Password'
                                    )}
                                </button>
                            </div>
                        </div>

                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 px-6 py-4">
                            <DialogFooter>
                                <button
                                    onClick={() => {
                                        setShowEditUsernameModal(false);
                                        setError('');
                                        setNewUsername('');
                                        setRsiHandle('');
                                        setIsVerified(false);
                                        setVerificationCode('');
                                        setVerificationMessage('');
                                        setCurrentPassword('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                        setPasswordError('');
                                        setPasswordSuccess('');
                                    }}
                                    disabled={isUpdating}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={handleUpdateUsername}
                                    disabled={isUpdating || !newUsername.trim() || (!user.rsiVerified && !isVerified)}
                                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 dark:bg-purple-500 rounded-lg shadow-md hover:bg-purple-700 dark:hover:bg-purple-600 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isUpdating ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Aggiornamento...</span>
                                        </>
                                    ) : (
                                        'Salva'
                                    )}
                                </button>
                            </DialogFooter>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </header>
    );
}
