using Mabhas19.Application.Common.Interfaces.Analytics;
using Mabhas19.Infrastructure.Analytics.Ai;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Mabhas19.Infrastructure.Analytics;

internal static class AnalyticsServiceCollectionExtensions
{
    public static IServiceCollection AddAnalyticsServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Bind ArvanCloud AI gateway options (BaseUrl/ApiKey must come from user-secrets / env / SOPS).
        services.Configure<ArvanAiOptions>(configuration.GetSection(ArvanAiOptions.SectionName));

        // The only fully-wired query-engine implementation (used by POST /api/Reports/execute).
        services.AddScoped<IQueryEngine, QueryEngine>();

        // Real semantic model store — static catalogue of 3 bundled models.
        services.AddScoped<ISemanticModelStore, SemanticModelStore>();

        // Real AI service — typed HttpClient with 120 s timeout to absorb reasoning-model latency.
        services.AddHttpClient<IReportAiService, ArvanReportAiService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(120);
        });

        // Stub implementations — will be replaced in future iterations.
        services.AddScoped<IAiProviderRouter, AiProviderRouter>();
        services.AddScoped<IExportEngine, ExportEngine>();

        // Reads tenant context from the current user's claims.
        services.AddScoped<ITenantContext, TenantContext>();

        return services;
    }
}
