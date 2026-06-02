# API Reference — `<PROJECT_NAME>`

> Table-based API reference template, derived from the reference project (Mabhas19).
> Replace every `<PLACEHOLDER>`. The filled tables below are the **worked Mabhas19 example** —
> rename groups/paths to match your project, but keep the column shape.

## Conventions

- **Base path:** `/api/`. Port **5000** in development, **8080** in containers, behind the reverse proxy in production (`https://<API_DOMAIN>`).
- **Endpoint groups auto-map** to `/api/{ClassName}`: each `IEndpointGroup` class in `src/Web/Endpoints` becomes a route group named after the class. So a `Projects` class -> `/api/Projects`.
- **Identity API** (username/password) is mounted via `MapIdentityApi<ApplicationUser>()` under **`/api/Users/*`** with **bearer tokens**.
- **Auth column:** **No** = anonymous; **Yes** = requires `Authorization: Bearer <accessToken>`; **Admin** = requires the `Administrator` role (`/api/Admin/*`).
- **Interactive docs (Scalar):** `http://localhost:5000/scalar` in dev, `https://<API_DOMAIN>/scalar` in prod.
- **Errors:** RFC 7807 problem-details. `400` validation (FluentValidation; field-keyed `errors`), `401` no/expired token, `403` `ForbiddenAccessException`, `404` `Guard.Against.NotFound`.

---

## Endpoint summary (all groups)

| Group | Method | Path | Purpose | Auth |
|-------|--------|------|---------|------|
| Auth | POST | `/api/Auth/otp/request` | Request an OTP code via SMS | No |
| Auth | POST | `/api/Auth/otp/verify` | Verify OTP, create user if new, issue token | No |
| Auth | POST | `/api/Auth/google` | Sign in with a Google ID-token | No |
| Users | POST | `/api/Users/register` | Register with email/password | No |
| Users | POST | `/api/Users/login` | Login with email/password (returns tokens) | No |
| Users | POST | `/api/Users/refresh` | Refresh the bearer token | No |
| Users | GET | `/api/Users/me` | Current user + roles (`CurrentUserDto`) | Yes |
| Users | POST | `/api/Users/logout` | Clear auth | Yes |
| Projects | GET | `/api/Projects` | List the current user's projects | Yes |
| Projects | GET | `/api/Projects/{id}` | Fetch one project | Yes |
| Projects | POST | `/api/Projects` | Create a project (checks subscription quota) | Yes |
| Projects | POST | `/api/Projects/import` | Import a project from an external source | Yes |
| Projects | PUT | `/api/Projects/{id}` | Update a project | Yes |
| Projects | DELETE | `/api/Projects/{id}` | Delete a project | Yes |
| Projects | GET | `/api/Projects/{id}/assessment` | Fetch the assessment (404 if none) | Yes |
| Projects | PUT | `/api/Projects/{id}/assessment` | Save assessment input + result + scores | Yes |
| Projects | POST | `/api/Projects/{id}/report` | Generate PDF; returns a presigned download URL | Yes |
| Subscriptions | GET | `/api/Subscriptions/me` | Current user's subscription (plan, quota) | Yes |
| Admin | GET | `/api/Admin/users` | List all users with subscription info | Admin |
| Admin | GET | `/api/Admin/users/{id}` | Fetch one user (404 if missing) | Admin |
| Admin | POST | `/api/Admin/users` | Create a user | Admin |
| Admin | PUT | `/api/Admin/users/{id}/subscription` | Update a user's plan/quota | Admin |
| Admin | PUT | `/api/Admin/users/{id}/role` | Grant/revoke the Administrator role | Admin |
| Admin | DELETE | `/api/Admin/users/{id}` | Delete a user | Admin |

---

## Auth

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/Auth/otp/request` | Request an OTP code via SMS. Body `{ phoneNumber }`. | No |
| POST | `/api/Auth/otp/verify` | Verify the OTP; create the user if new; issue tokens. Body `{ phoneNumber, code }`. | No |
| POST | `/api/Auth/google` | Sign in with a Google ID-token. Body `{ idToken }`. | No |

All three end with the API issuing an Identity **bearer token** (`{ accessToken, refreshToken, expiresIn }`). The OTP/Google flows set `signInManager.AuthenticationScheme = IdentityConstants.BearerScheme` before `SignInAsync`.

## Users (Identity API + custom)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/Users/register` | Register with email/password. | No |
| POST | `/api/Users/login` | Login; returns `{ accessToken, refreshToken }`. | No |
| POST | `/api/Users/refresh` | Exchange a refresh token for new tokens. | No |
| GET | `/api/Users/me` | Current user + roles. | Yes |
| POST | `/api/Users/logout` | Clear auth. | Yes |

`CurrentUserDto`: `{ id, email, phoneNumber, roles: string[], isAdmin: boolean }`.

## Projects

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/Projects` | List the current user's projects. | Yes |
| GET | `/api/Projects/{id}` | Fetch one project. | Yes |
| POST | `/api/Projects` | Create a project. Runs `EnsureCanCreateProjectAsync` (quota). | Yes |
| POST | `/api/Projects/import` | Import from an external registry (`<EXTERNAL_SOURCE>`). | Yes |
| PUT | `/api/Projects/{id}` | Update a project. | Yes |
| DELETE | `/api/Projects/{id}` | Delete a project. | Yes |
| GET | `/api/Projects/{id}/assessment` | Fetch the assessment, or 404. | Yes |
| PUT | `/api/Projects/{id}/assessment` | Save `inputJson` + `resultJson` + `totalScore` + `maxScore`. | Yes |
| POST | `/api/Projects/{id}/report` | Render the PDF, store it in MinIO, return a presigned URL (valid ~1 hour). | Yes |

> Quota: creating/importing beyond the plan limit throws a `ValidationException` surfaced under the `Subscription` field (`400`).

## Subscriptions

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/Subscriptions/me` | Current user's subscription: plan, `maxProjects`, used count. | Yes |

## Admin (Administrator role only)

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/Admin/users` | List all users with subscription info. | Admin |
| GET | `/api/Admin/users/{id}` | Fetch one user (404 if missing). | Admin |
| POST | `/api/Admin/users` | Create a user. | Admin |
| PUT | `/api/Admin/users/{id}/subscription` | Update a user's plan/quota. | Admin |
| PUT | `/api/Admin/users/{id}/role` | Grant/revoke the Administrator role. | Admin |
| DELETE | `/api/Admin/users/{id}` | Delete a user. | Admin |

---

## Adapting this to your project

1. **Rename the domain group.** `Projects` is the reference project's main resource. If yours is `<MainResource>`, the class `<MainResource>` in `src/Web/Endpoints` auto-maps to `/api/<MainResource>` — change the group name and its row paths accordingly.
2. **Keep the cross-cutting groups as-is** unless you change the feature: `Auth` (the three sign-ins), `Users` (Identity API), `Subscriptions` (quota), `Admin` (user/quota management). These are part of the blueprint.
3. **Nested resources** (like `/api/Projects/{id}/assessment` and `/.../report`) hang off the parent group — name them after your sub-resource and its action.
4. **Auth column rule of thumb:** anonymous = the sign-in endpoints only; everything user-scoped = **Yes**; everything under `/api/Admin/*` = **Admin**.
5. **Add a request/response shape** in prose under each group where the body matters (see `CurrentUserDto` above). Don't duplicate the full Scalar schema — link to `/scalar`.

> *Worked example values above (`/api/Projects`, `CurrentUserDto`, Free-quota validation, presigned report URL) are the reference project **Mabhas19**.*
