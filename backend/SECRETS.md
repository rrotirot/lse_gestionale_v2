# Gestione Segreti — Backend

Questo file documenta i segreti e le variabili d'ambiente richieste per eseguire il backend in ambiente di CI/CD e in produzione.

## Segreti GitHub consigliati
- `MONGODB_URI` (opzionale per CI locali; però raccomandato in produzione)
  - Esempio: `mongodb+srv://<user>:<password>@cluster.mongodb.net/gentionale?retryWrites=true&w=majority`
  - In CI di integrazione locale (workflow) il workflow usa un container MongoDB; per ambienti di staging/prod impostare `MONGODB_URI` su una istanza esterna.

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
- Il workflow `docker-build-and-test.yml` usa `secrets.JWT_SECRET` (per passarlo al container backend). Se `JWT_SECRET` non è impostato, il container riceverà una variabile vuota e — se `NODE_ENV=production` — il server effettuerà il fail-fast.
- Per i test CI locali il workflow avvia un container `mongo:6.0` e passa la connection string interna, quindi `MONGODB_URI` non è strettamente necessario per il job di integrazione.

## Raccomandazioni per produzione
- Non committare mai valori reali in `.env` files nel repo.
- Usa un secrets manager (GitHub Secrets, AWS Secrets Manager, HashiCorp Vault) e rotazione periodica dei segreti.
- Limitare le persone con accesso ai segreti e abilitare l'accesso tramite policy al minimo necessario.

## Esempio rapido per GitHub Actions
Nel workflow, per passare il segreto al container:
```yaml
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  API_KEY: ${{ secrets.API_KEY }}
```

Poi nel comando `docker run` passare le variabili usando `${JWT_SECRET}`.

---

Se vuoi, posso anche preparare una pull request template o un file `README.DEPLOY.md` con istruzioni passo-passo per il deploy su un ambiente di staging/production (incluso GHCR + GitHub Actions).