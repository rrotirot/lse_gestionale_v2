import React, { useState, useEffect, useRef } from 'react';
import { useEvents } from '../hooks/useEvents';
import { useMembersContext } from '../context/MembersContext';
import CalendarPreview from '../CalendarPreview';
import UpcomingEvents from '../components/UpcomingEvents';
import Header from '../components/layout/Header';

export default function HomePage({ user, onNavigateToMembers, onNavigateToCalendar, onLogout, onUpdateUser, isUserVerified = false }) {
     const { events } = useEvents();
     const { members } = useMembersContext();
    const [showWelcome, setShowWelcome] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);

     // Calcola il numero di membri per tag
    const lsePCount = members.filter(m => m.tag === 'LSE-P').length;
    const lseCount = members.filter(m => m.tag === 'LSE').length;
    const [isFadingOut, setIsFadingOut] = useState(false);
    const welcomeShownRef = useRef(false);

    // Funzione per navigare ai membri con un filtro tag specifico
    const navigateWithTag = (tag) => {
        sessionStorage.setItem('memberFilterTag', tag);
        onNavigateToMembers();
    };

    // Mostra il messaggio di benvenuto solo al primo accesso dopo il login
    useEffect(() => {
        // Controlla se il messaggio è già stato mostrato in questa sessione
        const welcomeShown = sessionStorage.getItem('welcomeShown');
        
        // Mostra il messaggio solo se non è stato ancora mostrato in questa sessione
        if (!welcomeShown && !welcomeShownRef.current) {
            welcomeShownRef.current = true;
            sessionStorage.setItem('welcomeShown', 'true');
            
            setShowWelcome(true);
            setIsFadingOut(false);

            // Dopo 20 secondi, inizia il fade out
            const fadeOutTimer = setTimeout(() => {
                setIsFadingOut(true);
            }, 20000);

            // Dopo il fade out (500ms), nascondi completamente
            const hideTimer = setTimeout(() => {
                setShowWelcome(false);
            }, 20500);

            return () => {
                clearTimeout(fadeOutTimer);
                clearTimeout(hideTimer);
            };
        }
    }, []); // Eseguito solo al mount del componente

    // Mostra il pulsante back to top quando scrollato oltre il 25%
    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY;
            const threshold = window.innerHeight * 0.25;
            setShowBackToTop(scrolled > threshold);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

     // Eventi caricati automaticamente da EventsContext

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-200 via-indigo-200 to-purple-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
            <Header
                user={user}
                onLogout={onLogout}
                onUpdateUser={onUpdateUser}
            />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Welcome Section con animazione */}
                {showWelcome && (
                    <div 
                        className={`text-center mb-12 transition-all duration-500 ease-in-out ${
                            isFadingOut 
                                ? 'opacity-0 transform -translate-y-4' 
                                : 'opacity-100 transform translate-y-0'
                        }`}
                        style={{
                            animation: !isFadingOut ? 'fadeInUp 0.6s ease-out' : 'none'
                        }}
                    >
                        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Benvenuto in GESTIONALE LSE
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Sistema di gestione membri per Logistic Space Economy
                        </p>
                    </div>
                )}

                {/* Avviso se non verificato */}
                {!isUserVerified && (
                    <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                    Verifica RSI richiesta
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                    Per accedere alla gestione membri e eventi, devi verificare il tuo account RSI con rank organizzazione &gt;= 4. Vai nelle Impostazioni Utente per completare la verifica.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sezione Gestione Membri - Solo se verificato */}
                {isUserVerified && (
                <div className="mb-12">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                        Gestione Membri
                    </h3>
                     <div className="grid grid-cols-1 gap-6">
                      {/* Unified LSE Members Card */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl shadow-xl p-6 hover:shadow-2xl transition-shadow border-2 border-indigo-200 dark:border-indigo-700">
                          <div className="flex flex-col md:flex-row gap-6">
                              {/* LSE-P Section */}
                              <div className="relative flex-1">
                                  <div className="absolute top-2 right-0 bg-blue-500 text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg">
                                      {lsePCount}
                                  </div>
                                  <div className="flex items-center mb-4">
                                      <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-4">
                                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                          </svg>
                                      </div>
                                      <div>
                                          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                                              LSE-P
                                          </h5>
                                          <p className="text-sm text-gray-500 dark:text-gray-400">
                                              Membri in prova
                                          </p>
                                      </div>
                                  </div>
                                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                                      Visualizza e gestisci tutti i membri con tag <span className="font-semibold text-blue-600 dark:text-blue-400">LSE-P</span>.
                                      Monitora il loro percorso verso la promozione a membri ufficiali.
                                  </p>
                              </div>

                              {/* Separator */}
                              <div className="hidden md:flex items-center">
                                  <div className="w-px h-32 bg-gray-300 dark:bg-gray-600"></div>
                              </div>

                              {/* LSE Section */}
                              <div className="relative flex-1">
                                  <div className="absolute top-2 right-0 bg-green-500 text-white text-sm font-bold px-3 py-2 rounded-lg shadow-lg">
                                      {lseCount}
                                  </div>
                                  <div className="flex items-center mb-4">
                                      <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-4">
                                          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                          </svg>
                                      </div>
                                      <div>
                                          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
                                              LSE
                                          </h5>
                                          <p className="text-sm text-gray-500 dark:text-gray-400">
                                              Membri ufficiali
                                          </p>
                                      </div>
                                  </div>
                                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                                      Visualizza e gestisci tutti i membri con tag <span className="font-semibold text-green-600 dark:text-green-400">LSE</span>.
                                      Membri ufficiali promossi con tutti i privilegi.
                                  </p>
                              </div>
                          </div>
                          <div className="mt-6 text-center">
                              <button
                                  onClick={onNavigateToMembers}
                                  className="bg-indigo-600 dark:bg-indigo-500 text-white font-medium py-3 px-6 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                              >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  Vai alla Gestione Membri
                              </button>
                          </div>
                      </div>
                     </div>
                </div>
                )}

                {/* Sezione Eventi */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {isUserVerified ? 'Gestione Eventi' : 'Eventi Futuri'}
                        </h3>
                        {isUserVerified && (
                            <button
                                onClick={onNavigateToCalendar}
                                className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Vai al Calendario
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Anteprima Calendario */}
                        <div className="lg:col-span-1 h-full">
                            <CalendarPreview
                                events={events}
                                onNavigateToCalendar={onNavigateToCalendar}
                            />
                        </div>

                        {/* Lista Eventi */}
                        <div className="lg:col-span-2 h-full">
                            <UpcomingEvents
                                events={events}
                                isUserVerified={isUserVerified}
                                onEditEvent={null}
                                onDeleteEvent={null}
                                showActions={false}
                                limitTo={3}
                                onNavigateToCalendar={onNavigateToCalendar}
                            />
                        </div>
                    </div>
                 </div>

                 {/* Back to Top Button */}
                 <button
                     onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                     className={`fixed left-4 bottom-4 z-50 bg-indigo-600 dark:bg-indigo-500 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all duration-300 ${showBackToTop ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                     aria-label="Torna in alto"
                 >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                     </svg>
                 </button>
             </main>
         </div>
     );
 }




