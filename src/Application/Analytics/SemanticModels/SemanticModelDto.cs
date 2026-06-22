namespace Mabhas19.Application.Analytics.SemanticModels;

/// <summary>Describes a single field/column in a semantic model.</summary>
public class SemanticFieldDto
{
    /// <summary>Field identifier (matches the AI-generated JSON field names).</summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// Raw column key in the dataset rows. Defaults to <see cref="Id"/> when the
    /// column name matches the field id (most cases); set explicitly when they differ
    /// (e.g. id="area", column="areaM2"; id="quantity", column="qty").
    /// </summary>
    public string? Column { get; init; }

    /// <summary>Resolved column key: <see cref="Column"/> if set, otherwise <see cref="Id"/>.</summary>
    public string ResolvedColumn => Column ?? Id;

    /// <summary>Human-readable label (en-US).</summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>string | number | date</summary>
    public string Type { get; init; } = string.Empty;

    /// <summary>dimension | measure | date</summary>
    public string Role { get; init; } = string.Empty;
}

/// <summary>Summary of a queryable semantic model available to the report engine.</summary>
public class SemanticModelDto
{
    public string ModelKey { get; init; } = string.Empty;

    public string Name { get; init; } = string.Empty;

    public string? Description { get; init; }

    /// <summary>
    /// The source key that must be used as the <c>dataset</c> value in
    /// the generated <see cref="Mabhas19.Application.Analytics.Reports.ReportDefinitionDto"/>.
    /// </summary>
    public string Source { get; init; } = string.Empty;

    /// <summary>All fields exposed by this model.</summary>
    public IReadOnlyList<SemanticFieldDto> Fields { get; init; } = [];
}
