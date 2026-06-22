using System.Text.Json.Nodes;
using Mabhas19.Application.Analytics.Dashboards;
using Mabhas19.Application.Analytics.Dashboards.Commands.DeleteDashboard;
using Mabhas19.Application.Analytics.Dashboards.Commands.SaveDashboard;
using Mabhas19.Application.Analytics.Dashboards.Queries.GetDashboard;
using Mabhas19.Application.Analytics.Dashboards.Queries.GetDashboards;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Mabhas19.Web.Endpoints.Analytics;

/// <summary>
/// Dashboard CRUD endpoints. Auto-mapped to <c>/api/Dashboards</c>.
/// </summary>
public class Dashboards : Mabhas19.Web.Infrastructure.IEndpointGroup
{
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.RequireAuthorization();

        groupBuilder.MapGet(GetDashboards,   string.Empty);
        groupBuilder.MapGet(GetDashboard,    "{id:int}");
        groupBuilder.MapPost(SaveDashboard,  string.Empty);
        groupBuilder.MapDelete(DeleteDashboard, "{id:int}");
    }

    public static async Task<Ok<IReadOnlyList<DashboardDto>>> GetDashboards(ISender sender)
        => TypedResults.Ok(await sender.Send(new GetDashboardsQuery()));

    public static async Task<Results<Ok<DashboardDto>, NotFound>> GetDashboard(ISender sender, int id)
    {
        try
        {
            return TypedResults.Ok(await sender.Send(new GetDashboardQuery(id)));
        }
        catch (Ardalis.GuardClauses.NotFoundException)
        {
            return TypedResults.NotFound();
        }
    }

    public static async Task<Ok<int>> SaveDashboard(ISender sender, SaveDashboardRequest request)
        => TypedResults.Ok(await sender.Send(new SaveDashboardCommand(request.Name, request.Widgets, request.Layout)));

    public static async Task<Results<NoContent, NotFound>> DeleteDashboard(ISender sender, int id)
    {
        try
        {
            await sender.Send(new DeleteDashboardCommand(id));
            return TypedResults.NoContent();
        }
        catch (Ardalis.GuardClauses.NotFoundException)
        {
            return TypedResults.NotFound();
        }
    }
}

/// <summary>Request body for POST /api/Dashboards.</summary>
public sealed record SaveDashboardRequest(string Name, JsonArray Widgets, JsonObject Layout);
