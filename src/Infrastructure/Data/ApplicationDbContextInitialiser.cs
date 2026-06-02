using Mabhas19.Domain.Constants;
using Mabhas19.Domain.Entities;
using Mabhas19.Domain.Enums;
using Mabhas19.Infrastructure.Identity;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Mabhas19.Infrastructure.Data;

public static class InitialiserExtensions
{
    public static async Task InitialiseDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();

        var initialiser = scope.ServiceProvider.GetRequiredService<ApplicationDbContextInitialiser>();

        await initialiser.InitialiseAsync();
        await initialiser.SeedAsync();
    }
}

public class ApplicationDbContextInitialiser
{
    private readonly ILogger<ApplicationDbContextInitialiser> _logger;
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IConfiguration _configuration;

    public ApplicationDbContextInitialiser(ILogger<ApplicationDbContextInitialiser> logger, ApplicationDbContext context, UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration)
    {
        _logger = logger;
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _configuration = configuration;
    }

    public async Task InitialiseAsync()
    {
        try
        {
            // Apply pending migrations (safe for dev and production).
            await _context.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while initialising the database.");
            throw;
        }
    }

    public async Task SeedAsync()
    {
        try
        {
            await TrySeedAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }

    public async Task TrySeedAsync()
    {
        // Ensure all application roles exist.
        foreach (var roleName in Roles.All)
        {
            if (_roleManager.Roles.All(r => r.Name != roleName))
            {
                await _roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        // Seed the administrator account from configuration. No credentials are baked into
        // source — if they aren't supplied (env vars in production, appsettings.Development
        // locally) we skip seeding rather than ship a known default password.
        var adminEmail = _configuration["AdminUser:Email"];
        var adminPassword = _configuration["AdminUser:Password"];
        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            _logger.LogWarning("AdminUser:Email/Password not configured; skipping administrator seeding.");
            return;
        }

        var administrator = await _userManager.FindByEmailAsync(adminEmail);
        if (administrator is null)
        {
            administrator = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true
            };
            var created = await _userManager.CreateAsync(administrator, adminPassword);
            if (!created.Succeeded)
            {
                _logger.LogWarning("Could not create admin user: {Errors}",
                    string.Join("; ", created.Errors.Select(e => e.Description)));
                return;
            }
        }

        if (!await _userManager.IsInRoleAsync(administrator, Roles.Administrator))
        {
            await _userManager.AddToRoleAsync(administrator, Roles.Administrator);
        }

        // Give the administrator an unrestricted Enterprise subscription.
        if (!await _context.Subscriptions.AnyAsync(s => s.UserId == administrator.Id))
        {
            _context.Subscriptions.Add(new Subscription
            {
                UserId = administrator.Id,
                Plan = SubscriptionPlan.Enterprise,
                MaxProjects = 1000,
                IsActive = true,
                ValidFrom = DateTimeOffset.UtcNow
            });
            await _context.SaveChangesAsync();
        }
    }
}
