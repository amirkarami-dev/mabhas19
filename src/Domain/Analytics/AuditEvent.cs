using Mabhas19.Domain.Common;

namespace Mabhas19.Domain.Analytics;

/// <summary>Immutable audit log entry for analytics actions.</summary>
public class AuditEvent : BaseEntity
{
    public DateTimeOffset OccurredAt { get; set; }

    public string? TenantId { get; set; }

    public string? UserId { get; set; }

    /// <summary>Action identifier, e.g. "report.executed", "dashboard.viewed".</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>JSON-serialised payload carrying action details.</summary>
    public string? PayloadJson { get; set; }
}
