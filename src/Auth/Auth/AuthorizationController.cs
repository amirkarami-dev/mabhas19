using System.Collections.Immutable;
using System.Security.Claims;
using Mabhas19.Auth.Data;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;
using static OpenIddict.Abstractions.OpenIddictConstants;

namespace Mabhas19.Auth;

public class AuthorizationController(
    SignInManager<AuthUser> signInManager,
    UserManager<AuthUser> userManager) : Controller
{
    [HttpGet("connect/authorize"), HttpPost("connect/authorize")]
    public async Task<IActionResult> Authorize()
    {
        var request = HttpContext.GetOpenIddictServerRequest()!;
        var result = await HttpContext.AuthenticateAsync(IdentityConstants.ApplicationScheme);
        if (!result.Succeeded)
        {
            return Challenge(
                authenticationSchemes: IdentityConstants.ApplicationScheme,
                properties: new AuthenticationProperties
                {
                    RedirectUri = Request.PathBase + Request.Path + QueryString.Create(
                        Request.HasFormContentType ? Request.Form : Request.Query)
                });
        }

        var user = await userManager.GetUserAsync(result.Principal!)
                   ?? throw new InvalidOperationException("User not found.");

        var principal = await BuildPrincipalAsync(user, request.GetScopes());
        return SignIn(principal, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
    }

    [HttpPost("connect/token"), Produces("application/json")]
    public async Task<IActionResult> Exchange()
    {
        var request = HttpContext.GetOpenIddictServerRequest()!;
        if (!request.IsAuthorizationCodeGrantType() && !request.IsRefreshTokenGrantType())
            throw new InvalidOperationException("Unsupported grant type.");

        var auth = await HttpContext.AuthenticateAsync(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        var user = await userManager.GetUserAsync(auth.Principal!)
                   ?? throw new InvalidOperationException("User not found.");

        var principal = await BuildPrincipalAsync(user, auth.Principal!.GetScopes());
        return SignIn(principal, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
    }

    [HttpGet("connect/userinfo")]
    public async Task<IActionResult> UserInfo()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
            return Challenge(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);

        return Ok(new Dictionary<string, object?>
        {
            [Claims.Subject] = user.Id,
            [Claims.Name]    = user.UserName,
            [Claims.Email]   = user.Email
        });
    }

    [HttpGet("connect/logout"), HttpPost("connect/logout")]
    public async Task<IActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return SignOut(
            authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
            properties: new AuthenticationProperties { RedirectUri = "/" });
    }

    private async Task<ClaimsPrincipal> BuildPrincipalAsync(AuthUser user, IEnumerable<string> scopes)
    {
        var principal = await signInManager.CreateUserPrincipalAsync(user);

        principal.SetClaim(Claims.Subject,          user.Id);
        principal.SetClaim(Claims.Name,             user.UserName);
        principal.SetClaim(Claims.Email,            user.Email);
        principal.SetClaim("preferred_username",    user.UserName);

        // SetClaims requires ImmutableArray<string> — convert the IList<string> returned by GetRolesAsync.
        var roles = await userManager.GetRolesAsync(user);
        principal.SetClaims(Claims.Role, roles.ToImmutableArray());

        principal.SetScopes(scopes);
        principal.SetResources("mabhas19.api");
        principal.SetDestinations(OpenIddictClaimDestinations.For);

        return principal;
    }
}
