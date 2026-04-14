# Gestione Segreti — Backend

Questo file documenta i segreti e le variabili d'ambiente richieste per eseguire il backend in ambiente di CI/CD e in produzione.

## Segreti GitHub consigliati
- `MONGODB_URI` (opzionale per CI locali; però raccomandato in produzione)
  - Esempio: `mongodb+srv://<user>:<password>@cluster.mongodb.net/gentionale?retryWrites=true&w=majority`
  - In CI di integrazione locale puoi usare MongoDB locale/ephemerale; per ambienti di staging/prod impostare `MONGODB_URI` su una istanza esterna.

- `JWT_SECRET` (OBBLIGATORIO in produzione)
  - Stringa segreta per firmare i JWT. Generare con: `openssl rand -base64 32`.
  - In GitHub: `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`.

- `API_KEY` (opzionale)
  - API key usata per autenticare bot/integrazioni. Se usata, impostare come secret.

## Come aggiungere i segreti su GitHub (passaggi)
1. Vai alla pagina del repository su GitHub.
2. Click su `Settings` > `Secrets and variables` > `Actions`.
3. Click su `New repository secret`.
4. Inserisci il nome (es. `JWT_SECRET`) e il valore (stringa segreta), poi `Add secret`.

## Note sul workflow CI
- Se usi GitHub Actions, passa `JWT_SECRET` e gli altri segreti tramite `secrets.*` come variabili d'ambiente ai job.

## Raccomandazioni per produzione
- Non committare mai valori reali in `.env` files nel repo.
- Usa un secrets manager (GitHub Secrets, AWS Secrets Manager, HashiCorp Vault) e rotazione periodica dei segreti.
- Limitare le persone con accesso ai segreti e abilitare l'accesso tramite policy al minimo necessario.

## Esempio rapido per GitHub Actions
Nel workflow, per passare i segreti al job:
```yaml
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  API_KEY: ${{ secrets.API_KEY }}
```

Poi nei comandi di avvio passa le variabili usando l'ambiente del sistema / runner CI.

---

Se vuoi, posso anche preparare una guida di deploy per staging/production (Node + process manager + reverse proxy).