namespace Mabhas19.Application.Kurdnezam.News;

/// <summary>A news article as served to the public site and the admin panel.</summary>
public sealed class KurdnezamNewsDto
{
    public int Id { get; init; }

    public string Title { get; init; } = string.Empty;

    public string Summary { get; init; } = string.Empty;

    public string Body { get; init; } = string.Empty;

    /// <summary>Jalali date as displayed, e.g. <c>۱۴۰۵/۴/۲۱</c>.</summary>
    public string Date { get; init; } = string.Empty;

    public DateTimeOffset PublishedAt { get; init; }

    public string Author { get; init; } = string.Empty;

    public int CategoryId { get; init; }

    /// <summary>Denormalised so the site can render the category badge without a second call.</summary>
    public string? CategoryTitle { get; init; }

    public int? UnitId { get; init; }

    public string Image { get; init; } = string.Empty;

    public bool Featured { get; init; }
}
