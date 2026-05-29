using Mabhas19.Application.Common.Exceptions;
using Mabhas19.Application.Common.Interfaces;
using Mabhas19.Application.Common.Security;
using Mabhas19.Domain.Entities;
using Mabhas19.Domain.Enums;

namespace Mabhas19.Application.Assessments.Commands.SaveAssessment;

[Authorize]
public record SaveAssessmentCommand : IRequest
{
    public int ProjectId { get; init; }
    public string InputJson { get; init; } = "{}";
    public string ResultJson { get; init; } = "{}";
    public int TotalScore { get; init; }
    public int MaxScore { get; init; }
}

public class SaveAssessmentCommandHandler : IRequestHandler<SaveAssessmentCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;

    public SaveAssessmentCommandHandler(IApplicationDbContext context, IUser user)
    {
        _context = context;
        _user = user;
    }

    public async Task Handle(SaveAssessmentCommand request, CancellationToken cancellationToken)
    {
        var project = await _context.Projects
            .Include(p => p.Assessment)
            .FirstOrDefaultAsync(p => p.Id == request.ProjectId, cancellationToken);

        Guard.Against.NotFound(request.ProjectId, project);

        if (project.OwnerId != _user.Id) throw new ForbiddenAccessException();

        var status = request.TotalScore > 0 ? AssessmentStatus.Completed : AssessmentStatus.Draft;

        if (project.Assessment is null)
        {
            project.Assessment = new Assessment
            {
                ProjectId = project.Id,
                InputJson = NormalizeJson(request.InputJson),
                ResultJson = NormalizeJson(request.ResultJson),
                TotalScore = request.TotalScore,
                MaxScore = request.MaxScore,
                Status = status
            };
            _context.Assessments.Add(project.Assessment);
        }
        else
        {
            project.Assessment.InputJson = NormalizeJson(request.InputJson);
            project.Assessment.ResultJson = NormalizeJson(request.ResultJson);
            project.Assessment.TotalScore = request.TotalScore;
            project.Assessment.MaxScore = request.MaxScore;
            project.Assessment.Status = status;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static string NormalizeJson(string? json) => string.IsNullOrWhiteSpace(json) ? "{}" : json;
}
