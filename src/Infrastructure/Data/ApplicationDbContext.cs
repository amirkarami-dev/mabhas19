using System.Reflection;
using Mabhas19.Application.Common.Interfaces;
using Mabhas19.Domain.Analytics;
using Mabhas19.Domain.Entities;
using Mabhas19.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Mabhas19.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Project> Projects => Set<Project>();

    public DbSet<Assessment> Assessments => Set<Assessment>();

    public DbSet<AssessmentReport> AssessmentReports => Set<AssessmentReport>();

    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    // Analytics aggregates
    public DbSet<AnalyticsReport> AnalyticsReports => Set<AnalyticsReport>();

    public DbSet<Dashboard> AnalyticsDashboards => Set<Dashboard>();

    public DbSet<AiProvider> AnalyticsAiProviders => Set<AiProvider>();

    public DbSet<Tenant> AnalyticsTenants => Set<Tenant>();

    public DbSet<AuditEvent> AnalyticsAuditEvents => Set<AuditEvent>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
