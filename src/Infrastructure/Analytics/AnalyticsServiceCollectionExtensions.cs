using Mabhas19.Application.Common.Interfaces.Analytics;
using Microsoft.Extensions.DependencyInjection;

namespace Mabhas19.Infrastructure.Analytics;

internal static class AnalyticsServiceCollectionExtensions
{
    public static IServiceCollection AddAnalyticsServices(this IServiceCollection services)
    {
        // The only fully-wired implementation (used by POST /api/Reports/execute).
        services.AddScoped<IQueryEngine, QueryEngine>();

        // Stub implementations — will throw NotImplementedException("v2") until replaced.
        services.AddScoped<IReportAiService, ReportAiService>();
        services.AddScoped<ISemanticModelStore, SemanticModelStore>();
        services.AddScoped<IAiProviderRouter, AiProviderRouter>();
        services.AddScoped<IExportEngine, ExportEngine>();

        // Reads tenant context from the current user's claims.
        services.AddScoped<ITenantContext, TenantContext>();

        return services;
    }
}
