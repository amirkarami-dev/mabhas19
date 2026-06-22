using Mabhas19.Domain.Common;

namespace Mabhas19.Domain.Analytics;

/// <summary>Configuration record for an AI completion provider (e.g. OpenAI, Azure OpenAI).</summary>
public class AiProvider : BaseAuditableEntity
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Provider type tag, e.g. "openai", "azure".</summary>
    public string ProviderType { get; set; } = string.Empty;

    public bool IsEnabled { get; set; } = true;

    /// <summary>Priority — lower value = higher priority when routing requests.</summary>
    public int Priority { get; set; }
}
