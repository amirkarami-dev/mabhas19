using Mabhas19.Application.Analytics.Reports;
using Mabhas19.Application.Common.Interfaces.Analytics;

namespace Mabhas19.Infrastructure.Analytics;

/// <summary>
/// Stub query engine — always returns an empty result set.
/// TODO(v2): replace with a real semantic query engine that translates
/// <see cref="ReportDefinitionDto"/> into SQL/DAX/MDX against the data warehouse.
/// </summary>
internal sealed class QueryEngine : IQueryEngine
{
    public Task<ReportResultDto> ExecuteAsync(ReportDefinitionDto definition, CancellationToken cancellationToken = default)
    {
        var result = new ReportResultDto
        {
            Columns = [],
            Rows = [],
            Total = 0
        };

        return Task.FromResult(result);
    }
}
