using Mabhas19.Application.Admin;
using Mabhas19.Application.Common.Interfaces;
using Mabhas19.Domain.Constants;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Mabhas19.Web.Endpoints;

/// <summary>Administrator-only management of users and their subscriptions.</summary>
public class Admin : IEndpointGroup
{
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.RequireAuthorization(policy => policy.RequireRole(Roles.Administrator));

        groupBuilder.MapGet(GetUsers, "users");
        groupBuilder.MapGet(GetUser, "users/{id}");
        groupBuilder.MapPost(CreateUser, "users");
        groupBuilder.MapPut(UpdateUserSubscription, "users/{id}/subscription");
        groupBuilder.MapPut(SetUserRole, "users/{id}/role");
        groupBuilder.MapDelete(DeleteUser, "users/{id}");
    }

    public static async Task<Ok<IReadOnlyList<AdminUserDto>>> GetUsers(IUserAdminService svc)
        => TypedResults.Ok(await svc.GetUsersAsync());

    public static async Task<Results<Ok<AdminUserDto>, NotFound>> GetUser(IUserAdminService svc, string id)
    {
        var user = await svc.GetUserAsync(id);
        return user is null ? TypedResults.NotFound() : TypedResults.Ok(user);
    }

    public static async Task<Results<Created<string>, BadRequest<string>>> CreateUser(IUserAdminService svc, CreateUserRequest body)
    {
        var (ok, error, userId) = await svc.CreateUserAsync(body);
        return ok
            ? TypedResults.Created($"/api/Admin/users/{userId}", userId)
            : TypedResults.BadRequest(error ?? "Failed to create user.");
    }

    public static async Task<Results<NoContent, NotFound>> UpdateUserSubscription(IUserAdminService svc, string id, UpdateUserSubscriptionRequest body)
    {
        var user = await svc.GetUserAsync(id);
        if (user is null) return TypedResults.NotFound();
        await svc.UpdateSubscriptionAsync(id, body);
        return TypedResults.NoContent();
    }

    public static async Task<Results<NoContent, NotFound>> SetUserRole(IUserAdminService svc, string id, SetUserRoleRequest body)
    {
        var ok = await svc.SetAdminRoleAsync(id, body.IsAdmin);
        return ok ? TypedResults.NoContent() : TypedResults.NotFound();
    }

    public static async Task<Results<NoContent, NotFound>> DeleteUser(IUserAdminService svc, string id)
    {
        var ok = await svc.DeleteUserAsync(id);
        return ok ? TypedResults.NoContent() : TypedResults.NotFound();
    }
}
