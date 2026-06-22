using Mabhas19.Application.Analytics.Reports;
using Mabhas19.Application.Analytics.Reports.Queries.ExecuteReport;
using Mabhas19.Application.Analytics.Reports.Queries.GenerateReport;
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
        groupBuilder.MapPost(GenerateReport, "generate");
    }

    public static async Task<Ok<ReportResultDto>> ExecuteReport(ISender sender, ReportDefinitionDto definition)
        => TypedResults.Ok(await sender.Send(new ExecuteReportQuery(definition)));

    public static async Task<Ok<ReportDefinitionDto>> GenerateReport(ISender sender, GenerateReportRequest request)
        => TypedResults.Ok(await sender.Send(new GenerateReportQuery(request.Prompt, request.SemanticModelId)));
}

/// <summary>Request body for POST /api/Reports/generate.</summary>
public sealed record GenerateReportRequest(string Prompt, string SemanticModelId);
