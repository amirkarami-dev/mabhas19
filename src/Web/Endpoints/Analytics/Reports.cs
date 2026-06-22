using Mabhas19.Application.Analytics.Reports;
using Mabhas19.Application.Analytics.Reports.Queries.ExecuteReport;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Mabhas19.Web.Endpoints.Analytics;

/// <summary>
/// Analytics report endpoints. Auto-mapped to <c>/api/Reports</c> by
/// <see cref="Mabhas19.Web.Infrastructure.IEndpointGroup"/> conventions.
/// </summary>
public class Reports : Mabhas19.Web.Infrastructure.IEndpointGroup
{
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.RequireAuthorization();

        groupBuilder.MapPost(ExecuteReport, "execute");
    }

    public static async Task<Ok<ReportResultDto>> ExecuteReport(ISender sender, ReportDefinitionDto definition)
        => TypedResults.Ok(await sender.Send(new ExecuteReportQuery(definition)));
}
