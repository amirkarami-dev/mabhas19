using Mabhas19.Domain.Common;

namespace Mabhas19.Domain.Analytics;

/// <summary>A named collection of widgets backed by report definitions.</summary>
public class Dashboard : BaseAuditableEntity
{
    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    /// <summary>JSON-serialised widget layout.</summary>
    public string? LayoutJson { get; set; }

    public string? TenantId { get; set; }
}
