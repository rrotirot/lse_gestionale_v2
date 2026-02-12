# 📋 PIANIFICAZIONE RISTRUTTURAZIONE PROGETTO

## 🎯 Obiettivo
Ristrutturare il progetto in **singole schede (pagine)** complete, ognuna composta da **componenti modulari e riutilizzabili**.

---

## 📁 STRUTTURA PROPOSTA

```
src/
├── pages/                          # Schede/Pagine principali
│   ├── HomePage.jsx                # Scheda Home (già esistente, da migliorare)
│   ├── MembersPage.jsx             # Scheda Membri ✅ CREATA
│   ├── CalendarPage.jsx            # Scheda Calendario (già esistente, da migliorare)
│   └── LoginPage.jsx               # Scheda Login ✅ CREATA
│
├── components/                     # Componenti riutilizzabili
│   ├── layout/                     # Componenti di layout
│   │   ├── Header.jsx             # Header (già esistente)
│   │   ├── Navigation.jsx          # Navigazione principale (nuovo)
│   │   └── Footer.jsx              # Footer (opzionale, nuovo)
│   │
│   ├── members/                    # Componenti per membri
│   │   ├── MemberCard.jsx         # Card singolo membro (già esistente)
│   │   ├── MemberList.jsx         # Lista membri (già esistente)
│   │   ├── MemberDetailModal.jsx  # Modal dettagli membro (già esistente)
│   │   ├── AddMemberModal.jsx     # Modal aggiungi membro (già esistente)
│   │   ├── DeleteMemberDialog.jsx # Dialog elimina membro (già esistente)
│   │   ├── DeletedMemberItem.jsx  # Item membro eliminato (già esistente)
│   │   ├── MembersFilters.jsx     # Filtri membri ✅ CREATO
│   │   ├── MembersSearch.jsx      # Barra ricerca membri ✅ CREATO
│   │   ├── MembersActions.jsx     # Pulsanti azioni membri ✅ CREATO
│   │   └── MembersHelpModal.jsx   # Modal help/legenda ✅ CREATO
│   │
│   ├── events/                     # Componenti per eventi
│   │   ├── UpcomingEvents.jsx     # Lista eventi prossimi (già esistente, aggiornato)
│   │   ├── Calendar.jsx           # Calendario (già esistente)
│   │   ├── CalendarPreview.jsx    # Anteprima calendario (già esistente)
│   │   ├── EventCard.jsx          # Card singolo evento ✅ CREATO
│   │   ├── EventForm.jsx          # Form crea/modifica evento ✅ CREATO
│   │   └── EventFilters.jsx       # Filtri eventi (opzionale, non necessario)
│   │
│   ├── common/                     # Componenti comuni
│   │   ├── LoadingSpinner.jsx     # Spinner caricamento ✅ CREATO
│   │   ├── ErrorMessage.jsx       # Messaggio errore ✅ CREATO
│   │   ├── EmptyState.jsx         # Stato vuoto ✅ CREATO
│   │   └── ConfirmDialog.jsx      # Dialog conferma ✅ CREATO
│   │
│   ├── user/                       # Componenti utente
│   │   ├── UserMenu.jsx           # Menu utente (estratto da Header)
│   │   ├── UserSettingsModal.jsx  # Modal impostazioni (estratto da Header)
│   │   └── RsiVerification.jsx     # Componente verifica RSI (estratto da Header)
│   │
│   └── ui/                         # Componenti UI base
│       └── dialog.jsx              # Dialog base (già esistente)
│
├── hooks/                          # Custom hooks
│   ├── useMembers.js              # Hook membri (già esistente)
│   ├── useMemberFilters.js        # Hook filtri membri (già esistente)
│   ├── useMemberDetail.js         # Hook dettagli membro (già esistente)
│   ├── useDiscordAvatar.js        # Hook avatar Discord (già esistente)
│   ├── useEvents.js               # Hook eventi ✅ CREATO
│   ├── useAuth.js                 # Hook autenticazione ✅ CREATO
│   └── useAppState.js             # Hook stato globale app (opzionale, non necessario)
│
├── context/                        # Context providers
│   ├── AuthContext.jsx            # Context autenticazione ✅ CREATO
│   ├── MembersContext.jsx         # Context membri ✅ CREATO
│   └── EventsContext.jsx         # Context eventi ✅ CREATO
│
├── services/                       # Servizi API
│   ├── authService.js             # Servizio autenticazione (già esistente)
│   ├── membersService.js          # Servizio membri (già esistente)
│   ├── userService.js             # Servizio utente (già esistente)
│   └── eventsService.js          # Servizio eventi ✅ CREATO
│
├── utils/                          # Utility
│   ├── discordUtils.js            # Utility Discord (già esistente)
│   └── dateUtils.js               # Utility date (nuovo)
│
├── App.jsx                         # App principale (semplificato)
├── main.jsx                        # Entry point (già esistente)
└── index.css                       # Stili globali (già esistente)
```

---

## 🔄 FASI DI RISTRUTTURAZIONE

### **FASE 1: Preparazione e Context Setup** ⏱️ Priorità: Alta ✅ **COMPLETATA**

#### 1.1 Creare Context Providers
- [x] `context/AuthContext.jsx` - Gestione autenticazione globale ✅
- [x] `context/MembersContext.jsx` - Gestione stato membri ✅
- [x] `context/EventsContext.jsx` - Gestione stato eventi ✅

#### 1.2 Creare Custom Hooks
- [x] `hooks/useAuth.js` - Hook per autenticazione ✅
- [x] `hooks/useEvents.js` - Hook per eventi ✅
- [ ] `hooks/useAppState.js` - Hook per stato globale (opzionale, non necessario)

#### 1.3 Creare Servizi
- [x] `services/eventsService.js` - API eventi ✅

**Risultato**: ✅ Base solida per la gestione dello stato globale - **COMPLETATA**

---

### **FASE 2: Componenti Comuni e Layout** ⏱️ Priorità: Alta 🔄 **IN CORSO**

#### 2.1 Componenti Layout
- [ ] `components/layout/Navigation.jsx` - Navigazione principale
- [ ] Estrarre `UserMenu` da `Header.jsx` → `components/user/UserMenu.jsx`
- [ ] Estrarre `UserSettingsModal` da `Header.jsx` → `components/user/UserSettingsModal.jsx`
- [ ] Estrarre `RsiVerification` da `Header.jsx` → `components/user/RsiVerification.jsx`

#### 2.2 Componenti Comuni ✅ **COMPLETATA**
- [x] `components/common/LoadingSpinner.jsx` ✅
- [x] `components/common/ErrorMessage.jsx` ✅
- [x] `components/common/EmptyState.jsx` ✅
- [x] `components/common/ConfirmDialog.jsx` ✅

**Risultato**: ✅ Componenti comuni completati - Componenti layout da completare

---

### **FASE 3: Componenti Membri Modulari** ⏱️ Priorità: Alta ✅ **COMPLETATA**

#### 3.1 Estrarre componenti da Header
- [x] `components/members/MembersSearch.jsx` - Barra ricerca ✅
- [x] `components/members/MembersFilters.jsx` - Dropdown filtri ✅

#### 3.2 Componenti Membri
- [x] `components/members/MembersActions.jsx` - Pulsanti azioni (Aggiungi, Valida tutti) ✅
- [x] `components/members/MembersHelpModal.jsx` - Modal help/legenda (estratto da App.jsx) ✅

**Risultato**: ✅ Componenti membri completamente modulari - **COMPLETATA**

---

### **FASE 4: Componenti Eventi Modulari** ⏱️ Priorità: Media ✅ **COMPLETATA**

#### 4.1 Componenti Eventi
- [x] `components/events/EventCard.jsx` - Card singolo evento (estratto da UpcomingEvents) ✅
- [x] `components/events/EventForm.jsx` - Form crea/modifica (estratto da CalendarPage) ✅
- [ ] `components/events/EventFilters.jsx` - Filtri eventi (opzionale, non necessario)

**Risultato**: ✅ Componenti eventi modulari creati e integrati - **COMPLETATA**

---

### **FASE 5: Creare Pagine Complete** ⏱️ Priorità: Alta ✅ **COMPLETATA**

#### 5.1 MembersPage (Nuova) ✅ **COMPLETATA**
- [x] Creare `pages/MembersPage.jsx` ✅
- [x] Integrare tutti i componenti membri ✅
- [x] Usare `MembersContext` per lo stato ✅
- [x] Gestire routing e navigazione ✅

#### 5.2 Migliorare HomePage ✅ **COMPLETATA**
- [x] Refactor `pages/HomePage.jsx` per usare componenti modulari ✅
- [x] Usare `EventsContext` per eventi ✅
- [x] Semplificare logica ✅

#### 5.3 Migliorare CalendarPage ✅ **COMPLETATA**
- [x] Refactor `pages/CalendarPage.jsx` per usare componenti modulari ✅
- [x] Estrarre form eventi in `EventForm.jsx` ✅
- [x] Usare `EventsContext` per eventi ✅

#### 5.4 LoginPage ✅ **COMPLETATA**
- [x] Spostare `Login.jsx` → `pages/LoginPage.jsx` ✅
- [x] Usare `AuthContext` ✅

**Risultato**: ✅ Tutte le pagine completate e migliorate - **COMPLETATA**

---

### **FASE 6: Semplificare App.jsx** ⏱️ Priorità: Alta ✅ **COMPLETATA**

#### 6.1 Refactor App.jsx
- [x] Rimuovere tutta la logica di stato (spostata in Context) ✅
- [x] Rimuovere logica membri (spostata in MembersContext) ✅
- [x] Rimuovere logica eventi (spostata in EventsContext) ✅
- [x] Rimuovere logica autenticazione (spostata in AuthContext) ✅
- [x] Mantenere solo routing e layout base ✅
- [x] Usare Context Providers ✅

**Risultato**: ✅ App.jsx pulito e leggibile (~120 righe invece di 1546) - **COMPLETATA**

---

### **FASE 7: Testing e Ottimizzazione** ⏱️ Priorità: Media

#### 7.1 Testing
- [ ] Testare tutte le pagine
- [ ] Verificare navigazione
- [ ] Verificare persistenza stato
- [ ] Verificare autenticazione

#### 7.2 Ottimizzazione
- [ ] Lazy loading pagine
- [ ] Code splitting
- [ ] Memoizzazione componenti pesanti

**Risultato**: Progetto ottimizzato e testato

---

## 📝 DETTAGLI IMPLEMENTAZIONE

### **MembersPage.jsx** (Esempio struttura)

```jsx
import React from 'react';
import { MembersContext } from '../context/MembersContext';
import Header from '../components/layout/Header';
import MembersView from '../components/members/MembersView';
import MembersSearch from '../components/members/MembersSearch';
import MembersFilters from '../components/members/MembersFilters';
import MembersActions from '../components/members/MembersActions';
import MemberList from '../components/members/MemberList';
import MemberDetailModal from '../components/members/MemberDetailModal';
import MembersHelpModal from '../components/members/MembersHelpModal';
import DeletedMembersDialog from '../components/members/DeletedMembersDialog';

export default function MembersPage() {
    const {
        members,
        filtered,
        loading,
        error,
        selectedMember,
        setSelectedMember,
        // ... altri stati
    } = useMembersContext();

    return (
        <div className="min-h-screen bg-gradient-to-br...">
            <Header 
                isMembersView={true}
                // ... props
            />
            
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Barra ricerca e filtri */}
                <div className="mb-4">
                    <MembersSearch />
                    <MembersFilters />
                </div>
                
                {/* Azioni */}
                <MembersActions />
                
                {/* Lista membri */}
                <MemberList 
                    members={filtered}
                    onMemberSelect={setSelectedMember}
                />
            </div>
            
            {/* Modals */}
            <MemberDetailModal 
                member={selectedMember}
                // ... props
            />
            <MembersHelpModal />
            <DeletedMembersDialog />
        </div>
    );
}
```

### **App.jsx** (Semplificato)

```jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { MembersProvider } from './context/MembersContext';
import { EventsProvider } from './context/EventsContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import MembersPage from './pages/MembersPage';
import CalendarPage from './pages/CalendarPage';
import ErrorBoundary from './ErrorBoundary';

export default function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <MembersProvider>
                    <EventsProvider>
                        <BrowserRouter>
                            <Routes>
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/home" element={<HomePage />} />
                                <Route path="/members" element={<MembersPage />} />
                                <Route path="/calendar" element={<CalendarPage />} />
                                <Route path="/" element={<Navigate to="/home" replace />} />
                            </Routes>
                        </BrowserRouter>
                    </EventsProvider>
                </MembersProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}
```

---

## 🎨 PRINCIPI DI DESIGN

### **1. Single Responsibility**
Ogni componente ha una responsabilità unica e ben definita.

### **2. Composizione**
Le pagine sono composte da componenti più piccoli, non monolitiche.

### **3. Separazione Concerns**
- **Pagine**: Orchestrazione e layout
- **Componenti**: UI e interazione
- **Hooks**: Logica riutilizzabile
- **Context**: Stato globale
- **Services**: Chiamate API

### **4. Riutilizzabilità**
I componenti sono progettati per essere riutilizzati in contesti diversi.

### **5. Manutenibilità**
Codice organizzato, facile da trovare e modificare.

---

## 📊 METRICHE DI SUCCESSO

- [ ] **App.jsx**: Ridotto da 1546 a <300 righe
- [ ] **Componenti**: Massimo 200-300 righe per componente
- [ ] **Pagine**: Massimo 300-400 righe per pagina
- [ ] **Riutilizzabilità**: Componenti usati in almeno 2 contesti
- [ ] **Separazione**: Logica separata da UI
- [ ] **Testabilità**: Componenti facilmente testabili

---

## 🚀 ORDINE DI ESECUZIONE RACCOMANDATO

1. **FASE 1** → Base solida (Context, Hooks, Services)
2. **FASE 2** → Componenti comuni (riutilizzabili ovunque)
3. **FASE 3** → Componenti membri (completare modulari)
4. **FASE 5** → Creare MembersPage (prima pagina completa)
5. **FASE 4** → Componenti eventi (completare modulari)
6. **FASE 5** → Migliorare HomePage e CalendarPage
7. **FASE 6** → Semplificare App.jsx
8. **FASE 7** → Testing e ottimizzazione

---

## ⚠️ NOTE IMPORTANTI

1. **Backward Compatibility**: Mantenere funzionalità esistenti durante la ristrutturazione
2. **Testing Incrementale**: Testare dopo ogni fase
3. **Documentazione**: Aggiornare README durante il processo
4. **Git**: Commits frequenti per ogni fase completata

---

## 📚 RISORSE

- Componenti esistenti da riutilizzare/modificare
- Hooks esistenti da estendere
- Services esistenti da integrare
- Struttura attuale come riferimento

---

---

## 📈 STATO ATTUALE DELLA RISTRUTTURAZIONE

### ✅ Completato

1. **FASE 1** - Preparazione e Context Setup: **100% COMPLETATA**
   - Tutti i Context Providers creati (AuthContext, MembersContext, EventsContext)
   - Hooks wrapper creati (useAuth, useEvents)
   - Servizio eventi creato (eventsService.js)

2. **FASE 2.2** - Componenti Comuni: **100% COMPLETATA**
   - LoadingSpinner, ErrorMessage, EmptyState, ConfirmDialog

3. **FASE 3** - Componenti Membri Modulari: **100% COMPLETATA**
   - MembersSearch, MembersFilters, MembersActions, MembersHelpModal

4. **FASE 4** - Componenti Eventi Modulari: **100% COMPLETATA**
   - EventCard e EventForm creati
   - UpcomingEvents aggiornato per usare EventCard
   - CalendarPage aggiornato per usare EventForm e EventsContext

5. **FASE 5.1** - MembersPage: **100% COMPLETATA**
   - Pagina completa creata con tutti i componenti integrati
   - Usa MembersContext per lo stato
   - Gestione completa membri, filtri, ricerca, modals

6. **FASE 5.2** - Migliorare HomePage: **100% COMPLETATA**
   - HomePage aggiornata per usare EventsContext
   - Logica semplificata

7. **FASE 5.3** - Migliorare CalendarPage: **100% COMPLETATA**
   - CalendarPage aggiornata per usare EventForm e EventsContext
   - Form eventi estratto in componente modulare

8. **FASE 5.4** - LoginPage: **100% COMPLETATA**
   - LoginPage creata e spostata da Login.jsx
   - Usa AuthContext per autenticazione

9. **FASE 6** - Semplificare App.jsx: **100% COMPLETATA**
   - App.jsx ridotto da 1546 righe a ~120 righe
   - Tutta la logica spostata nei Context
   - Usa Context Providers per gestione stato

### 🔄 In Corso

- **FASE 2.1** - Componenti Layout: Da estrarre da Header.jsx (opzionale)

### ⏳ Da Fare

- **FASE 7** - Testing e Ottimizzazione

---

**Data Creazione**: 2025
**Versione**: 1.4
**Stato**: ✅ Ristrutturazione Completata (FASE 2.1 opzionale rimanente)
**Progresso**: 
- ✅ FASE 1 (100%) - Context, Hooks, Services
- ✅ FASE 2.2 (100%) - Componenti Comuni
- ✅ FASE 3 (100%) - Componenti Membri Modulari
- ✅ FASE 4 (100%) - Componenti Eventi Modulari
- ✅ FASE 5 (100%) - Tutte le Pagine Create/Migliorate
- ✅ FASE 6 (100%) - App.jsx Semplificato
- 🔄 FASE 2.1 (opzionale - estrazione componenti da Header)
- ⏳ FASE 7 (Testing e Ottimizzazione - da fare)

**Ultimo Aggiornamento**: 2025
**Risultato Principale**: 
- 🎉 **App.jsx ridotto da 1546 a ~120 righe!** (92% di riduzione)
- ✅ **Tutte le pagine create e migliorate** (MembersPage, LoginPage, HomePage, CalendarPage)
- ✅ **Componenti modulari completati** (Membri ed Eventi)
- ✅ **Context e Hooks implementati** (AuthContext, MembersContext, EventsContext)
- ✅ **Architettura modulare** - Ogni pagina è una scheda completa composta da componenti
- ✅ **Separazione delle responsabilità** - Logica separata da UI

**File Creati**:
- `src/context/AuthContext.jsx`
- `src/context/MembersContext.jsx`
- `src/context/EventsContext.jsx`
- `src/hooks/useAuth.js`
- `src/hooks/useEvents.js`
- `src/services/eventsService.js`
- `src/pages/MembersPage.jsx`
- `src/pages/LoginPage.jsx`
- `src/components/common/LoadingSpinner.jsx`
- `src/components/common/ErrorMessage.jsx`
- `src/components/common/EmptyState.jsx`
- `src/components/common/ConfirmDialog.jsx`
- `src/components/members/MembersSearch.jsx`
- `src/components/members/MembersFilters.jsx`
- `src/components/members/MembersActions.jsx`
- `src/components/members/MembersHelpModal.jsx`
- `src/components/events/EventCard.jsx`
- `src/components/events/EventForm.jsx`

