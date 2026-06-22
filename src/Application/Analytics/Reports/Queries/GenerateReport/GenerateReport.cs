using Mabhas19.Application.Common.Interfaces.Analytics;
using Mabhas19.Application.Common.Security;

namespace Mabhas19.Application.Analytics.Reports.Queries.GenerateReport;

[Authorize]
public record GenerateReportQuery(string Prompt, string SemanticModelId) : IRequest<ReportDefinitionDto>;

public class GenerateReportQueryHandler : IRequestHandler<GenerateReportQuery, ReportDefinitionDto>
{
    private readonly IReportAiService _aiService;

    public GenerateReportQueryHandler(IReportAiService aiService)
    {
        _aiService = aiService;
    }

    public Task<ReportDefinitionDto> Handle(GenerateReportQuery request, CancellationToken cancellationToken)
        => _aiService.GenerateAsync(request.Prompt, request.SemanticModelId, cancellationToken);
}
