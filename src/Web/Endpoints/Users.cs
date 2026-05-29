using Mabhas19.Application.Common.Interfaces;
using Mabhas19.Domain.Constants;
using Mabhas19.Infrastructure.Identity;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Mabhas19.Web.Endpoints;

public class Users : IEndpointGroup
{
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapIdentityApi<ApplicationUser>();

        groupBuilder.MapGet(Me, "me").RequireAuthorization();
        groupBuilder.MapPost(Logout, "logout").RequireAuthorization();
    }

    [EndpointSummary("Current user profile + roles")]
    public static async Task<Results<Ok<CurrentUserDto>, UnauthorizedHttpResult>> Me(
        IUser user, UserManager<ApplicationUser> userManager)
    {
        if (string.IsNullOrEmpty(user.Id)) return TypedResults.Unauthorized();

        var appUser = await userManager.FindByIdAsync(user.Id);
        if (appUser is null) return TypedResults.Unauthorized();

        var roles = await userManager.GetRolesAsync(appUser);
        return TypedResults.Ok(new CurrentUserDto(
            appUser.Id,
            appUser.Email,
            appUser.PhoneNumber,
            roles.ToArray(),
            roles.Contains(Roles.Administrator)));
    }

    [EndpointSummary("Log out")]
    [EndpointDescription("Logs out the current user by clearing the authentication cookie.")]
    public static async Task<Results<Ok, UnauthorizedHttpResult>> Logout(SignInManager<ApplicationUser> signInManager, [FromBody] object empty)
    {
        if (empty != null)
        {
            await signInManager.SignOutAsync();
            return TypedResults.Ok();
        }

        return TypedResults.Unauthorized();
    }
}

public record CurrentUserDto(string Id, string? Email, string? PhoneNumber, string[] Roles, bool IsAdmin);
