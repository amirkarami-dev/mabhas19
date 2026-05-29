using Mabhas19.Application.Admin;
using Mabhas19.Application.Common.Interfaces;
using Mabhas19.Domain.Constants;
using Mabhas19.Domain.Entities;
using Mabhas19.Domain.Enums;
using Mabhas19.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Mabhas19.Infrastructure.Identity;

public class UserAdminService : IUserAdminService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _context;
    private readonly ISubscriptionService _subscriptions;
    private readonly TimeProvider _clock;

    public UserAdminService(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext context,
        ISubscriptionService subscriptions,
        TimeProvider clock)
    {
        _userManager = userManager;
        _context = context;
        _subscriptions = subscriptions;
        _clock = clock;
    }

    public async Task<IReadOnlyList<AdminUserDto>> GetUsersAsync(CancellationToken ct = default)
    {
        var users = await _userManager.Users.AsNoTracking().ToListAsync(ct);

        var subs = await _context.Subscriptions.AsNoTracking().ToListAsync(ct);
        var counts = await _context.Projects.AsNoTracking()
            .GroupBy(p => p.OwnerId)
            .Select(g => new { OwnerId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var result = new List<AdminUserDto>(users.Count);
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            var sub = subs.FirstOrDefault(s => s.UserId == u.Id);
            var used = counts.FirstOrDefault(c => c.OwnerId == u.Id)?.Count ?? 0;
            result.Add(Map(u, roles, sub, used));
        }

        return result.OrderByDescending(r => r.IsAdmin).ThenBy(r => r.Email).ToList();
    }

    public async Task<AdminUserDto?> GetUserAsync(string userId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return null;

        var roles = await _userManager.GetRolesAsync(user);
        var sub = await _context.Subscriptions.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == userId, ct);
        var used = await _context.Projects.CountAsync(p => p.OwnerId == userId, ct);
        return Map(user, roles, sub, used);
    }

    public async Task<bool> SetAdminRoleAsync(string userId, bool isAdmin, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return false;

        var inRole = await _userManager.IsInRoleAsync(user, Roles.Administrator);
        if (isAdmin && !inRole)
        {
            await _userManager.AddToRoleAsync(user, Roles.Administrator);
        }
        else if (!isAdmin && inRole)
        {
            await _userManager.RemoveFromRoleAsync(user, Roles.Administrator);
        }
        return true;
    }

    public async Task UpdateSubscriptionAsync(string userId, UpdateUserSubscriptionRequest request, CancellationToken ct = default)
    {
        var sub = await _subscriptions.GetOrCreateAsync(userId, ct);
        var tracked = await _context.Subscriptions.FirstAsync(s => s.Id == sub.Id, ct);

        tracked.Plan = Enum.TryParse<SubscriptionPlan>(request.Plan, true, out var plan) ? plan : tracked.Plan;
        tracked.MaxProjects = Math.Max(0, request.MaxProjects);
        tracked.IsActive = request.IsActive;
        tracked.ValidTo = request.ValidTo;
        await _context.SaveChangesAsync(ct);
    }

    public async Task<(bool Succeeded, string? Error, string? UserId)> CreateUserAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        var user = new ApplicationUser { UserName = request.Email, Email = request.Email, EmailConfirmed = true };
        var created = await _userManager.CreateAsync(user, request.Password);
        if (!created.Succeeded)
        {
            return (false, string.Join("; ", created.Errors.Select(e => e.Description)), null);
        }

        if (request.IsAdmin)
        {
            await _userManager.AddToRoleAsync(user, Roles.Administrator);
        }
        return (true, null, user.Id);
    }

    public async Task<bool> DeleteUserAsync(string userId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return false;
        await _userManager.DeleteAsync(user);
        return true;
    }

    private static AdminUserDto Map(ApplicationUser u, IList<string> roles, Subscription? sub, int used) => new()
    {
        Id = u.Id,
        Email = u.Email,
        PhoneNumber = u.PhoneNumber,
        IsAdmin = roles.Contains(Roles.Administrator),
        Roles = roles.ToList(),
        Plan = sub?.Plan.ToString() ?? SubscriptionPlan.Free.ToString(),
        MaxProjects = sub?.MaxProjects ?? Subscription.DefaultMaxProjects,
        UsedProjects = used,
        IsActive = sub?.IsActive ?? true,
        ValidTo = sub?.ValidTo
    };
}
