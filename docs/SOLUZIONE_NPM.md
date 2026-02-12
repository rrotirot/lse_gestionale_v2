# Soluzione Problema NPM su PowerShell

## ✅ Stato Attuale
**Il problema è stato risolto!** `npm` ora funziona correttamente in PowerShell.

Puoi usare `npm` normalmente:
```powershell
npm --version  # ✅ Funziona!
npm install
npm run dev
```

## Problema (Risolto)
PowerShell bloccava l'esecuzione di `npm` a causa della Execution Policy. Questo problema è stato risolto configurando correttamente la policy di esecuzione.

## Soluzioni

### Soluzione 1: Usa `npm.cmd` invece di `npm`
Invece di digitare `npm`, usa `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd start
```

### Soluzione 2: Cambia la Execution Policy (per la sessione corrente)
Esegui questo comando in PowerShell come amministratore:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Soluzione 3: Usa Command Prompt (cmd) invece di PowerShell
Apri `cmd` invece di PowerShell e usa normalmente `npm`:

```cmd
npm install
npm run dev
```

### Soluzione 4: Esegui npm tramite cmd da PowerShell
```powershell
cmd /c npm install
cmd /c npm run dev
```

## Verifica Installazione

Le dipendenze sono già installate correttamente:
- ✅ Frontend: tutte le dipendenze installate
- ✅ Backend: tutte le dipendenze installate

## Comandi per Avviare il Progetto

### Frontend (dalla root del progetto):
```powershell
npm run dev
```

### Backend (dalla cartella backend):
```powershell
cd backend
npm start
```

> **Nota:** Se in futuro dovessi riscontrare nuovamente problemi con la Execution Policy, puoi usare le soluzioni alternative elencate sopra (npm.cmd o cmd /c).

