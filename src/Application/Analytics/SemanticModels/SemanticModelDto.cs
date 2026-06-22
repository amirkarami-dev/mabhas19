namespace Mabhas19.Application.Analytics.SemanticModels;

/// <summary>Summary of a queryable semantic model available to the report engine.</summary>
public class SemanticModelDto
{
    public string ModelKey { get; init; } = string.Empty;

    public string Name { get; init; } = string.Empty;

    public string? Description { get; init; }
}
