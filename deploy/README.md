# Mabhas19 — Deployment

Production stack: **Traefik** (TLS) → **Next.js web** + **.NET API**, with **PostgreSQL** and **MinIO (S3)**.

## Domains / DNS (Arvancloud)

Create these **A records** pointing to the server `10.249.52.216`:

| Subdomain                     | Purpose                          |
|-------------------------------|----------------------------------|
| `mabhas19.myceo.ir`           | Web frontend (Next.js)           |
| `api.mabhas19.myceo.ir`       | **Backend API** (.NET)           |
| `s3.mabhas19.myceo.ir`        | MinIO S3 (presigned report URLs) |
| `minio.mabhas19.myceo.ir`     | MinIO console (optional)         |

> **Backend domain you asked about:** use **`api.mabhas19.myceo.ir`**. The frontend talks to it via
> `NEXT_PUBLIC_API_BASE`. `s3.*` is needed so generated PDF report download links are reachable from the browser.
>
> If Arvancloud's CDN/proxy ("cloud") is enabled (orange icon), turn it **off** (DNS-only / grey) for
> `api.*` and `s3.*`, otherwise the ACME HTTP-01 challenge and large uploads may fail.

## Server prerequisites

The server already has Docker + Traefik per your note. Two options:

### Option A — Use the bundled Traefik (simplest, if no other Traefik is running)
The provided `docker-compose.yml` includes Traefik and obtains Let's Encrypt certificates automatically.
Make sure nothing else is bound to ports 80/443.

### Option B — Attach to an existing Traefik
If Traefik is already running on the server:
1. Delete the `traefik:` service block from `docker-compose.yml`.
2. Add the existing Traefik network as `external` and put `api`/`web`/`minio` on it, e.g.:
   ```yaml
   networks:
     mabhas19:
       external: true
       name: <existing-traefik-network>
   ```
3. Keep the `traefik.*` labels (adjust the `certresolver` name to match your Traefik config).

## Deploy

> The generic flow below (rsync the repo + build on the server) only works on a server that can reach
> `mcr.microsoft.com` / Docker Hub. **The live `myceo.ir` server cannot** — use the
> **Production deploy (image transfer)** section further down instead.

```bash
# 1) Copy the repo to the server (from your machine)
rsync -az --exclude bin --exclude obj --exclude node_modules --exclude .next \
  ./ admin1@10.249.52.216:/opt/mabhas19/

# 2) On the server
ssh admin1@10.249.52.216
cd /opt/mabhas19
cp deploy/.env.example deploy/.env
nano deploy/.env            # set strong passwords, ACME_EMAIL, GOOGLE_CLIENT_ID, SMS_*, etc.

# 3) Build & start
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build

# 4) Watch logs
docker compose -f deploy/docker-compose.yml logs -f api
```

The API applies EF Core migrations on start and seeds an administrator from `AdminUser:Email` /
`AdminUser:Password` (set via `deploy/.env`). If those are not configured, admin seeding is skipped —
**no default password is baked into the image.**

## Production deploy (live server — local build + image transfer)

The live server (`10.249.52.216`, `/srv/mabhas19`) runs **SQL Server + MinIO** behind an **existing shared
Traefik** (external network `traefik`, cert resolver `myresolver`) and **cannot reach `mcr.microsoft.com` /
Docker Hub's blob CDN**. So the `api`/`web` images are **built locally and shipped** via `docker save`/`load`
rather than built on the server. The box also hosts other production stacks (mailcow, supabase) —
**never restart the shared Docker daemon**; only `compose up -d` the `api`/`web` services.

Uses `docker-compose.server.yml` with secrets from `deploy/.env`. SSH is via PuTTY `plink`/`pscp` (no `sshpass`).

```powershell
# 1) Build the images locally (where mcr/Docker Hub are reachable; the API build needs apt access for its PDF deps)
docker build -f deploy/Dockerfile.api -t mabhas19-api:deploy .
docker build -f deploy/Dockerfile.web -t mabhas19-web:deploy .

# 2) Save + gzip
docker save mabhas19-api:deploy | gzip > mabhas19-api-deploy.tar.gz
docker save mabhas19-web:deploy | gzip > mabhas19-web-deploy.tar.gz

# 3) Transfer to the server
pscp -pw "<SERVER_PWD>" mabhas19-api-deploy.tar.gz admin1@10.249.52.216:/srv/mabhas19/
pscp -pw "<SERVER_PWD>" mabhas19-web-deploy.tar.gz admin1@10.249.52.216:/srv/mabhas19/

# 4) Load + (re)start ONLY api/web — SQL/MinIO and the shared daemon are left untouched
plink -pw "<SERVER_PWD>" admin1@10.249.52.216 "cd /srv/mabhas19 && \
  gunzip -c mabhas19-api-deploy.tar.gz | docker load && \
  gunzip -c mabhas19-web-deploy.tar.gz | docker load && \
  docker compose -f deploy/docker-compose.server.yml --env-file deploy/.env up -d api web"

# 5) Verify (watch for the EF migration applying; then hit the live endpoints)
plink -pw "<SERVER_PWD>" admin1@10.249.52.216 "cd /srv/mabhas19 && \
  docker compose -f deploy/docker-compose.server.yml ps && \
  docker compose -f deploy/docker-compose.server.yml logs --tail=50 api"
curl.exe -fsS https://api.mabhas19.myceo.ir/alive
```

- **Config is baked into the image** at build time (`appsettings.json` — e.g. CORS allowlist defaults to
  `https://mabhas19.myceo.ir`); runtime **secrets** come from `deploy/.env` via `docker-compose.server.yml`,
  so an image-only deploy needs **no `git pull` on the server**.
- Base images for SQL Server / MinIO are pulled on the server through the `docker.arvancloud.ir` mirror.

## Local development

```bash
docker compose -f deploy/docker-compose.dev.yml up -d     # Postgres + MinIO
dotnet run --project src/Web                              # API on http://localhost:5000 (see launchSettings)
cd web && npm install && npm run dev                      # Web on http://localhost:3000
```

## Notes

- **PDF fonts:** the API image installs/bundles Vazirmatn for Persian PDF rendering. To guarantee it,
  drop `Vazirmatn-Regular.ttf`/`-Bold.ttf` into `deploy/fonts/` before building.
- **MediatR licensing:** MediatR v14 (used by the Clean Architecture template) requires a commercial
  license for production use. Obtain one from luckypennysoftware.com or pin/replace before going live.
- **Security advisories:** the template's transitive packages (`OpenTelemetry`, `System.Security.Cryptography.Xml`)
  currently emit NuGet audit warnings — bump them when fixed upstream versions are available.
