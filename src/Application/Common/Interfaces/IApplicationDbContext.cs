using Mabhas19.Domain.Entities;

namespace Mabhas19.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Project> Projects { get; }

    DbSet<Assessment> Assessments { get; }

    DbSet<AssessmentReport> AssessmentReports { get; }

    DbSet<Subscription> Subscriptions { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
