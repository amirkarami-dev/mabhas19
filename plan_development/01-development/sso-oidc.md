# SSO / OIDC — Central Identity Provider design & contract

> **Status:** Design approved (2026-06-03) — implementation pending.
> **Supersedes:** the bearer-token model in `auth-and-roles.md` / ADR-006 (`MapIdentityApi`).
> **Execution:** wave-based (Phase 1 → 2 → 3), see §8. The **Token Contract (§4) is frozen at the end of Phase 1** and is the single source of truth every client builds against.

## 1. Goal

One login across every `*.myceo.ir` service. A user authenticates once at a central Identity Provider (`auth.myceo.ir`); when they open another service (e.g. `plan.myceo.ir`, or come back to `mabhas19.myceo.ir`) they are **not prompted to log in again**. New services join by registering an OIDC client — no per-service auth code.

## 2. Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| D1 | IdP hosting | **New ASP.NET project `src/Auth`** (OpenIddict OIDC server + login UI), own container at `auth.myceo.ir` |
| D2 | User store | **Own database `Mabhas19AuthDb`** on the existing SQL Server instance; existing users migrated in, **IDs preserved** |
| D3 | Web client | **Auth.js (NextAuth v5)** OIDC client, httpOnly session cookie |
| D4 | Scope | IdP + `mabhas19` web + `mabhas19` mobile + **`plan` client placeholder** |
| D5 | Prod cutover | **NOT in this pass.** Build + verify on the branch; cutover is a separate, gated runbook. Current auth keeps working until then. |

## 3. Architecture

```
                       auth.myceo.ir  ── src/Auth (OpenIddict + ASP.NET Identity + EF Core)
                          │  owns: AspNetUsers/roles, password+OTP+Google login UI
                          │  issues: signed JWT access tokens, ID tokens, refresh tokens
        ┌─────────────────┼────────────────────────────┐
   OIDC code+PKCE    OIDC code+PKCE                 (registered, not built)
        │                 │                             │
  mabhas19 web        mabhas19 mobile               plan.myceo.ir
  (Next.js + Auth.js) (Expo + expo-auth-session)    (future client)
        │                 │
        └──── JWT ────────┴────►  api.mabhas19.myceo.ir
                                  src/Web = resource server (validates JWT via JWKS; no local login)
```

- **`src/Auth`** is the *only* component that authenticates users.
- **`src/Web` (mabhas19 API)** becomes a pure **resource server**: it validates the IdP's JWTs and reads identity from claims. It keeps `Mabhas19Db` (Projects/Assessments/Subscriptions).
- **`Mabhas19Db.AspNetUsers`** becomes the migration *source*, then sits unused (not dropped in this pass — see §7).

## 4. 🔒 TOKEN CONTRACT — **FROZEN 2026-06-03** (Phase 1 complete & verified; every client depends on this)

> Phase 1 (A+B) is implemented, integration-verified (40/40 tests green; IdP discovery/JWKS/seeding confirmed at runtime), and this contract is now **frozen**. Phase 2 (web/mobile) and Phase 3 (infra/migration) build against it unchanged.

**Issuer (`iss`)**
- prod: `https://auth.myceo.ir`
- dev: `http://localhost:5100`
- Discovery: `/.well-known/openid-configuration`; keys: `/.well-known/jwks`.

**Access token**
- Format: **signed JWT, RS256** — **encryption DISABLED** (`DisableAccessTokenEncryption`) so resource servers validate via JWKS with stock `AddJwtBearer`.
- `aud`: `mabhas19.api` (one audience per resource API; `plan.api` reserved for later).
- Claims: `sub` (= **preserved** `AspNetUsers.Id`), `name`, `email`, `preferred_username`, `role` (zero or more), `scope`, `iss`, `aud`, `exp`, `iat`, `jti`.
- **Role claim type = `role`** (flat string). **Name claim type = `name`**, **user-id claim = `sub`**. Resource servers MUST configure `TokenValidationParameters { NameClaimType = "name", RoleClaimType = "role" }` so `RequireRole("Administrator")` and `IUser.Id` (from `sub`) work.

**ID token**: `sub`, `name`, `email`, `role` (for client display only — authorization is always off the access token at the API).

**Scopes**: `openid`, `profile`, `email`, `offline_access`, `roles`, `mabhas19.api` (resource) · reserved: `plan.api`.

**Lifetimes** (configurable; defaults): access **30 min** · refresh **14 days, sliding + rotated** · authorization code **5 min** · ID token 30 min.

**Registered clients** (seeded in the IdP):
| client_id | type | grant | redirect URIs (prod / dev) | scopes |
|-----------|------|-------|----------------------------|--------|
| `mabhas19-web` | confidential (+secret) | code+PKCE, refresh | `https://mabhas19.myceo.ir/api/auth/callback/mabhas19` / `http://localhost:3000/api/auth/callback/mabhas19` | openid profile email roles offline_access mabhas19.api |
| `mabhas19-mobile` | public (PKCE only) | code+PKCE, refresh | `mabhas19://auth` (+ Expo dev proxy URI) | openid profile email roles offline_access mabhas19.api |
| `plan-web` | confidential placeholder | code+PKCE, refresh | `https://plan.myceo.ir/api/auth/callback/plan` | openid profile email roles offline_access plan.api |

**Signing keys**: prod uses a **persisted RSA signing certificate** (mounted via the deploy volume / config), **not** ephemeral dev certs — so JWKS is stable across restarts and the API can validate tokens. Dev uses OpenIddict's development certificate. OpenIddict's server-side artifacts (auth codes, refresh tokens) live in the EF stores in `Mabhas19AuthDb`.

## 5. Components

### A — `src/Auth` (the IdP) — Phase 1
- ASP.NET (.NET 10) + **OpenIddict** (server + validation) + ASP.NET Identity + EF Core SQL Server (`Mabhas19AuthDb`).
- Endpoints: `/connect/authorize`, `/connect/token`, `/connect/userinfo`, `/connect/logout`, discovery + JWKS.
- **Login UI** (Razor Pages, Persian/RTL, functional — not pixel-matching the Next.js design): username/password, **OTP** (move `OtpService`/`SmsSender`/`OtpOptions` here), **Google** (move `GoogleTokenValidator` / "Continue with Google").
- Seeds: roles (`Administrator`/`User`), the OIDC clients/scopes above, and (dev) a test admin from config.
- Issues tokens per §4.

### B — `src/Web` (mabhas19 API → resource server) — Phase 1
- Replace `AddBearerToken(IdentityConstants.BearerScheme)` + `MapIdentityApi` with **`AddJwtBearer`** (authority/audience/claim-type mapping per §4).
- **Remove** `Web/Endpoints/Auth.cs` (OTP/Google → moved to IdP) and the Identity-API surface under `/api/Users/*`.
- `CurrentUser` reads `sub`/`role` from the validated JWT (no DB user lookup). `LoggingBehaviour`'s name lookup reads claims.
- **Keep** `ApplicationDbContext` as-is (still `IdentityDbContext`) to avoid a destructive migration; the Identity tables simply go unused. **No schema change to `Mabhas19Db` in this pass.**
- Subscriptions/Projects/Assessments unchanged (they key off the preserved `sub`).

### C — web (Next.js) — Phase 2
- **Auth.js (NextAuth v5)** generic OIDC provider → `auth.myceo.ir`; httpOnly encrypted session cookie (removes the localStorage token layer and its XSS exposure).
- Rewire `lib/api.ts` (attach access token from the server session / call via route handlers), `lib/auth-context`, `RequireAuth`; `(auth)/login`+`register` become "sign in" → redirect to IdP; `lib/tokens.ts` retired.

### D — mobile (Expo) — Phase 2
- **`expo-auth-session`** code+PKCE against `auth.myceo.ir`; tokens in `expo-secure-store`; send JWT to the API.
- Replace the password/OTP/Google screens (`app/login.tsx`) with the IdP-hosted flow via the system browser. **Nuance:** Google sign-in happens *inside* the IdP page (server-side OAuth), not a native Google SDK — keeps the flow uniform.

### E — infra + docs + migration — Phase 3
- `auth` service in `docker-compose.server.yml`, `mabhas19-auth:deploy` image (`deploy/Dockerfile.auth`), Traefik route `auth.myceo.ir` (cert resolver `myresolver`; DNS already → `10.249.52.216` ✅), `.env` additions (client secrets, signing cert path).
- **User-migration script** (§7).
- **plan_development** doc updates (§9) + **cutover runbook** (built, not executed).

## 6. Auth flow (the "no re-login" experience)
1. User signs in at `mabhas19.myceo.ir` → Auth.js redirects to `auth.myceo.ir/connect/authorize`.
2. IdP shows login (password/OTP/Google) → sets its **SSO session cookie on `auth.myceo.ir`** → redirects back with a code → Auth.js swaps it for tokens → httpOnly session.
3. User opens the **`plan` card** → `plan.myceo.ir` has no session → redirects to `auth.myceo.ir/authorize` → IdP sees its existing session cookie → **silently** issues a code → back to plan, logged in. **No second prompt.**

## 7. User migration (preserve IDs)
- Copy `AspNetUsers`, `AspNetRoles`, `AspNetUserRoles`, `AspNetUserLogins` (Google), `AspNetUserClaims`, `AspNetUserTokens` from `Mabhas19Db` → `Mabhas19AuthDb`, **preserving `Id` and `PasswordHash`** (same Identity hasher → existing passwords keep working; `PhoneNumber*` preserved for OTP).
- Because `Project.OwnerId` / `Subscription.UserId` reference `AspNetUsers.Id` and the IdP's `sub` = that same `Id`, all existing data stays linked with no changes to `Mabhas19Db`.
- Repeatable, idempotent (insert-if-absent). Verified at cutover by row-count parity + a real test login. `Mabhas19Db`'s Identity tables are left in place (unused) — dropping them is a future cleanup, not this pass.

## 8. Wave-based execution (controlled — avoids contract drift)

**Phase 1 — A + B (foundation; freeze the contract).** Build the IdP and convert the API. **Done when:** IdP issues a signed JWT for each login method; the API accepts a valid IdP JWT (200) and rejects others (401); roles enforce; an integration test (obtain token from IdP → call a protected API endpoint) is green. **→ Token Contract (§4) is marked FROZEN.**

**Phase 2 — C + D (against the frozen contract).** Web (Auth.js) and mobile (expo-auth-session) integrate. Controlled parallelism is OK here because §4 is fixed. **Done when:** web login redirect→callback→session→authenticated API call works; mobile PKCE flow→SecureStore→authenticated API call works.

**Phase 3 — E (infra + docs + migration).** Compose/Traefik/Dockerfile for `auth.myceo.ir`, `Mabhas19AuthDb` provisioning, migration script, plan_development updates, **cutover runbook (written, not run)**. **Done when:** all three images build, the stack runs locally end-to-end, and the runbook is reviewed.

> Parallelism is **within** a phase only, never across — and only after the prior phase's "done when" gate passes and the contract is frozen.

## 9. plan_development updates (Phase 3)
- This document (`01-development/sso-oidc.md`) — canonical design + contract.
- Rewrite `01-development/auth-and-roles.md` for the OIDC/SSO model (link here).
- `00-planning/architecture-decisions.md` — **ADR-013** (added) + ADR-006 marked *Superseded by ADR-013*.
- Add a `deploy-idp` note / extend `04-skills/deploy-behind-traefik`.

## 10. Risks & mitigations
- **Contract drift** → wave model + frozen §4; C/D never start before Phase 1 gate.
- **OpenIddict encrypts access tokens by default** → disable access-token encryption; signed JWT + JWKS so the API uses stock `AddJwtBearer`.
- **Ephemeral signing keys** (same class of bug as the current DataProtection warning) → persisted signing cert in prod.
- **Admin user-management** (`/api/Admin/users` in mabhas19, via `UserManager`) becomes stale once users live in the IdP → **known follow-up**: move admin user management to the IdP (flagged, not in this pass); web admin UI disabled until then.
- **Google on mobile** via the IdP page (system browser), not a native SDK — uniform but worth QA.
- **localStorage → cookie** (web) handled by Auth.js.
- **Cutover safety** → IDs preserved; runbook keeps the old path until the new one is verified; rollback = repoint DNS/compose to the prior images.

## 11. Out of scope (explicit)
Building the `plan` app itself; MFA; account self-service UI beyond what exists; billing; dropping `Mabhas19Db`'s Identity tables; production cutover (separate gated step).
