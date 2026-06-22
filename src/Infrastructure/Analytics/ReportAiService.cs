using Mabhas19.Application.Analytics.Reports;
using Mabhas19.Application.Common.Interfaces.Analytics;

namespace Mabhas19.Infrastructure.Analytics;

/// <summary>
/// Stub AI report-generation service.
/// TODO(v2): call <see cref="IAiProviderRouter"/> with a structured prompt and parse the response
/// into a <see cref="ReportDefinitionDto"/>.
/// </summary>
internal sealed class ReportAiService : IReportAiService
{
    public Task<ReportDefinitionDto> GenerateAsync(string prompt, string semanticModelId, CancellationToken cancellationToken = default)
        => throw new NotImplementedException("v2");
}
