# Guida al Deployment — Backend

Questo documento descrive come deployare il backend in ambienti di staging e produzione.

## Prerequisiti

- Docker e Docker Compose installati
- Accesso al repository GitHub e permessi di push (per CI/CD)
- (Opzionale) Account GHCR (GitHub Container Registry) per immagini private

## Variabili d'ambiente richieste

Consulta `backend/SECRETS.md` per la lista completa. Le variabili critiche sono:

| Variabile      | Ambiente    | Esempio                                                  | Note                                    |
|----------------|-------------|----------------------------------------------------------|-----------------------------------------|
| `MONGODB_URI`  | Tutti       | `mongodb+srv://user:pwd@cluster.mongodb.net/gentionale`  | Obbligatorio per accedere ai dati      |
| `JWT_SECRET`   | Produzione  | `(genera con openssl rand -base64 32)`                   | OBBLIGATORIO in produzione              |
| `API_KEY`      | Opzionale   | `(genera con openssl rand -base64 32)`                   | Per integrazioni bot Discord            |
| `NODE_ENV`     | Tutti       | `development` \| `production`                            | Abilita validazioni strikte in prod     |
| `CORS_ORIGIN`  | Produzione  | `https://app.example.com`                                | Limitare a dominio frontend in prod     |

## Setup GitHub Secrets (per CI/CD)

Per far funzionare il workflow CI che builda e pubblica su GHCR, configura i seguenti segreti:

1. Vai su GitHub: `Settings` > `Secrets and variables` > `Actions`
2. Aggiungi i segreti:

```bash
JWT_SECRET=<output di: openssl rand -base64 32>
API_KEY=<output di: openssl rand -base64 32>
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/gentionale?retryWrites=true&w=majority
```

**Nota**: `GITHUB_TOKEN` è creato automaticamente e fornisce accesso a GHCR.

## Comandi npm per Docker

Sono disponibili script npm per semplificare le operazioni Docker:

```bash
# Build l'immagine Docker (senza cache)
npm run docker:build

# Avvia i container in background
npm run docker:up

# Ferma e rimuove i container + volumi
npm run docker:down

# Mostra i log del backend in real-time
npm run docker:logs

# Esegui lo smoke test dentro il container
npm run docker:test

# Pulizia totale (container + volumi + immagini inutilizzate)
npm run docker:clean
```

## Setup locale con docker-compose

```bash
git clone https://github.com/rrotirot/gentionale-lse.git
cd gentionale-lse/backend
cp .env.docker.example .env
# Modifica i valori in .env se necessario (JWT_SECRET, MONGODB_URI, ecc.)
```

### 2. Avviare i container

```bash
# In background (-d)
docker compose up -d --build

# Oppure in foreground (per vedere i log)
docker compose up --build
```

### 3. Verificare lo stato

```bash
# Controllare container in esecuzione
docker compose ps

# Vedere i log
docker compose logs -f backend

# Testare l'health endpoint
curl http://localhost:5000/api/health
```

### 4. Eseguire i test

```bash
# Test locale (dal host)
cd backend
node tests/smoke-test-v2.js

# Test dentro il container
docker compose exec backend node tests/smoke-test-v2.js
```

### 5. Spegnere

```bash
# Fermare e rimuovere container + volumi
docker compose down -v
```

## Deployment in staging (CI/CD automatico)

Quando fai push su branch `develop` o `prova-integrazione-e-risoluzione` con modifiche in `backend/**`:

1. GitHub Actions avvia il workflow `docker-build-and-test.yml`:
   - Builda l'immagine Docker
   - Esegue i smoke test in container
   - Pubblica l'immagine su GHCR (se i test passano)

2. L'immagine è disponibile come:
   ```
   ghcr.io/rrotirot/gentionale-backend:latest
   ghcr.io/rrotirot/gentionale-backend:<commit-sha>
   ```

3. Per deployare su un server di staging:

```bash
# Pull dell'immagine
docker pull ghcr.io/rrotirot/gentionale-backend:latest

# Run
docker run -d --name backend-staging \
  -e MONGODB_URI=<uri-atlas> \
  -e JWT_SECRET=<segreto> \
  -e NODE_ENV=production \
  -p 5000:5000 \
  ghcr.io/rrotirot/gentionale-backend:latest
```

## Deployment in produzione (Raccomandato)

### Opzione 1: Docker Compose (semplice)

1. Su un server VPS/cloud (Ubuntu 22.04+):

```bash
mkdir -p /opt/gentionale-backend
cd /opt/gentionale-backend

# Scarica docker-compose.yml e Dockerfile dalla release
wget https://github.com/rrotirot/gentionale-lse/releases/download/v1.0.0/docker-compose.yml
wget https://github.com/rrotirot/gentionale-lse/releases/download/v1.0.0/Dockerfile

# Crea .env.production
cat > .env.production << EOF
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/gentionale?retryWrites=true&w=majority
JWT_SECRET=<genera con: openssl rand -base64 32>
API_KEY=<genera con: openssl rand -base64 32>
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://app.example.com
EOF

# Avvia
docker compose -f docker-compose.production.yml up -d --build
```

2. Crea `docker-compose.production.yml` (senza MongoDB embedded):

```yaml
version: '3.8'
services:
  backend:
    build: .
    restart: always
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - API_KEY=${API_KEY}
      - CORS_ORIGIN=${CORS_ORIGIN}
    ports:
      - "5000:5000"
    volumes:
      - ./logs:/usr/src/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

### Opzione 2: Kubernetes (avanzato)

Se usi K8s, puoi usare la versione GHCR dell'immagine. Esempio deployment minimal:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gentionale-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gentionale-backend
  template:
    metadata:
      labels:
        app: gentionale-backend
    spec:
      containers:
      - name: backend
        image: ghcr.io/rrotirot/gentionale-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: backend-secrets
              key: mongodb-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: backend-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 10
```

## Monitoraggio e Logging

Il backend logga su:
- **Console**: in tempo reale (stdout)
- **File**: `backend/logs/combined.log` e `backend/logs/error.log` (rotazione automatica ogni 5MB)

Per visualizzare i log in container:

```bash
docker compose logs -f backend
# oppure
docker logs -f container-name
```

## Troubleshooting

### ❌ "Cannot find module undici"
**Causa**: Immagine Node.js troppo vecchia (< 18).  
**Soluzione**: Assicurati di usare `node:20-alpine` nel `Dockerfile`.

### ❌ "ReferenceError: JWT_SECRET not found"
**Causa**: In `NODE_ENV=production`, `JWT_SECRET` non è configurato.  
**Soluzione**: Imposta `JWT_SECRET` prima di avviare (opzione `-e JWT_SECRET=...` in `docker run`).

### ❌ "MongoDB connection failed"
**Causa**: `MONGODB_URI` errato o server non raggiungibile.  
**Soluzione**: Controlla la connection string, firewall, IP whitelist (se Atlas).

### ❌ "CORS error from frontend"
**Causa**: `CORS_ORIGIN` non include il dominio del frontend.  
**Soluzione**: Aggiungi il dominio frontend a `CORS_ORIGIN` (es. `https://app.example.com`).

## Aggiornamenti e Rollback

### Aggiornare a una nuova versione

```bash
# Pull l'ultima immagine dal workflow CI
docker pull ghcr.io/rrotirot/gentionale-backend:latest

# Ferma l'istanza corrente
docker compose down

# Aggiorna .env se necessario
# ...

# Avvia la nuova versione
docker compose up -d
```

### Rollback a una versione precedente

```bash
# Scarica una versione specifica (es. commit SHA)
docker pull ghcr.io/rrotirot/gentionale-backend:<commit-sha>

# Stop e avvia con la vecchia versione
docker compose down
docker compose up -d -e IMAGE=ghcr.io/rrotirot/gentionale-backend:<commit-sha>
```

## Performance e Best Practices

1. **Limiti di risorsa**: In produzione imposta limiti CPU/RAM in `docker-compose`:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 512M
       reservations:
         cpus: '0.5'
         memory: 256M
   ```

2. **Rate limiting**: Il backend include rate limiting globale (100 req/15min). Adatta i limiti se necessario in `server.js`.

3. **HTTPS/TLS**: Usa un reverse proxy (nginx, Caddy) davanti al backend per terminare il TLS in produzione.

4. **Backup MongoDB**: Configura backup automatico in MongoDB Atlas o usa `mongodump` periodicamente.

5. **Logging**: Monitora `error.log` per errori; aggiungi uno strumento di aggregazione log (ELK, Datadog, etc.) per produzione.

---

Per domande, consulta:
- `backend/ANALISI_BACKEND_v2.md` — architettura e roadmap
- `backend/SECRETS.md` — gestione segreti
- `.github/workflows/docker-build-and-test.yml` — workflow CI/CD