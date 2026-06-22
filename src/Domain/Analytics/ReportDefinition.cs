using Mabhas19.Domain.Common;

namespace Mabhas19.Domain.Analytics;

/// <summary>Defines the shape of an analytics report: its dataset, columns, and filters.</summary>
public class ReportDefinition : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;

    /// <summary>The semantic dataset / view the report targets.</summary>
    public string Dataset { get; set; } = string.Empty;

    /// <summary>JSON-serialised column definitions.</summary>
    public string? ColumnsJson { get; set; }

    /// <summary>Owning tenant (optional until multi-tenant is wired in v2).</summary>
    public string? TenantId { get; set; }
}
