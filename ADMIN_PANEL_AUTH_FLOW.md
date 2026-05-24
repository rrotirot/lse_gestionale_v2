# 🔐 Admin Panel Authentication Flow - Analysis & Schema

## Problem Summary (Ricapitolo)

**Scenario:** L'utente clicca "Pannello Admin" e viene reindirizzato al login invece di accedere.

**Quando succede:**
- ✅ Login iniziale: funziona
- ✅ Pannello Admin (stessa sessione): funziona  
- ❌ Chiudi browser → Riapri → Clicca Admin: **REDIRECT AL LOGIN**

**Perché:**
- Token salvato in localStorage (con "Ricordami" ✓)
- Riapri browser → AuthContext legge il token
- Token viene verificato con `/api/v1/auth/verify`
- **JWT_SECRET mismatch:** Token creato con Secret A, Backend verifica con Secret B
- Verifica JWT fallisce → Token marcato invalido → Cancellato
- Utente reindirizzato al login

---

## 🔄 Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          STEP 1: USER LOGS IN                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

Frontend (Browser)                          Backend (Express)
└─ Login Page                               └─ /api/v1/auth/login
   │                                           │
   │─ Enter username + password                │
   │  ✓ Click "Remember Me"                    │
   │                                           │
   ├─ POST /api/v1/auth/login ────────────────>
   │                                           │
   │                                           ├─ Find user in MongoDB
   │                                           ├─ Check password (bcrypt)
   │                                           │
   │                                           ├─ Generate JWT Token
   │                                           │   └─ Sign with: JWT_SECRET
   │                                           │     (from env or k3s Secret)
   │                                           │
   │                                           └─ Return token + user
   │                                           │
   │<─────────────────────────────────────────┤
   │                                           │
   ├─ Receive: { token, user, ... }           │
   │                                           │
   ├─ Store in localStorage (Remember Me)      │
   │  └─ localStorage.setItem('authToken')     │
   │  └─ localStorage.setItem('rememberMe')    │
   │                                           │
   └─ Set AuthContext: isAuthenticated=true    │
      ✅ User logged in                        │
```

---

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│         STEP 2: SAME SESSION - CLICK ADMIN PANEL (✅ WORKS)                      │
└─────────────────────────────────────────────────────────────────────────────────┘

Frontend (Browser)                          Backend (Express)
└─ Header.jsx                               
   │
   ├─ Pulsante "Pannello Admin" visible
   │  (Because: user.rsiVerified=true AND 
   │             user.organizationRank >= 4)
   │
   ├─ Click button ──────────────────────────>  /admin/discord
   │  └─ window.location.href='/admin/discord'
   │
   ├─ Next.js Router
   │  └─ admin-discord-route.jsx
   │     ├─ Check: isAuthenticated? ✅ YES
   │     │  (Token still in localStorage)
   │     │
   │     ├─ Check: isUserVerified()? ✅ YES
   │     │  (rank >= 4 in memory)
   │     │
   │     └─ Render AdminDiscordPage ✅
   │
   └─ ✅ ADMIN PANEL OPENS
```

---

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│    STEP 3: CLOSE BROWSER - REOPEN (❌ PROBLEM OCCURS HERE)                       │
└─────────────────────────────────────────────────────────────────────────────────┘

CLOSE BROWSER:
└─ sessionStorage cleared
└─ localStorage keeps data (because "Remember Me" was checked)

REOPEN BROWSER:
└─ App starts fresh
   │
   └─ AuthContext.jsx (useEffect on app startup)
      │
      ├─ Check: localStorage.getItem('rememberMe') ✅ YES
      │
      ├─ Read: localStorage.getItem('authToken')
      │  └─ Token FOUND ✅ (e.g., "eyJhbGc...")
      │
      ├─ Call: GET /api/v1/auth/verify
      │  └─ Header: Authorization: Bearer <TOKEN>
      │     └─ Sent to backend
      │
      └─ [CRITICAL MOMENT - BACKEND SIDE]
```

```
                       BACKEND JWT VERIFICATION (THE CRITICAL POINT)

┌─────────────────────────────────────────────────────────────────────────┐
│  backend/server.ts (Line 33)                                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ const JWT_SECRET = process.env.JWT_SECRET ||                   │   │
│  │                    'change_me_in_prod'                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ❌ SCENARIO 1 (PROBLEM):                                              │
│  ├─ process.env.JWT_SECRET is UNDEFINED                               │
│  │  (Backend pod didn't reload k3s Secret)                            │
│  │                                                                     │
│  ├─ JWT_SECRET = 'change_me_in_prod' (FALLBACK)                       │
│  │                                                                     │
│  ├─ Token was signed with: 'dev-jwt-secret-key-...' (k3s value)       │
│  │                                                                     │
│  ├─ jwt.verify(token, 'change_me_in_prod', ...)                       │
│  │  └─ ❌ SIGNATURE MISMATCH!                                          │
│  │  └─ Error: jwt malformed or invalid signature                      │
│  │                                                                     │
│  └─ Response: 403 Forbidden                                           │
│     └─ "Token non valido o scaduto"                                   │
│                                                                         │
│  ✅ SCENARIO 2 (WORKING):                                             │
│  ├─ process.env.JWT_SECRET is DEFINED ✅                             │
│  │  (Backend pod WAS reloaded after k3s Secret update)                │
│  │                                                                     │
│  ├─ JWT_SECRET = 'dev-jwt-secret-key-...' (from k3s)                 │
│  │                                                                     │
│  ├─ jwt.verify(token, 'dev-jwt-secret-key-...', ...)                │
│  │  └─ ✅ SIGNATURE MATCHES!                                          │
│  │  └─ Token decoded successfully                                     │
│  │                                                                     │
│  └─ Response: 200 OK                                                  │
│     └─ { success: true, user: {...} }                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

```
FRONTEND RESPONSE HANDLING:

❌ If Backend Returns 403:
├─ AuthContext.jsx receives: { success: false, error: "Token non valido..." }
│
├─ Code path (line 84-94):
│  if (data.success) {  // ❌ FALSE
│     // ... set auth ...
│  } else {  // ✅ THIS RUNS
│     console.error('Token verification failed on app startup', {...})
│     localStorage.removeItem('authToken')      ← DELETE TOKEN
│     localStorage.removeItem('user')           ← DELETE USER
│     localStorage.removeItem('rememberMe')     ← DELETE REMEMBER ME
│     sessionStorage.removeItem('authToken')
│     sessionStorage.removeItem('user')
│  }
│
├─ isAuthenticated = FALSE
├─ authToken = NULL
├─ user = NULL
│
└─ App renders: <LoginPage />
   │
   └─ ❌ USER REDIRECTED TO LOGIN (PROBLEM!)

✅ If Backend Returns 200:
├─ AuthContext.jsx receives: { success: true, user: {...} }
│
├─ Code path (line 74-80):
│  if (data.success) {  // ✅ TRUE
│     setAuthToken(token)           ← KEEP TOKEN
│     setUser(data.user)            ← SET USER DATA
│     setIsAuthenticated(true)      ← AUTHENTICATED!
│  }
│
├─ isAuthenticated = TRUE
├─ authToken = <TOKEN>
├─ user = <USER_OBJECT>
│
└─ App renders: <HomePage />
   │
   ├─ Can see "Pannello Admin" button
   └─ ✅ CAN ACCESS ADMIN PANEL
```

---

## 🎯 Attack Surface (Where It Can Fail)

```
┌─────────────────────────────────────────────────────────────────┐
│                   FAILURE POINTS                                │
└─────────────────────────────────────────────────────────────────┘

❌ Point 1: Backend JWT_SECRET Loading
├─ Location: backend/server.ts (line 33)
├─ Problem: process.env.JWT_SECRET is undefined
├─ Cause: Pod didn't reload k3s Secret
├─ Fix: kubectl rollout restart deployment/lse-backend
└─ Evidence: Backend logs show "⚠️ WARNING: JWT_SECRET is using default"

❌ Point 2: Token Signature Mismatch
├─ Location: backend/routes/auth.js (line 45)
├─ Problem: jwt.verify() fails
├─ Cause: Token signed with Secret A, verifying with Secret B
├─ Fix: Same as Point 1 (restart pod)
└─ Evidence: Backend logs show "Token verification error"

❌ Point 3: Frontend Token Cleanup
├─ Location: src/context/AuthContext.jsx (line 84-94)
├─ Problem: Invalid token removed from storage
├─ Cause: Backend returned 403
├─ Result: ✅ Correct behavior, but user sees login page
└─ Fix: Fix backend (Point 1 or 2)

❌ Point 4: Admin Route Guard Failure
├─ Location: src/components/app/admin-discord-route.jsx
├─ Problem: isAuthenticated = false
├─ Cause: Token was cleared (Point 3)
├─ Result: Redirect to /login
└─ Fix: Fix backend so token verification passes
```

---

## 📊 State Diagram

```
                    ┌──────────────────┐
                    │   APP STARTS     │
                    │   isAuth = false │
                    └────────┬─────────┘
                             │
                             ├─ Check localStorage for token
                             │
                      ┌──────▼──────┐
                      │ Token Found?│
                      └──┬──────┬───┘
                         │      │
                      YES│      │NO
                         │      │
           ┌─────────────┐│      │┌─────────────┐
           │ Call verify ││      ││isAuth=false │
           │  /api/v1/   ││      ││User=null    │
           │ auth/verify ││      │└─────┬───────┘
           └──────┬──────┘│      │      │
                  │       │      │      │
            ┌─────▼────┐  │      │      │
            │ Backend  │  │      │      │
            │ Response?│  │      │      │
            └──┬────┬──┘  │      │      │
          200 │    │ 403  │      │      │
             YES  NO│     │      │      │
               │    │     │      │      │
       ┌───────▼┐┌──▼───┐ │      │      │
       │isAuth= ││Delete│ │      │      │
       │ true   ││Token │ │      │      │
       │User=OK ││isAuth│ │      │      │
       │        ││=false│ │      │      │
       └───┬────┘└───┬──┘ │      │      │
           │         │    │      │      │
           │     ┌───▼────▼──────▼──────▼──┐
           │     │   RENDER APP           │
           │     ├─ If isAuth=true → Home  │
           │     └─ If isAuth=false→Login  │
           │                              │
           │     ┌──────────────────────┐ │
           └────>│ In Home:             │ │
                 ├─ See Admin Button?  │ │
                 │  (if rsiVerified && │ │
                 │   rank >= 4)        │ │
                 │                    │ │
                 ├─ Click "Pannello"  │ │
                 └────┬────────────────┘ │
                      │                  │
                      ├─ Check Auth ✅    │
                      ├─ Check Verify ✅  │
                      └─ ADMIN PANEL ✅   │
```

---

## 🔍 Root Cause Drill-Down

### Q: Why does "Remember Me" cause the problem?

**Answer:**
```
Remember Me = checked
└─ Token stored in localStorage (survives browser close)

Remember Me = unchecked
└─ Token stored in sessionStorage (cleared when browser closes)
   └─ Can't verify on next open
   └─ User redirects to login automatically
   └─ User logs in again
   └─ All working ✅
```

### Q: Why does it work the first time?

**Answer:**
```
First time (same session):
├─ Token in memory (AuthContext.js)
├─ No backend call needed (uses cached auth state)
└─ Works ✅

Reopening browser:
├─ App fresh start, memory cleared
├─ Must read from localStorage
├─ Must call backend to verify
├─ If backend has wrong JWT_SECRET → fails ❌
```

### Q: How do we fix it?

**Answer:**
```
Option 1 (Recommended): Restart the pod
└─ kubectl rollout restart deployment/lse-backend -n lse-gestionale

Option 2: Check if Secret is correct
├─ Verify k3s Secret has JWT_SECRET defined
├─ Verify pod reads it: kubectl logs -n lse-gestionale <pod>
├─ Look for: "✓ JWT_SECRET loaded from environment"

Option 3: Generate new prod secret
├─ openssl rand -base64 32
├─ Update k3s Secret with new value
├─ Restart pod (option 1)
└─ All existing tokens become invalid (users need to login again)
```

---

## 📋 Verification Checklist

To confirm the problem is fixed:

- [ ] Backend logs show: `✓ JWT_SECRET loaded from environment (length: 43 chars)`
- [ ] NOT: `⚠️ WARNING: JWT_SECRET is using default value "change_me_in_prod"`
- [ ] Login → Verify (same session) → Admin Panel ✅ Works
- [ ] Login → Close browser → Reopen → Admin Panel ✅ Works
- [ ] Browser console (F12) has NO "Token verification failed" errors
- [ ] No 403 responses in Network tab for `/api/v1/auth/verify`
- [ ] Multiple users can access admin panel after browser restart
- [ ] Token persists with "Remember Me" checked ✅

---

## 🎓 What We Learned

1. **JWT Secret Mismatch** is the root cause
2. **Docker-only development** doesn't have this issue (secret is local)
3. **k3s Production** requires pod restart after secret updates
4. **Logging** is critical for diagnosing this issue
5. **Token verification** happens automatically on app startup

---

See also:
- [FIXJWT_PRODUCTION.md](FIXJWT_PRODUCTION.md) - How to fix in production
- [DOCKER_ONLY_LOCAL.md](DOCKER_ONLY_LOCAL.md) - Local development (no this issue)
- [DEVELOPMENT.md](DEVELOPMENT.md) - Dev vs Prod comparison
