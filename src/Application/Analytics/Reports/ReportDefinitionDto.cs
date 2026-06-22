using System.Text.Json.Serialization;

namespace Mabhas19.Application.Analytics.Reports;

// ---------------------------------------------------------------------------
// Nested DTOs for the AI-generated report definition
// ---------------------------------------------------------------------------

/// <summary>A column reference in the SELECT list.</summary>
public class ReportColumnDto
{
    [JsonPropertyName("field")]
    public string Field { get; init; } = string.Empty;
}

/// <summary>A filter predicate applied before aggregation.</summary>
public class ReportFilterDto
{
    [JsonPropertyName("field")]
    public string Field { get; init; } = string.Empty;

    [JsonPropertyName("operator")]
    public string Operator { get; init; } = string.Empty;   // eq neq gt gte lt lte in contains between

    [JsonPropertyName("value")]
    public object? Value { get; init; }
}

/// <summary>A GROUP BY field, with an optional date bucket.</summary>
public class ReportGroupByDto
{
    [JsonPropertyName("field")]
    public string Field { get; init; } = string.Empty;

    /// <summary>day | week | month | quarter | year</summary>
    [JsonPropertyName("dateBucket")]
    public string? DateBucket { get; init; }
}

/// <summary>An aggregated measure column.</summary>
public class ReportMetricDto
{
    [JsonPropertyName("field")]
    public string Field { get; init; } = string.Empty;

    /// <summary>sum | avg | min | max | count | countDistinct</summary>
    [JsonPropertyName("aggregation")]
    public string Aggregation { get; init; } = string.Empty;

    [JsonPropertyName("alias")]
    public string? Alias { get; init; }
}

/// <summary>A sort specification.</summary>
public class ReportSortDto
{
    [JsonPropertyName("field")]
    public string Field { get; init; } = string.Empty;

    /// <summary>asc | desc</summary>
    [JsonPropertyName("direction")]
    public string Direction { get; init; } = "asc";
}

// ---------------------------------------------------------------------------
// Root DTO — matches the AI JSON output and is the application's transfer object
// ---------------------------------------------------------------------------

/// <summary>
/// Portable description of a report — the full shape returned by the AI
/// and accepted by the query engine.
/// </summary>
public class ReportDefinitionDto
{
    /// <summary>Machine-readable identifier suggested by the AI.</summary>
    [JsonPropertyName("id")]
    public string? Id { get; init; }

    [JsonPropertyName("name")]
    public string Name { get; init; } = string.Empty;

    /// <summary>The semantic dataset / view the report targets.</summary>
    [JsonPropertyName("dataset")]
    public string Dataset { get; init; } = string.Empty;

    /// <summary>Columns to include in the result (SELECT list).</summary>
    [JsonPropertyName("columns")]
    public IReadOnlyList<ReportColumnDto> Columns { get; init; } = [];

    [JsonPropertyName("filters")]
    public IReadOnlyList<ReportFilterDto> Filters { get; init; } = [];

    [JsonPropertyName("groupBy")]
    public IReadOnlyList<ReportGroupByDto> GroupBy { get; init; } = [];

    [JsonPropertyName("metrics")]
    public IReadOnlyList<ReportMetricDto> Metrics { get; init; } = [];

    [JsonPropertyName("sorting")]
    public IReadOnlyList<ReportSortDto> Sorting { get; init; } = [];

    [JsonPropertyName("limit")]
    public int? Limit { get; init; }
}
