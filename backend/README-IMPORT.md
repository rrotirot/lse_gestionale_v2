# Importazione Eventi dal Bot Discord

Questo script permette di importare eventi dal formato CSV del bot Discord nel database dell'applicazione.

## Uso

### Metodo 1: Script NPM (consigliato)

```bash
cd backend
npm run import-events ../test_event/activities.csv
```

### Metodo 2: Diretto

```bash
cd backend
node import-bot-events.js ../test_event/activities.csv
```

### Con URL API personalizzato

```bash
node import-bot-events.js ../test_event/activities.csv http://localhost:5000
```

### Con token di autenticazione

```bash
node import-bot-events.js ../test_event/activities.csv http://localhost:5000 <token>
```

### Con variabili d'ambiente

```bash
export VITE_RSI_API_URL=http://localhost:5000
export AUTH_TOKEN=<token>
node import-bot-events.js ../test_event/activities.csv
```

## Formato CSV

Il CSV deve avere le seguenti colonne:
- `id`: ID univoco dell'attività
- `title`: Titolo dell'evento
- `description`: Descrizione (può contenere newline)
- `location`: Luogo dell'evento
- `datetime_input`: Data nel formato "DD/MM/YYYY HH:mm"
- `scheduled_start_time_iso`: Data in formato ISO (opzionale, preferito se presente)
- `config_json`: Configurazione JSON (per determinare il tipo di evento)
- `creator_id`: ID del creatore (opzionale)

## Conversione Automatica

Lo script converte automaticamente:
- Date da formato "DD/MM/YYYY HH:mm" a ISO
- Estrae l'orario dalla data
- Determina il tipo di evento dal `config_json` (se `type: "activity"` → `"attività"`)
- Evita duplicati: se esiste già un evento con lo stesso titolo e data, lo aggiorna

## Esempio

```bash
# Importa eventi dal file CSV
npm run import-events ../test_event/activities.csv

# Output:
# 📥 Importazione eventi dal bot Discord...
#    File CSV: ../test_event/activities.csv
#    API URL: http://localhost:5000
# 
# 📖 Lettura e parsing del CSV...
# ✅ Trovate 1 attività nel CSV
# 
# 📤 Invio richiesta all'API...
# 
# ✅ Importazione completata!
#    Eventi importati: 1
# 
# 📋 Eventi importati:
#    - ✅ Creato: CALL TO ARMS EVENTO DI ORG
```





