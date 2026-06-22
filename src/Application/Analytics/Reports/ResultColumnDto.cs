namespace Mabhas19.Application.Analytics.Reports;

/// <summary>Describes a single column in a <see cref="ReportResultDto"/>.</summary>
public class ResultColumnDto
{
    public string Name { get; init; } = string.Empty;

    /// <summary>Data type hint for the client, e.g. "string", "number", "date".</summary>
    public string DataType { get; init; } = "string";
}
