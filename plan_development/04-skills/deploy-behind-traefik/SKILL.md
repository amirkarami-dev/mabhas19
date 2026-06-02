---
name: deploy-behind-traefik
description: Use when deploying a Dockerized web + API stack to a server that sits behind an EXISTING shared Traefik and cannot reach mcr.microsoft.com / Docker Hub's blob CDN — build the api/web images locally, ship them via docker save | gzip + pscp + docker load, attach to Traefik's external network with its cert resolver, pull DB/object-store images through the docker.arvancloud.ir mirror, recreate only changed services, and never restart the shared daemon.
---

# Deploy Behind an Existing Traefik (image-transfer, blocked registries)

The target server runs **other production stacks** behind a **shared Traefik** and **cannot pull from
`mcr.microsoft.com` or Docker Hub's blob CDN**. So: build the `api`/`web` images **locally** (where those
registries are reachable), transfer them as gzipped tarballs over SSH, `docker load`, and bring up only the
app services on the existing Traefik network. Base images (DB, object store) come from the
`docker.arvancloud.ir` mirror. Replace `<app>`, `<server-ip>`, `<ssh-user>`, `<srv-path>`, the `*_DOMAIN`s,
and the cert resolver name.

## Prerequisites / invariants

- Server has Docker + a running Traefik that owns ports 80/443, an **external network named `traefik`**, and
  a cert resolver (e.g. `myresolver`, ArvanCloud DNS challenge). Your stack **attaches** to these; it does
  **not** run its own Traefik.
- SSH via PuTTY `plink` / `pscp -pw` (no `sshpass`).
- `deploy/.env` on the server holds all runtime **secrets** (passwords, client IDs, tokens). App config is
  **baked into the image** at build time, so an image-only deploy needs **no `git pull` on the server**.
- **Never `docker restart`/`systemctl restart docker`** — it would take down the co-tenant stacks
  (e.g. mailcow, supabase). Only `compose up -d` the `api`/`web` services.

## Workflow

### 1. The server compose file attaches to Traefik + uses the mirror

`deploy/docker-compose.server.yml` declares the `traefik` network as `external` and routes each service via
Traefik labels. DB/object-store images are pulled through `docker.arvancloud.ir`. (The .NET base image for
the API can't be mirrored, so that image is shipped from local in step 2.)

```yaml
services:
  api:
    image: <app>-api:deploy                 # loaded from a transferred tarball (mcr is blocked)
    restart: unless-stopped
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__<DbName>: "Server=sqlserver,1433;Database=<DbName>;User Id=sa;Password=${MSSQL_SA_PASSWORD};TrustServerCertificate=True;"
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik"
      - "traefik.http.routers.<app>api.rule=Host(`${API_DOMAIN}`)"
      - "traefik.http.routers.<app>api.entrypoints=websecure"
      - "traefik.http.routers.<app>api.tls.certresolver=myresolver"
      - "traefik.http.services.<app>api.loadbalancer.server.port=8080"
    networks: [internal, traefik]

  web:
    image: <app>-web:deploy
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_BASE: "https://${API_DOMAIN}"
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik"
      - "traefik.http.routers.<app>web.rule=Host(`${WEB_DOMAIN}`)"
      - "traefik.http.routers.<app>web.entrypoints=websecure"
      - "traefik.http.routers.<app>web.tls.certresolver=myresolver"
      - "traefik.http.services.<app>web.loadbalancer.server.port=3000"
    networks: [traefik]

  minio:
    image: docker.arvancloud.ir/minio/minio:latest      # mirror — Docker Hub blob CDN is blocked
    # ... (object store, also Traefik-routed for presigned URLs)

networks:
  traefik:
    external: true                          # provided by the server's /srv/traefik
  internal:
    driver: bridge
```

> The .NET API honours `X-Forwarded-*` from Traefik (`UseForwardedHeaders`) and advertises HSTS itself,
> since TLS terminates at the proxy. Object storage is reached via its **public host** so presigned
> download URLs are valid for browsers.

### 2. Build the images locally (where mcr / Docker Hub work)

The build context is the **repo root** (monorepo). The web Dockerfile drops the Expo `mobile` workspace and
uses Next.js `output: "standalone"`; the API Dockerfile multi-stages `sdk` → `aspnet` and installs the PDF
native deps.

```powershell
docker build -f deploy/Dockerfile.api -t <app>-api:deploy .
docker build -f deploy/Dockerfile.web -t <app>-web:deploy .
```

### 3. Save + gzip + transfer

```powershell
docker save <app>-api:deploy | gzip > <app>-api-deploy.tar.gz
docker save <app>-web:deploy | gzip > <app>-web-deploy.tar.gz

pscp -pw "<SERVER_PWD>" <app>-api-deploy.tar.gz <ssh-user>@<server-ip>:<srv-path>/
pscp -pw "<SERVER_PWD>" <app>-web-deploy.tar.gz <ssh-user>@<server-ip>:<srv-path>/
```

### 4. Load + recreate ONLY the changed services

`docker load` the tarballs, then bring up just `api`/`web`. The DB/object-store containers and the shared
daemon are left untouched. Use `--no-deps` so a single changed service is recreated without touching its
dependencies, and `--remove-orphans` to prune containers dropped from the compose file.

```powershell
plink -pw "<SERVER_PWD>" <ssh-user>@<server-ip> "cd <srv-path> && \
  gunzip -c <app>-api-deploy.tar.gz | docker load && \
  gunzip -c <app>-web-deploy.tar.gz | docker load && \
  docker compose -f deploy/docker-compose.server.yml --env-file deploy/.env up -d --no-deps --remove-orphans api web"
```

(First-time bring-up of the DB/object store: run the same `compose up -d` for those services once — their
images come from the `docker.arvancloud.ir` mirror. The API applies EF Core migrations on startup.)

## Verification

```powershell
# Stack status + API logs (watch the EF migration apply)
plink -pw "<SERVER_PWD>" <ssh-user>@<server-ip> "cd <srv-path> && \
  docker compose -f deploy/docker-compose.server.yml ps && \
  docker compose -f deploy/docker-compose.server.yml logs --tail=50 api"

# Live endpoints (TLS via the shared Traefik)
curl.exe -fsS https://<API_DOMAIN>/alive          # API health
curl.exe -fsSI https://<WEB_DOMAIN>/               # web returns 200 with a valid cert
```

- `docker compose ps` shows `api`/`web` `Up` and the DB `healthy`; co-tenant stacks remain untouched.
- The API log shows migrations applied (and admin seeding if configured).
- Both domains serve over HTTPS with a valid Traefik-issued certificate; object-store presigned URLs (if
  used) resolve from a browser.
