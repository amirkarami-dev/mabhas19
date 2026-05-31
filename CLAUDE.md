# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mabhas19 (مبحث ۱۹) — a full‑stack web app for Iran's National Building Code **Section 19, Appendix 5 (5th ed.)** building‑energy assessment. .NET 10 Clean Architecture backend + Next.js 16 frontend, SQL Server, MinIO (S3), Persian/RTL.

## Commands

### Backend (.NET 10, solution `Mabhas19.slnx`)
```bash
docker compose -f deploy/docker-compose.dev.yml up -d   # SQL Server (sa) + MinIO (minioadmin) — needed to run the API
dotnet build Mabhas19.slnx                              # build all
dotnet run --project src/Web                            # API on http://localhost:5000  (Scalar docs at /scalar)
dotnet test                                             # all tests
dotnet test tests/Domain.UnitTests/Domain.UnitTests.csproj   # one project
dotnet test --filter "FullyQualifiedName~ClimateDataTests"   # one test/class
```
Build output goes to `./artifacts/` (not `bin/obj`, via `ArtifactsPath` in `Directory.Build.props`).

EF Core migrations (the `dotnet-ef` global tool MUST match EF Core 10 — `dotnet tool update -g dotnet-ef --version "10.0.*"`):
```bash
dotnet ef migrations add <Name> --project src/Infrastructure --startup-project src/Web --output-dir Data/Migrations
```
Migrations are applied automatically on API startup (every environment) by `ApplicationDbContextInitialiser`, which also seeds the `Administrator`/`User` roles and an admin user from `AdminUser:Email`/`AdminUser:Password` config.

### Frontend (`web/`, Next.js 16)
```bash
cd web && npm install
npm run dev      # http://localhost:3000
npm run build    # production build (must pass before deploy)
npm run lint
```
`web/.env.local` sets `NEXT_PUBLIC_API_BASE` (dev `http://localhost:5000`). This is baked at build time. `next.config.ts` must keep `output: "standalone"` for the Docker image.

## Architecture

### Backend layering (`src/`, from the Jason Taylor Clean Architecture template + .NET Aspire)
- **Domain** — entities (`Project`, `Assessment`, `Subscription`, `AssessmentReport`) and the Section 19 calculators in `Domain/Services`: `BuildingGroupCalculator` and `ClimateData`. **These are faithful ports of the legacy JS calculator — keep them numerically identical; they're covered by unit tests.**
- **Application** — CQRS use cases (MediatR), FluentValidation validators, AutoMapper profiles (defined as nested `Mapping : Profile` classes inside DTOs). Service contracts live in `Application/Common/Interfaces`.
- **Infrastructure** — EF Core + **Microsoft SQL Server**, ASP.NET Identity, and the implementations: `MinioFileStorage` (IFileStorage), `QuestPdfReportGenerator` (IReportGenerator), `SubscriptionService`, `UserAdminService`, `OtpService`/`SmsSender`, `GoogleTokenValidator`, `NezamMohandesiProjectProvider`.
- **Web** — Minimal‑API endpoints. Each `IEndpointGroup` class is auto‑mapped at **`/api/{ClassName}`**. Identity API is mounted via `MapIdentityApi` under `/api/Users/*` (bearer tokens). The DI extension lives in `Infrastructure/DependencyInjection.cs` → `AddMabhas19Services`.

### Key architectural decision: where scoring lives
The interactive **6‑checklist scoring engine runs in the FRONTEND** (`web/src/features/assessment`, ported verbatim from a legacy React app). The **backend is the system of record**: `Assessment.InputJson`/`ResultJson` are stored as SQL Server **`nvarchar(max)`** plus denormalised `TotalScore`/`MaxScore`, and the PDF is generated from the stored result. So changes to assessment scoring/inputs go in `web/src/features/assessment/*`, **not** the backend.

### Auth & roles
- Three sign‑in methods: username/password (Identity API), **mobile OTP** (`/api/Auth/otp/*`), **Google ID‑token** (`/api/Auth/google`). The OTP/Google flows in `Web/Endpoints/Auth.cs` issue Identity bearer tokens by setting `signInManager.AuthenticationScheme = IdentityConstants.BearerScheme` then `SignInAsync`.
- Roles: **`Administrator`** (manage users + subscriptions) and **`User`** (default). `/api/Admin/*` is gated with `RequireRole(Administrator)`; `GET /api/Users/me` returns `{ roles, isAdmin }`.
- **Subscriptions** cap projects per user (Free = **5** by default), enforced in `ISubscriptionService.EnsureCanCreateProjectAsync` (throws a `ValidationException` surfaced under the `Subscription` field).

### Frontend structure (`web/src`)
- Next.js App Router under `app/[locale]`. **i18n via next-intl**: `fa-IR` (default, **RTL**) + `en-US` (LTR), `localePrefix: "as-needed"` → fa is served at `/`, en at `/en/...`. The real `<html lang/dir>` + providers are in `app/[locale]/layout.tsx`.
- Route groups: **root `/` = public landing page** (`components/landing/*`); `(auth)` = public login/register; `(dashboard)` = protected by `<RequireAuth>` and includes the admin area (`admin/users`, shown only when `useAuth().isAdmin`).
- **Design system**: shadcn‑style CSS variable tokens in `app/globals.css` (emerald primary) with light/dark via `components/theme-provider.tsx`. Shared UI primitives in `components/ui` — **keep its export surface stable (restyle, don't rename)** since every page imports from it.
- API layer in `lib/`: `api.ts` (fetch wrapper with bearer + auto‑refresh), `endpoints.ts` (`authApi`/`projectsApi`/`subscriptionApi`/`adminApi`), `auth-context.tsx` (`useAuth` exposing `user`/`isAdmin`), `tokens.ts` (localStorage). Use locale‑aware `Link`/`useRouter` from `@/i18n/navigation`, not `next/link`.

## Gotchas

- **Build is strict**: `TreatWarningsAsErrors=true`. NuGet‑audit advisories on transitive template packages (`OpenTelemetry`, `System.Security.Cryptography.Xml`) are demoted to warnings via `WarningsNotAsErrors` (`NU1608;NU1902;NU1903`) in `Directory.Build.props`. `.NET 10` also turns deprecations into errors (e.g. use `KnownIPNetworks`, not `KnownNetworks`).
- **`ValidationException` is ambiguous** between `FluentValidation.ValidationException` (a global using) and the app's `Application.Common.Exceptions.ValidationException` — alias the app one when using it.
- **Aspire namespace clash**: the `Mabhas19.Application.Projects` namespace shadows Aspire's generated global `Projects` namespace in functional tests — qualify as `global::Projects.TestAppHost`.
- **MediatR v14** requires a commercial license for production (logs a dev‑only warning); replace or license before going live.
- Use `Guard.Against.NotFound(...)` (Ardalis) for 404s; `ForbiddenAccessException` → 403 (see `ProblemDetailsExceptionHandler`).

## Deployment (`deploy/`)

- `docker-compose.dev.yml` — local SQL Server + MinIO only. `docker-compose.local.yml` — full stack in containers. `docker-compose.server.yml` — production, **attaches to the server's existing Traefik** (external network `traefik`, cert resolver `myresolver` = ArvanCloud DNS challenge) instead of running its own.
- **Live**: `mabhas19.myceo.ir` (web), `api.mabhas19.myceo.ir`, `s3.mabhas19.myceo.ir`, on server `10.249.52.216` under `/srv/mabhas19`.
- The server is in Iran: **Docker Hub's blob CDN and `mcr.microsoft.com` are blocked**. So: build the `api`/`web` images locally (where `mcr` works), `docker save | gzip` → transfer → `docker load`; pull `postgres`/`minio` via the **`docker.arvancloud.ir`** mirror (referenced directly in `docker-compose.server.yml`). **Do not restart the shared Docker daemon** — it runs other production stacks (mailcow, supabase).
- SSH uses PuTTY `plink`/`pscp -pw` (no `sshpass` available). In production MinIO is reached via its public host (`Minio__Endpoint=s3.mabhas19.myceo.ir`, `UseSSL=true`) so presigned report URLs are valid for browsers.
