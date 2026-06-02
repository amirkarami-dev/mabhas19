# Task Breakdown — `<PHASE_NAME>`

> Take ONE phase from `roadmap-and-phases.md` and explode it into small, checkable tasks.
> A good task is **one sitting** of work, has a clear "done", and lists the files it touches.
> Copy this template per phase. Tick boxes as you go: `[ ]` → `[~]` (in progress) → `[x]` (done & verified).

---

## Header
- **Phase:** `<phase number + name>`
- **Goal (from roadmap):** `<paste the phase Goal>`
- **Entry criteria met?** `[ ]` `<list the upstream phases/conditions and confirm>`
- **Owner:** `<name>`
- **Branch:** `<feat/...>`

## Definition of Done for this phase (the exit gate)
*Copy the phase's Exit/verification criteria here verbatim — these are the acceptance checks.*
- [ ] `<exit criterion 1>`
- [ ] `<exit criterion 2>`
- [ ] `<exit criterion 3>`

## Tasks
*Group by layer/area. Keep each task small. For every task note the files and the check.*

### `<Area / layer A>`
- [ ] **`<task>`** — `<what & why in one line>`
  - Files: `<path(s)>`
  - Done when: `<observable check>`
- [ ] **`<task>`**
  - Files: `<path(s)>`
  - Done when: `<observable check>`

### `<Area / layer B>`
- [ ] **`<task>`**
  - Files: `<path(s)>`
  - Done when: `<observable check>`

### Tests
- [ ] **`<unit/integration/parity test>`** — `<what it asserts>`
  - Files: `<test path>`
  - Done when: `<test passes>`

### Wiring / config
- [ ] **`<DI registration / env var / migration / route mapping>`**
  - Files: `<path>`
  - Done when: `<check>`

## Risks & unknowns
- `<thing you're unsure about and how you'll de-risk it — spike, doc, ask domain expert>`

## Verification (run before claiming the phase done)
*Commands appropriate to the phase. Examples:*
- [ ] `dotnet build <Solution>.slnx` (warnings-as-errors) passes.
- [ ] `dotnet test` (or the relevant project) green.
- [ ] `npm run build` (web) / `tsc --noEmit` (mobile|package) passes.
- [ ] Manual smoke test: `<the one happy-path click-through for this phase>`.

---

# Worked example — Phase 6: Subscriptions + PDF / object storage

## Header
- **Phase:** 6 — Subscriptions + PDF / object storage
- **Goal:** Quota enforcement and downloadable server-rendered reports.
- **Entry criteria met?** [x] Phases 1, 3, 4 done; MinIO running via `deploy/docker-compose.dev.yml`.
- **Owner:** Amir
- **Branch:** `feat/subscriptions-and-reports`

## Definition of Done for this phase
- [ ] Creating beyond the cap is blocked with a `Subscription` field error (not a 500); admin raising the plan unblocks it.
- [ ] A report PDF generates, uploads, and downloads via a presigned URL; the Persian/RTL font renders correctly.

## Tasks

### Domain / Application
- [ ] **`Subscription` entity + plan/cap** — model the per-user plan with a project cap (Free = 5).
  - Files: `src/Domain/Entities/Subscription.cs`
  - Done when: entity compiles; default plan = Free, cap = 5.
- [ ] **`ISubscriptionService` contract** — `EnsureCanCreateProjectAsync(userId)`.
  - Files: `src/Application/Common/Interfaces/ISubscriptionService.cs`
  - Done when: interface defined; referenced by the create-project handler.
- [ ] **Call the guard in CreateProject** — invoke `EnsureCanCreateProjectAsync` before persisting.
  - Files: `src/Application/<Projects>/Commands/CreateProject/CreateProjectCommandHandler.cs`
  - Done when: over-cap create throws the app `ValidationException` (aliased) with key `Subscription`.

### Infrastructure
- [ ] **`SubscriptionService` implementation** — count user's projects vs. cap; throw with the `Subscription` field on breach.
  - Files: `src/Infrastructure/<...>/SubscriptionService.cs`
  - Done when: returns OK under cap, throws at/over cap.
- [ ] **`QuestPdfReportGenerator` (IReportGenerator)** — render the PDF from the stored `ResultJson`, embedding the RTL font.
  - Files: `src/Infrastructure/<...>/QuestPdfReportGenerator.cs`, `deploy/fonts/*`
  - Done when: a sample result produces a valid PDF with correct Persian glyphs.
- [ ] **`MinioFileStorage` (IFileStorage)** — ensure bucket; upload; **presigned URL on the public host**.
  - Files: `src/Infrastructure/<...>/MinioFileStorage.cs`
  - Done when: object uploads; presigned URL opens in a browser (prod host `s3.<domain>`, SSL).

### Web
- [ ] **Quota UI** — show usage/cap on the create flow; render the `Subscription` field error.
  - Files: `web/src/app/[locale]/(dashboard)/.../create`, `web/src/lib/endpoints.ts`
  - Done when: blocking message shows on the 6th create attempt for a Free user.
- [ ] **Download report action** — call the report endpoint, open the presigned URL.
  - Files: `web/src/features/assessment/...`, `web/src/lib/endpoints.ts`
  - Done when: clicking "Download report" opens the PDF.

### Tests
- [ ] **Subscription quota tests** — under-cap allowed, at/over cap throws with `Subscription`.
  - Files: `tests/Application.FunctionalTests/...`
  - Done when: tests pass.
- [ ] **Report generation smoke** — generator produces a non-empty PDF for a known result.
  - Files: `tests/Infrastructure.IntegrationTests/...`
  - Done when: test passes.

### Wiring / config
- [ ] **Register services in DI** — `ISubscriptionService`, `IReportGenerator`, `IFileStorage`.
  - Files: `src/Infrastructure/DependencyInjection.cs`
  - Done when: API starts with them resolved.
- [ ] **MinIO config** — endpoint/keys; prod uses public host + `UseSSL=true`.
  - Files: `src/Web/appsettings*.json`, `deploy/docker-compose.*.yml`
  - Done when: storage reachable in dev and prod.

## Risks & unknowns
- Presigned URLs must target a **browser-reachable** host — verify against the public `s3.<domain>`, not the internal container name.
- QuestPDF community-license terms at scale — confirm before commercial go-live.
- `ValidationException` ambiguity (FluentValidation vs. app) — **alias the app one**.

## Verification
- [ ] `dotnet build Mabhas19.slnx` (warnings-as-errors) passes.
- [ ] `dotnet test` green (incl. new quota + report tests).
- [ ] `npm run build` (web) passes.
- [ ] Smoke test: Free user blocked on 6th project → admin raises plan → create succeeds → run assessment → **download PDF and confirm Persian renders**.
