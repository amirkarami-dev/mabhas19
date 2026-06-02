# Requirements — `<PROJECT_NAME>`

> Checklists you tick off as you build. Each box is a contract.
> Keep functional ("what it does") separate from non-functional ("how well").
> Mark items you cut as `~~struck through~~ (out of scope, see charter)`.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done & verified.

---

## A. Functional requirements

### A1. Core domain workflow
- [ ] The domain calculation is a **faithful port of `<reference source>`** and is covered by unit tests that assert numeric equality.
- [ ] The calculation lives in the **shared TS package** (`@<scope>/<core>`) and/or backend `Domain/Services`, with **one source of truth**.
- [ ] A user can run the workflow end to end and see a live result/score.
- [ ] Inputs and results are persisted per project (system of record = backend).

### A2. Projects & persistence
- [ ] Create / read / update / delete a `<Project>`.
- [ ] A project owns one or more `<Assessment>` records.
- [ ] Each assessment stores raw **input JSON**, **result JSON**, and denormalised **score(s)** (`TotalScore`/`MaxScore`).
- [ ] List shows only the signed-in user's projects (ownership enforced server-side).

### A3. Authentication (sign-in methods)
- [ ] **Username / password** (ASP.NET Identity API, bearer tokens).
- [ ] **Mobile OTP** — request code (`/api/Auth/otp/request`) + verify (`/api/Auth/otp/verify`) → bearer token.
- [ ] **Google ID-token** — client gets Google token, posts to `/api/Auth/google` → bearer token.
- [ ] Token **auto-refresh** in the client API layer; session survives a page refresh.
- [ ] Sign-out clears tokens on the client.
- [ ] *(cut any method you don't ship and note it here)*

### A4. Roles & access control (RBAC)
- [ ] Roles seeded on startup: **`Administrator`** and **`User`** (default for new sign-ups).
- [ ] Admin-only endpoints gated server-side (`RequireRole(Administrator)` on `/api/Admin/*`).
- [ ] `GET /api/Users/me` returns `{ roles, isAdmin }`.
- [ ] Client hides admin UI unless `isAdmin` (defence in depth — server is the real gate).
- [ ] Admin can **list users** and **change a user's role/plan/quota**.

### A5. Subscriptions / quota
- [ ] Each user has a plan with a **project cap** (Free = `<N, default 5>`).
- [ ] Quota is enforced **server-side** before project creation (e.g. `EnsureCanCreateProjectAsync`).
- [ ] Exceeding the cap returns a **validation error surfaced under a `Subscription` field**, not a 500.
- [ ] Admin can raise/lower a user's plan or cap.

### A6. Reports / PDF
- [ ] Server generates a **PDF from the stored result** (not from a live recompute).
- [ ] PDF renders the primary language correctly (font embedding for `<RTL/script language>`).
- [ ] PDF is uploaded to object storage and returned to the client as a **presigned URL**.
- [ ] Re-downloading an existing report does not regenerate unnecessarily *(or document that it does)*.

### A7. File / object storage
- [ ] An `IFileStorage` abstraction with an S3/MinIO implementation.
- [ ] Bucket auto-created/verified on startup.
- [ ] Presigned URLs are generated against the **public host** so browsers can open them.
- [ ] Object keys are namespaced (e.g. per user / per project) to avoid collisions.

### A8. Internationalisation / RTL *(if applicable)*
- [ ] Two locales: `<primary, RTL>` (default) + `<secondary, LTR>`.
- [ ] `localePrefix: "as-needed"` → default locale at `/`, secondary at `/<locale>/...`.
- [ ] Correct `<html lang dir>` per locale.
- [ ] All user-facing strings come from message catalogs, not hardcoded.
- [ ] Locale-aware navigation (`Link`/`useRouter` from the i18n nav module, not raw `next/link`).

### A9. Mobile app *(if applicable)*
- [ ] Expo app consumes the **same shared scoring package** as web.
- [ ] Sign-in works on device (tokens in secure storage, not localStorage).
- [ ] Core workflow + result are usable on a phone screen.
- [ ] A release **Android APK** can be produced.
- [ ] *(cut if mobile is out of scope)*

### A10. Admin area (UI)
- [ ] Admin route group, visible only when `isAdmin`.
- [ ] User list with plan/role and an edit action.
- [ ] Actions call `/api/Admin/*` and reflect server responses.

---

## B. Non-functional requirements

### B1. Architecture & code quality
- [ ] Clean Architecture layering respected: **Domain → Application → Infrastructure → Web** (dependencies point inward).
- [ ] Use cases are **CQRS** commands/queries (MediatR); inputs validated (FluentValidation).
- [ ] **Central package management** (`Directory.Packages.props`) — versions in one place.
- [ ] Build is **strict**: `TreatWarningsAsErrors=true` passes (audit-only advisories explicitly demoted, documented).
- [ ] Web **production build** (`npm run build`) passes; lint passes.

### B2. Security
- [ ] CORS restricted to known origins (no `*` with credentials).
- [ ] Security headers set (HSTS, X-Content-Type-Options, etc.).
- [ ] Rate limiting on auth/OTP endpoints.
- [ ] Secrets come from config/environment/secret store — **never committed**.
- [ ] OTP codes expire and are attempt-limited.
- [ ] AuthZ enforced on the server for every protected resource (client checks are cosmetic).

### B3. Reliability & data
- [ ] EF Core **migrations apply automatically on startup**; roles + admin user seeded idempotently.
- [ ] Health check endpoint exposed.
- [ ] DB provider is `<SQL Server | Postgres>`; large JSON stored as a **text column** (`nvarchar(max)` / `text`), not a provider-specific JSON type.
- [ ] No data loss on redeploy (volumes for DB + object storage).

### B4. Performance
- [ ] Interactive scoring runs **client-side** (instant feedback, no round-trips per keystroke).
- [ ] List/detail endpoints paginate or scope by owner (no unbounded queries).
- [ ] PDF generation is acceptable for a single request `<target, e.g. < 3s>`.

### B5. Observability
- [ ] Structured logging; OpenTelemetry/ServiceDefaults wired (if using Aspire).
- [ ] API docs served in dev (`/scalar` or equivalent).

### B6. Deployment & ops
- [ ] One-command local dev for backing services (DB + object storage via compose).
- [ ] Production runs in Docker Compose **attached to the existing reverse proxy** (`<Traefik network/cert resolver>`), not its own.
- [ ] Web image uses `output: "standalone"`; the public API base is baked at build time.
- [ ] **Image-transfer pipeline** documented if a registry/CDN is blocked (build locally → `docker save | gzip` → `pscp`/scp → `docker load`); backing images via an allowed mirror.
- [ ] Domains + TLS configured: `<web>`, `<api>`, `<storage>`.
- [ ] Redeploy does not disturb other stacks on a shared host.

### B7. Documentation
- [ ] `CLAUDE.md` (or README) documents commands, architecture, and gotchas.
- [ ] `.env.example` for web/mobile; required config keys listed.
- [ ] This requirements file kept in sync as scope changes.

---

## C. Mabhas19 reference (how the boxes were ticked)
- A1–A2: scoring engine in `@mabhas19/assessment-core` (6 checklist modules under `src/scoring`), mirrored by `Domain/Services` (`BuildingGroupCalculator`, `ClimateData`); `Assessment.InputJson`/`ResultJson` = `nvarchar(max)` + `TotalScore`/`MaxScore`.
- A3–A4: `Web/Endpoints/Auth.cs` (OTP + Google issue Identity bearer tokens); roles `Administrator`/`User` seeded by `ApplicationDbContextInitialiser`; `/api/Admin/*` behind `RequireRole`.
- A5: `ISubscriptionService.EnsureCanCreateProjectAsync`, Free = 5, error under `Subscription`.
- A6–A7: `QuestPdfReportGenerator` + `MinioFileStorage`; presigned URLs against `s3.mabhas19.myceo.ir`.
- A8: next-intl `fa-IR` (default RTL) + `en-US`; `localePrefix: "as-needed"`.
- A9: Expo SDK 54 app consuming the shared package; release APK at `mobile/mabhas19.apk`.
- B6: `deploy/docker-compose.server.yml` attaches to external `traefik` network, cert resolver `myresolver`.
