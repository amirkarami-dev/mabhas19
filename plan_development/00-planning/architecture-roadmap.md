# Mabhas19 — Architecture Roadmap (living)

> **Updated:** 2026-06-03. The committed direction + the ordered checklist to continue. Companion to
> `architecture-decisions.md` (ADRs) and `01-development/sso-oidc.md` (the SSO design/contract).

## Chosen architecture (best + most standard for this project)

**Modular monolith backend + a few principled service extractions (auth = done) + a multi-app
frontend unified by SSO and shared packages.** Explicitly **not** microservices for the core domain,
and **not** runtime microfrontends.

Rationale: small team, single focused product evolving into a portal of a few apps (`mabhas19`,
`plan`, …). The 2026 consensus for that shape is "modular monolith first; extract a service only on
measured pressure; grow the portal as separate apps sharing packages + one login." The OIDC IdP we
built is the one justified extraction (shared cross-cutting concern, clean contract). Everything else
stays in the monolith until a real pressure (independent scaling / team ownership) appears.

### Explicitly NOT doing (and why)
- ❌ **Microservices** for projects/assessments/subscriptions — one consistency boundary; splitting buys distributed-transaction pain with no scaling/team driver.
- ❌ **Runtime microfrontends** (Module Federation / single-spa) — solves a many-teams problem we don't have. If one domain must compose many apps later, use **Next.js Multi-Zones** (build-time, lightweight), not federation.

## Branching note
The SSO work lives on `feat/sso-oidc-central-idp` and is **held for a coordinated cutover** (deploy IdP →
migrate users → cut over api/web; see `deploy/sso-cutover-runbook.md`). Continuation work rides the
**same branch** so the whole evolution cuts over together. Deploy-dependent items (observability,
image hardening) are deferred to the cutover; dev-time architecture items (shared packages, API SDK)
proceed now.

---

## Checklist to continue

### Phase A — Converge SSO (in-flight; gated on the cutover)
- [ ] Branch held as-is for the coordinated cutover (no merge/deploy until then). ✅ decided
- [ ] Manual web login E2E against the local IdP (browser).
- [ ] Generate + place the prod OpenIddict signing cert; fill the new `.env` vars.
- [ ] Execute `deploy/sso-cutover-runbook.md` (deploy IdP → migrate users → cut over api/web).
- [ ] Follow-up: move admin user-management into the IdP.

### Phase B — Foundation
- [x] **Shared design-system package** (`packages/ui`) — portal foundation. ✅ done (`7199885`)
- [ ] **Typed API SDK** generated from the API OpenAPI doc; replace hand-written DTOs in web + mobile. *(dev-time; in progress)*
- [x] ~~**Shared api-client package**~~ — **DROPPED** (Phase 2 diverged web Auth.js ⇄ mobile expo-auth-session token handling; a unified client buys too little).
- [x] **MediatR** — pinned to free **12.5.0** (Apache-2.0); commercial-license requirement removed. ✅ done (`7ee0e41`, ADR-002)
- [ ] **AutoMapper licensing — TRACKED (not a current blocker, per decision 2026-06-03).** AutoMapper 16.x uses the same vendor commercial-license model (last free = 12.x). Resolve **before go-live** via one of: pin to free 12.x (API churn), migrate to **Mapperly** (source-gen, MIT), or purchase the license. No mapping refactor now.
- [ ] **Observability** — deploy an OTel collector + set `OTEL_EXPORTER_OTLP_ENDPOINT`. *(deferred to cutover)*
- [ ] **Image hardening** — pin base images by digest + CVE scan (Trivy) in CI. *(deferred to cutover)*
- [ ] Make web lint blocking in CI after fixing the `react-hooks/set-state-in-effect` items.

### Phase C — Portal-ready frontend (when `plan` arrives)
- [ ] Build `plan.myceo.ir` as a **separate** Next.js app in the monorepo (client `plan-web` already seeded), consuming the shared packages + SSO. Not a microfrontend.

### Phase D — Backend (stay a modular monolith)
- [ ] Keep the modular monolith; enforce module boundaries.
- [ ] Extract **reporting/PDF** (or **notifications**) to a service **only on measured pressure** — never preemptively.
