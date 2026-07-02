using Mabhas19.Domain.Analytics;
using Mabhas19.Domain.Entities;
using Mabhas19.Domain.MunSanandaj;

namespace Mabhas19.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Project> Projects { get; }

    DbSet<Assessment> Assessments { get; }

    DbSet<AssessmentReport> AssessmentReports { get; }

    DbSet<Subscription> Subscriptions { get; }

    // Analytics aggregates
    DbSet<AnalyticsReport> AnalyticsReports { get; }

    DbSet<Dashboard> AnalyticsDashboards { get; }

    DbSet<AiProvider> AnalyticsAiProviders { get; }

    DbSet<Tenant> AnalyticsTenants { get; }

    DbSet<AuditEvent> AnalyticsAuditEvents { get; }

    // MunSanandaj integration
    DbSet<MunSyncRun> MunSyncRuns { get; }

    DbSet<MunReportLog> MunReportLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
