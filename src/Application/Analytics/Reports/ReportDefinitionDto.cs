namespace Mabhas19.Application.Analytics.Reports;

/// <summary>Portable description of a report — dataset to query, columns to select, and optional filters.</summary>
public class ReportDefinitionDto
{
    public string Name { get; init; } = string.Empty;

    /// <summary>The semantic dataset / view the report targets.</summary>
    public string Dataset { get; init; } = string.Empty;

    /// <summary>Columns to include in the result. Empty = all columns.</summary>
    public IReadOnlyList<string> Columns { get; init; } = [];

    /// <summary>Optional free-text filter expression (v2 will parse this into a typed predicate).</summary>
    public string? FilterExpression { get; init; }
}
