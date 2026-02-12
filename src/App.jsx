import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MembersProvider } from "./context/MembersContext";
import { EventsProvider } from "./context/EventsContext";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import CalendarPage from "./pages/CalendarPage";
import MembersPage from "./pages/MembersPage";
import ErrorBoundary from "./ErrorBoundary";

// Componente interno che usa i Context
function AppContent() {
    const { isAuthenticated, loading, user, logout, updateUser, isUserVerified } = useAuth();
    const [currentView, setCurrentView] = useState(() => {
        // Leggi la vista corrente dal sessionStorage, default 'home'
        return sessionStorage.getItem('currentView') || 'home';
    });

    // Imposta sempre dark mode
    useEffect(() => {
        const root = document.documentElement;
            root.classList.add('dark');
    }, []);

    // Salva la vista corrente nel sessionStorage
    useEffect(() => {
        sessionStorage.setItem('currentView', currentView);
    }, [currentView]);

    // Mostra loading durante la verifica iniziale
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Caricamento...</p>
                </div>
            </div>
        );
    }

    // Mostra la pagina di login se non autenticato
    if (!isAuthenticated) {
        return <LoginPage />;
    }

     // Funzione per navigare alla home
     const handleNavigateToHome = () => {
         setCurrentView('home');
     };

    // Funzione per navigare ai membri con filtro tag opzionale
    const handleNavigateToMembers = (tag = null) => {
        if (!isUserVerified()) {
            alert('Accesso negato: Devi verificare il tuo account RSI con rank organizzazione >= 4 per accedere alla gestione membri.\n\nVai nelle Impostazioni Utente per completare la verifica.');
            return;
        }
        setCurrentView('members');
    };

    // Funzione per navigare al calendario
    const handleNavigateToCalendar = () => {
        setCurrentView('calendar');
    };

    // Mostra la home page se la vista corrente è 'home'
    if (currentView === 'home') {
        return (
            <HomePage
                user={user}
                onNavigateToMembers={handleNavigateToMembers}
                onNavigateToCalendar={handleNavigateToCalendar}
                onLogout={logout}
                onUpdateUser={updateUser}
                isUserVerified={isUserVerified()}
            />
        );
    }

    // Mostra la pagina calendario se la vista corrente è 'calendar'
    if (currentView === 'calendar') {
        return (
            <CalendarPage
                user={user}
                onNavigateToHome={handleNavigateToHome}
                onLogout={logout}
                onUpdateUser={updateUser}
                isUserVerified={isUserVerified()}
            />
        );
    }

     // Mostra la pagina membri se la vista corrente è 'members'
     if (currentView === 'members') {
         return <MembersPage onNavigateToHome={handleNavigateToHome} />;
     }

    // Fallback (non dovrebbe mai arrivare qui)
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Vista non trovata
                </h2>
                <button
                    onClick={handleNavigateToHome}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Torna alla Home
                </button>
                    </div>
        </div>
    );
}

// Componente principale con Providers
export default function LseMembersInterface() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <MembersProvider>
                    <EventsProvider>
                        <AppContent />
                    </EventsProvider>
                </MembersProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}
