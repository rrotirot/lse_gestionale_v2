# Guida Configurazione MongoDB Remoto

Questa guida spiega come configurare il progetto per utilizzare un database MongoDB remoto (MongoDB Atlas o server dedicato).

## ✅ Supporto Completo

Il progetto è ora completamente compatibile con:
- **MongoDB Atlas** (cloud, raccomandato)
- **MongoDB su server dedicato**
- **MongoDB locale** (sviluppo)

## Caratteristiche Implementate

- ✅ Retry automatico in caso di errori di connessione
- ✅ Timeout ottimizzati per connessioni remote
- ✅ Supporto TLS/SSL automatico per MongoDB Atlas
- ✅ Gestione errori migliorata con messaggi informativi
- ✅ Riconnessione automatica in caso di disconnessione
- ✅ Rilevamento automatico del tipo di connessione (Atlas/Remoto/Locale)

## Configurazione MongoDB Atlas

### 1. Crea un Cluster su MongoDB Atlas

1. Vai su [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crea un account gratuito (M0 Free Tier disponibile)
3. Crea un nuovo cluster
4. Attendi che il cluster sia pronto (circa 3-5 minuti)

### 2. Configura Accesso

1. Vai su **Database Access** → **Add New Database User**
2. Crea un utente con username e password
3. Assegna il ruolo `Atlas admin` o `Read and write to any database`

### 3. Configura Network Access

1. Vai su **Network Access** → **Add IP Address**
2. Per sviluppo: aggiungi `0.0.0.0/0` (permetti tutti gli IP) ⚠️ **Solo per sviluppo**
3. Per produzione: aggiungi solo il tuo IP o gli IP del tuo server

### 4. Ottieni la Connection String

1. Vai su **Database** → **Connect**
2. Seleziona **Connect your application**
3. Copia la connection string (formato: `mongodb+srv://username:password@cluster.mongodb.net/`)
4. Sostituisci `<password>` con la password del database user
5. Aggiungi il nome del database alla fine: `/lse-members`

**Esempio completo:**
```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/lse-members?retryWrites=true&w=majority
```

### 5. Configura il File .env

Crea o modifica il file `backend/.env`:

```env
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/lse-members?retryWrites=true&w=majority
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
```

## Configurazione MongoDB Remoto (Server Dedicato)

### 1. Formato Connection String

Per un server MongoDB remoto, usa questo formato:

```
mongodb://username:password@host:port/database?options
```

**Esempio:**
```
mongodb://admin:mypassword@mongodb.example.com:27017/lse-members?authSource=admin
```

### 2. Opzioni Comuni

- `authSource=admin` - Database di autenticazione (spesso `admin`)
- `retryWrites=true` - Abilita retry per operazioni di scrittura
- `w=majority` - Write concern (aspetta conferma dalla maggioranza)

### 3. Configura il File .env

```env
MONGODB_URI=mongodb://admin:mypassword@mongodb.example.com:27017/lse-members?authSource=admin
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
```

## Verifica Connessione

Dopo aver configurato il file `.env`, avvia il server:

```bash
cd backend
npm start
```

Dovresti vedere un messaggio simile:

```
🌐 Rilevata connection string MongoDB Atlas
✅ Connesso a MongoDB
   Database: lse-members
   Host: cluster0.xxxxx.mongodb.net
   Tipo: MongoDB Atlas (Cloud)
```

## Risoluzione Problemi

### Errore: "MongoServerSelectionError"

**Possibili cause:**
1. **IP non nella whitelist** (MongoDB Atlas)
   - Soluzione: Aggiungi il tuo IP in Network Access su Atlas

2. **Credenziali errate**
   - Soluzione: Verifica username e password nella connection string

3. **Connection string errata**
   - Soluzione: Controlla che la connection string sia completa e corretta

4. **Firewall/Network**
   - Soluzione: Verifica che la porta 27017 (o 27017-27019 per Atlas) sia aperta

### Errore: "Authentication failed"

- Verifica username e password
- Per MongoDB remoto, verifica il parametro `authSource`

### Timeout di Connessione

- Verifica la connessione internet
- Controlla che il server MongoDB sia raggiungibile
- Per Atlas, verifica che il cluster sia attivo

## Sicurezza

### ⚠️ Best Practices

1. **Non committare il file `.env`** (già nel `.gitignore`)
2. **Usa password complesse** per il database user
3. **Limita gli IP nella whitelist** (non usare `0.0.0.0/0` in produzione)
4. **Cambia il JWT_SECRET** in produzione
5. **Usa variabili d'ambiente** invece di hardcoded values

### Per Produzione

- Usa MongoDB Atlas M10 o superiore (non il free tier)
- Configura backup automatici
- Abilita monitoring e alerting
- Usa connection pooling se necessario
- Considera l'uso di un VPN per MongoDB remoto

## Test della Connessione

Puoi testare la connessione MongoDB direttamente usando il comando:

```bash
# Se hai mongosh installato
mongosh "mongodb+srv://username:password@cluster.mongodb.net/lse-members"
```

Oppure usa un client MongoDB come:
- MongoDB Compass
- Studio 3T
- Robo 3T

## Supporto

Se riscontri problemi, controlla:
1. I log del server per messaggi di errore dettagliati
2. La connection string nel file `.env`
3. Le impostazioni di Network Access (per Atlas)
4. La documentazione ufficiale MongoDB

