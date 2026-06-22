using Mabhas19.Domain.Common;

namespace Mabhas19.Domain.Analytics;

/// <summary>Logical tenant for multi-tenant analytics isolation (v2).</summary>
public class Tenant : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Stable external slug used in JWT claims and API routes.</summary>
    public string Slug { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}
