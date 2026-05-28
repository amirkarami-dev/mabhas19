using Mabhas19.Domain.Entities;

namespace Mabhas19.Application.Common.Interfaces;

public interface ISubscriptionService
{
    /// <summary>Returns the user's subscription, creating a default Free plan if none exists.</summary>
    Task<Subscription> GetOrCreateAsync(string userId, CancellationToken ct = default);

    /// <summary>Throws a validation error if the user has reached their project quota.</summary>
    Task EnsureCanCreateProjectAsync(string userId, CancellationToken ct = default);
}
