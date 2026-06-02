using Mabhas19.Auth.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using OpenIddict.Abstractions;
using static OpenIddict.Abstractions.OpenIddictConstants;

namespace Mabhas19.Auth.Data;

public static class AuthDbInitialiserExtensions
{
    public static async Task InitialiseAuthAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var initialiser = scope.ServiceProvider.GetRequiredService<AuthDbInitialiser>();
        await initialiser.InitialiseAsync();
        await initialiser.SeedAsync();
    }
}

public class AuthDbInitialiser(
    ILogger<AuthDbInitialiser> logger,
    AuthDbContext context,
    RoleManager<IdentityRole> roleManager,
    UserManager<AuthUser> userManager,
    IOpenIddictApplicationManager applicationManager,
    IOpenIddictScopeManager scopeManager,
    IConfiguration configuration)
{
    private const string AdministratorRole = "Administrator";
    private const string UserRole = "User";

    public async Task InitialiseAsync()
    {
        try
        {
            await context.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while migrating the Auth database.");
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
            logger.LogError(ex, "An error occurred while seeding the Auth database.");
            throw;
        }
    }

    private async Task TrySeedAsync()
    {
        await SeedRolesAsync();
        await SeedScopesAsync();
        await SeedClientsAsync();
        await SeedAdminUserAsync();
    }

    // ── Roles ────────────────────────────────────────────────────────────────

    private async Task SeedRolesAsync()
    {
        foreach (var roleName in new[] { AdministratorRole, UserRole })
        {
            if (roleManager.Roles.All(r => r.Name != roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
                logger.LogInformation("Created role {Role}.", roleName);
            }
        }
    }

    // ── Scopes ───────────────────────────────────────────────────────────────

    private async Task SeedScopesAsync()
    {
        await EnsureScopeAsync("mabhas19.api", resources: ["mabhas19.api"]);
        await EnsureScopeAsync("plan.api",      resources: ["plan.api"]);
    }

    private async Task EnsureScopeAsync(string name, string[] resources)
    {
        if (await scopeManager.FindByNameAsync(name) is not null)
            return;

        await scopeManager.CreateAsync(new OpenIddictScopeDescriptor
        {
            Name      = name,
            Resources = { resources[0] }   // HashSet<string> initialiser
        });

        logger.LogInformation("Created OIDC scope {Scope}.", name);
    }

    // ── Clients ──────────────────────────────────────────────────────────────

    private async Task SeedClientsAsync()
    {
        // mabhas19-web — Confidential, Authorization Code + PKCE
        var webSecret   = configuration["Clients:Mabhas19Web:Secret"]   ?? string.Empty;
        var webRedirect = configuration["Clients:Mabhas19Web:Redirect"]  ?? string.Empty;
        var webPostLogout = configuration["Clients:Mabhas19Web:PostLogout"] ?? string.Empty;

        await EnsureClientAsync(new OpenIddictApplicationDescriptor
        {
            ClientId     = "mabhas19-web",
            ClientSecret = webSecret,
            ClientType   = ClientTypes.Confidential,
            DisplayName  = "Mabhas19 Web",
            RedirectUris      = { new Uri(webRedirect) },
            PostLogoutRedirectUris = { new Uri(webPostLogout) },
            Permissions =
            {
                Permissions.Endpoints.Authorization,
                Permissions.Endpoints.Token,
                Permissions.Endpoints.EndSession,
                Permissions.GrantTypes.AuthorizationCode,
                Permissions.GrantTypes.RefreshToken,
                Permissions.ResponseTypes.Code,
                Permissions.Scopes.Email,
                Permissions.Scopes.Profile,
                Permissions.Scopes.Roles,
                Permissions.Prefixes.Scope + "mabhas19.api"
            },
            Requirements = { Requirements.Features.ProofKeyForCodeExchange }
        });

        // mabhas19-mobile — Public, Authorization Code + PKCE (custom scheme redirect)
        var mobileRedirect = configuration["Clients:Mabhas19Mobile:Redirect"] ?? string.Empty;

        await EnsureClientAsync(new OpenIddictApplicationDescriptor
        {
            ClientId    = "mabhas19-mobile",
            ClientType  = ClientTypes.Public,
            DisplayName = "Mabhas19 Mobile",
            RedirectUris = { new Uri(mobileRedirect) },
            Permissions =
            {
                Permissions.Endpoints.Authorization,
                Permissions.Endpoints.Token,
                Permissions.Endpoints.EndSession,
                Permissions.GrantTypes.AuthorizationCode,
                Permissions.GrantTypes.RefreshToken,
                Permissions.ResponseTypes.Code,
                Permissions.Scopes.Email,
                Permissions.Scopes.Profile,
                Permissions.Scopes.Roles,
                Permissions.Prefixes.Scope + "mabhas19.api"
            },
            Requirements = { Requirements.Features.ProofKeyForCodeExchange }
        });

        // plan-web — Confidential, Authorization Code + PKCE (future plan service)
        var planSecret    = configuration["Clients:PlanWeb:Secret"]   ?? string.Empty;
        var planRedirect  = configuration["Clients:PlanWeb:Redirect"]  ?? string.Empty;

        await EnsureClientAsync(new OpenIddictApplicationDescriptor
        {
            ClientId     = "plan-web",
            ClientSecret = planSecret,
            ClientType   = ClientTypes.Confidential,
            DisplayName  = "Plan Web",
            RedirectUris = { new Uri(planRedirect) },
            Permissions =
            {
                Permissions.Endpoints.Authorization,
                Permissions.Endpoints.Token,
                Permissions.Endpoints.EndSession,
                Permissions.GrantTypes.AuthorizationCode,
                Permissions.GrantTypes.RefreshToken,
                Permissions.ResponseTypes.Code,
                Permissions.Scopes.Email,
                Permissions.Scopes.Profile,
                Permissions.Scopes.Roles,
                Permissions.Prefixes.Scope + "plan.api"
            },
            Requirements = { Requirements.Features.ProofKeyForCodeExchange }
        });
    }

    private async Task EnsureClientAsync(OpenIddictApplicationDescriptor descriptor)
    {
        if (await applicationManager.FindByClientIdAsync(descriptor.ClientId!) is not null)
            return;

        await applicationManager.CreateAsync(descriptor);
        logger.LogInformation("Created OIDC client {ClientId}.", descriptor.ClientId);
    }

    // ── Admin user ───────────────────────────────────────────────────────────

    private async Task SeedAdminUserAsync()
    {
        var adminEmail    = configuration["AdminUser:Email"];
        var adminPassword = configuration["AdminUser:Password"];

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            logger.LogWarning("AdminUser:Email/Password not configured; skipping administrator seeding.");
            return;
        }

        var administrator = await userManager.FindByEmailAsync(adminEmail);
        if (administrator is null)
        {
            administrator = new AuthUser
            {
                UserName       = adminEmail,
                Email          = adminEmail,
                EmailConfirmed = true
            };

            var created = await userManager.CreateAsync(administrator, adminPassword);
            if (!created.Succeeded)
            {
                logger.LogWarning("Could not create admin user: {Errors}",
                    string.Join("; ", created.Errors.Select(e => e.Description)));
                return;
            }

            logger.LogInformation("Created administrator account {Email}.", adminEmail);
        }

        if (!await userManager.IsInRoleAsync(administrator, AdministratorRole))
        {
            await userManager.AddToRoleAsync(administrator, AdministratorRole);
        }
    }
}
