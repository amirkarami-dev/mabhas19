using Mabhas19.Application.Admin;

namespace Mabhas19.Application.Common.Interfaces;

/// <summary>Administrative operations over users and their subscriptions.</summary>
public interface IUserAdminService
{
    Task<IReadOnlyList<AdminUserDto>> GetUsersAsync(CancellationToken ct = default);

    Task<AdminUserDto?> GetUserAsync(string userId, CancellationToken ct = default);

    Task<bool> SetAdminRoleAsync(string userId, bool isAdmin, CancellationToken ct = default);

    Task UpdateSubscriptionAsync(string userId, UpdateUserSubscriptionRequest request, CancellationToken ct = default);

    Task<(bool Succeeded, string? Error, string? UserId)> CreateUserAsync(CreateUserRequest request, CancellationToken ct = default);

    Task<bool> DeleteUserAsync(string userId, CancellationToken ct = default);
}
