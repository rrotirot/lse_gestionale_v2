import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authService } from '../services/authService';
import { getApiBaseUrl, getStoredRememberMe } from '../lib/runtime-config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [authToken, setAuthToken] = useState(() => {
        if (typeof window === 'undefined') return null;
        const rememberMe = window.localStorage.getItem('rememberMe');
        return rememberMe === 'true'
            ? window.localStorage.getItem('authToken')
            : window.sessionStorage.getItem('authToken');
    });

    const [user, setUser] = useState(() => {
        if (typeof window === 'undefined') return null;
        const rememberMe = window.localStorage.getItem('rememberMe');
        const savedUser = rememberMe === 'true'
            ? window.localStorage.getItem('user')
            : window.sessionStorage.getItem('user');
        try {
            return savedUser ? JSON.parse(savedUser) : null;
        } catch {
            return null;
        }
    });

    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        if (typeof window === 'undefined') return false;
        const rememberMe = window.localStorage.getItem('rememberMe');
        const token = rememberMe === 'true'
            ? window.localStorage.getItem('authToken')
            : window.sessionStorage.getItem('authToken');
        return !!token;
    });

    const [loading, setLoading] = useState(true);
    
    // URL del backend RSI proxy
    const [rsiApiUrl] = useState(() => getApiBaseUrl());

    // Verifica autenticazione all'avvio
    useEffect(() => {
        if (typeof window === 'undefined') {
            setLoading(false);
            return;
        }

        const rememberMe = getStoredRememberMe();
        let token = null;
        let savedUser = null;
        let storageType = null;

        if (rememberMe === 'true') {
            token = localStorage.getItem('authToken');
            savedUser = localStorage.getItem('user');
            storageType = 'localStorage';
        } else {
            token = sessionStorage.getItem('authToken');
            savedUser = sessionStorage.getItem('user');
            storageType = 'sessionStorage';
        }

        // Migrazione se necessario
        if (!token || !savedUser) {
            if (rememberMe === 'true') {
                token = sessionStorage.getItem('authToken');
                savedUser = sessionStorage.getItem('user');
                if (token && savedUser) {
                    storageType = 'sessionStorage';
                    localStorage.setItem('authToken', token);
                    localStorage.setItem('user', savedUser);
                    sessionStorage.removeItem('authToken');
                    sessionStorage.removeItem('user');
                }
            } else {
                token = localStorage.getItem('authToken');
                savedUser = localStorage.getItem('user');
                if (token && savedUser) {
                    storageType = 'localStorage';
                    sessionStorage.setItem('authToken', token);
                    sessionStorage.setItem('user', savedUser);
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    localStorage.removeItem('rememberMe');
                }
            }
        }

        if (token && savedUser && rsiApiUrl) {
            // Verifica che il token sia ancora valido
            fetch(`${rsiApiUrl}/api/v1/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => res.json())
                 .then(data => {
                      if (data.success) {
                          setAuthToken(token);
                          setUser(data.user);
                          setIsAuthenticated(true);
                      } else {
                          // Token non valido, rimuovi credenziali a meno che non sia admin rank >= 4
                          console.error('Token verification failed on app startup:', {
                              error: data.error,
                              storageType,
                              tokenLength: token.length,
                              timestamp: new Date().toISOString()
                          });
                          
                          let parsedUser = null;
                          try { parsedUser = JSON.parse(savedUser); } catch(e) {}
                          
                          if (parsedUser && parsedUser.organizationRank >= 4) {
                              console.log('⚠️ Token non valido ma utente ha rank >= 4. Mantengo la sessione.');
                              setAuthToken(token);
                              setUser(parsedUser);
                              setIsAuthenticated(true);
                          } else {
                              localStorage.removeItem('authToken');
                              localStorage.removeItem('user');
                              localStorage.removeItem('rememberMe');
                              sessionStorage.removeItem('authToken');
                              sessionStorage.removeItem('user');
                              setAuthToken(null);
                              setUser(null);
                              setIsAuthenticated(false);
                          }
                      }
                  })
                 .catch((error) => {
                      console.error('Token verification request failed:', {
                          message: error.message,
                          storageType,
                          tokenLength: token.length,
                          apiUrl: rsiApiUrl,
                          timestamp: new Date().toISOString()
                      });
                      
                      let parsedUser = null;
                      try { parsedUser = JSON.parse(savedUser); } catch(e) {}
                      
                      if (parsedUser && parsedUser.organizationRank >= 4) {
                          console.log('⚠️ Errore connessione ma utente ha rank >= 4. Mantengo la sessione.');
                          setAuthToken(token);
                          setUser(parsedUser);
                          setIsAuthenticated(true);
                      } else {
                          localStorage.removeItem('authToken');
                          localStorage.removeItem('user');
                          localStorage.removeItem('rememberMe');
                          sessionStorage.removeItem('authToken');
                          sessionStorage.removeItem('user');
                          setAuthToken(null);
                          setUser(null);
                          setIsAuthenticated(false);
                      }
                  })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [rsiApiUrl]);

    const login = useCallback(async (username, password, rememberMe = false) => {
        try {
            const data = await authService.login(username, password);
            if (data.success && data.token && data.user) {
                const token = data.token;
                const userData = data.user;

                if (rememberMe) {
                    localStorage.setItem('authToken', token);
                    localStorage.setItem('user', JSON.stringify(userData));
                    localStorage.setItem('rememberMe', 'true');
                } else {
                    sessionStorage.setItem('authToken', token);
                    sessionStorage.setItem('user', JSON.stringify(userData));
                }

                setAuthToken(token);
                setUser(userData);
                setIsAuthenticated(true);
                sessionStorage.removeItem('welcomeShown');
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Errore nel login' };
            }
        } catch (error) {
            console.error('Errore nel login:', error);
            return { success: false, error: error.message || 'Errore di connessione' };
        }
    }, [rsiApiUrl]);

    const logout = useCallback(async () => {
         const username = user?.username || 'Unknown';
         console.log(`🚪 Logout effettuato da: ${username}`);
        
        try {
            if (typeof window === 'undefined') {
                return;
            }

            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            if (token && rsiApiUrl) {
                await fetch(`${rsiApiUrl}/api/v1/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }).catch(err => {
                    console.warn('Errore nella notifica logout al backend:', err);
                });
            }
        } catch (error) {
            console.warn('Errore nella notifica logout:', error);
        }
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('rememberMe');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('welcomeShown');
        sessionStorage.removeItem('currentView');
        
        setAuthToken(null);
        setUser(null);
        setIsAuthenticated(false);
    }, [user, rsiApiUrl]);

    const updateUser = useCallback((updatedUser) => {
        setUser(updatedUser);
        if (typeof window === 'undefined') {
            return;
        }

        const rememberMe = localStorage.getItem('rememberMe');
        if (rememberMe === 'true') {
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } else {
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
    }, []);

    const isUserVerified = useCallback(() => {
        return user?.rsiVerified === true && 
               user?.organizationRank !== null && 
               user?.organizationRank !== undefined && 
               user?.organizationRank >= 4;
    }, [user]);

    const value = {
        isAuthenticated,
        authToken,
        user,
        loading,
        rsiApiUrl,
        login,
        logout,
        updateUser,
        isUserVerified,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve essere usato all\'interno di AuthProvider');
    }
    return context;
}

