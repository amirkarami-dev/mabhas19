# Subscriptions (project quota)

`<PLACEHOLDER>` caps how many top-level resources (projects) a user may own via a simple
**subscription** model. Every registered user gets a **Free** plan with **5** projects by
default; admins create/upgrade subscriptions. The quota is enforced server-side in one place
and surfaced to the UI as a field-level validation error.

---

## 1. The model (Domain)

`Domain/Entities/Subscription.cs`:

```csharp
public class Subscription : BaseAuditableEntity
{
    public const int DefaultMaxProjects = 5;          // Free plan default

    public required string UserId { get; set; }
    public SubscriptionPlan Plan { get; set; } = SubscriptionPlan.Free;
    public int MaxProjects { get; set; } = DefaultMaxProjects;
    public DateTimeOffset? ValidFrom { get; set; }
    public DateTimeOffset? ValidTo { get; set; }
    public bool IsActive { get; set; } = true;
}
```

- `MaxProjects` is the quota (number of projects the user may own).
- `Plan` is an enum (`Free`, …, `Enterprise`).
- `IsActive` gates access; `ValidFrom`/`ValidTo` carry the validity window.

The admin seed gives the administrator an unrestricted plan
(`Plan = Enterprise, MaxProjects = 1000`) in `ApplicationDbContextInitialiser`.

---

## 2. Enforcement: `ISubscriptionService.EnsureCanCreateProjectAsync`

Contract (`Application/Common/Interfaces/ISubscriptionService.cs`):

```csharp
public interface ISubscriptionService
{
    Task<Subscription> GetOrCreateAsync(string userId, CancellationToken ct = default);
    Task EnsureCanCreateProjectAsync(string userId, CancellationToken ct = default);
}
```

`Infrastructure/Subscriptions/SubscriptionService.cs`:

- **`GetOrCreateAsync`** — returns the user's subscription, **lazily creating** a default
  Free plan (`MaxProjects = Subscription.DefaultMaxProjects`, `IsActive = true`) if none
  exists. So a user never has "no subscription".
- **`EnsureCanCreateProjectAsync`** — the guard. It loads (or creates) the subscription,
  counts the user's projects, and **throws the app `ValidationException` under the
  `"Subscription"` key** if the plan is inactive or the quota is reached:

```csharp
public async Task EnsureCanCreateProjectAsync(string userId, CancellationToken ct = default)
{
    var sub = await GetOrCreateAsync(userId, ct);
    var count = await _context.Projects.CountAsync(p => p.OwnerId == userId, ct);

    if (!sub.IsActive)
        Throw("اشتراک شما فعال نیست.");                       // "your subscription is not active"
    if (count >= sub.MaxProjects)
        Throw($"به سقف تعداد پروژه‌های مجاز ({sub.MaxProjects}) رسیده‌اید. ...");  // quota reached

}

private static void Throw(string message)
{
    var ex = new ValidationException();                       // app exception (aliased)
    ex.Errors["Subscription"] = new[] { message };
    throw ex;
}
```

> The `"Subscription"` field key is the contract with the frontend: a 400 response carries
> `errors.Subscription = ["..."]`, which the UI shows next to the create action. Note this
> uses the **app** `ValidationException` (with its `Errors` dictionary), not
> FluentValidation's — alias it (`using ValidationException = ...Application.Common.Exceptions.ValidationException;`)
> if both are in scope (see `coding-standards.md`).

### Where it is called
At the start of the create-project use case, **before** building the entity
(`Application/Projects/Commands/CreateProject/CreateProject.cs`):

```csharp
public async Task<int> Handle(CreateProjectCommand request, CancellationToken ct)
{
    var userId = _user.Id!;
    await _subscriptions.EnsureCanCreateProjectAsync(userId, ct);   // ← quota check first
    // ... create & save the Project ...
}
```

`ProblemDetailsExceptionHandler` turns the thrown `ValidationException` into a
`400 ValidationProblemDetails`, so no special handling is needed in the endpoint.

---

## 3. Reading the current subscription (UI)

`GET /api/Subscriptions/me` → `GetMySubscriptionQuery` returns a DTO with the plan, the cap,
and **how many projects are used** so the UI can show "X of N":

```csharp
public record SubscriptionDto
{
    public string Plan { get; init; } = "";
    public int MaxProjects { get; init; }
    public int UsedProjects { get; init; }    // current project count
    public bool IsActive { get; init; }
    public DateTimeOffset? ValidTo { get; init; }
}
```

The handler uses `GetOrCreateAsync` (so a brand-new user still gets a sensible response) and
counts projects for `UsedProjects`. The frontend calls it via `subscriptionApi.me()`.

---

## 4. Admin: changing a user's plan/quota

Admins manage subscriptions through `/api/Admin/users/{id}/subscription`
(`PUT`, `Administrator`-gated). `IUserAdminService.UpdateSubscriptionAsync` updates the
user's `Plan`/`MaxProjects`/validity. Raising `MaxProjects` immediately lifts the cap on the
next `EnsureCanCreateProjectAsync` call (no caching).

---

## 5. Recipe: add a quota for a different resource

1. Add a cap field to `Subscription` (e.g. `MaxReports`) + a migration (see
   `backend-clean-architecture.md`).
2. Add an `EnsureCanCreate<Resource>Async(userId, ct)` method on `ISubscriptionService` that
   counts the resource and throws the app `ValidationException` under a stable field key
   (`ex.Errors["Subscription"] = ...`) when over quota.
3. Call it at the start of that resource's create command handler, before persisting.
4. Surface the new field key in the client where the resource is created. Optionally extend
   `SubscriptionDto` so the UI can show usage.
