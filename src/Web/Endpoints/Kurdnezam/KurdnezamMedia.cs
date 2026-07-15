using System.Text.RegularExpressions;
using Mabhas19.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Mabhas19.Web.Endpoints.Kurdnezam;

/// <summary>
/// Image upload + delivery for the kurdnezam CMS.
/// </summary>
/// <remarks>
/// Uploads go to MinIO; delivery is streamed back through this endpoint rather than via a
/// presigned URL, because presigned URLs expire and these URLs are persisted on content rows
/// that a public site renders indefinitely. Streaming also keeps the bucket private.
/// </remarks>
public partial class KurdnezamMedia : Mabhas19.Web.Infrastructure.IEndpointGroup
{
    public static string? RoutePrefix => "/api/kurdnezam/media";

    /// <summary>Objects live under this prefix; the route never accepts a raw object key.</summary>
    private const string Prefix = "kurdnezam/";

    private const long MaxBytes = 5 * 1024 * 1024;

    private static readonly Dictionary<string, string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/png"] = ".png",
        ["image/jpeg"] = ".jpg",
        ["image/webp"] = ".webp",
        ["image/gif"] = ".gif"
    };

    private static readonly Dictionary<string, string> ContentTypeByExtension = new(StringComparer.OrdinalIgnoreCase)
    {
        [".png"] = "image/png",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".webp"] = "image/webp",
        [".gif"] = "image/gif"
    };

    // A stored file is always "<32 hex chars><known image extension>". Anything else is rejected,
    // so the route cannot be walked into other prefixes of the bucket (e.g. reports/).
    [GeneratedRegex(@"^[a-f0-9]{32}\.(png|jpg|jpeg|webp|gif)$", RegexOptions.IgnoreCase)]
    private static partial Regex FileNamePattern();

    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(UploadKurdnezamMedia, string.Empty).RequireAdmin().DisableAntiforgery();
        groupBuilder.MapGet(GetKurdnezamMedia, "{fileName}").AllowAnonymous();
    }

    public static async Task<Results<Ok<KurdnezamMediaDto>, BadRequest<string>>> UploadKurdnezamMedia(
        IFileStorage storage,
        IFormFile file,
        CancellationToken ct)
    {
        if (file.Length == 0)
            return TypedResults.BadRequest("The file is empty.");

        if (file.Length > MaxBytes)
            return TypedResults.BadRequest($"The file exceeds the {MaxBytes / (1024 * 1024)} MB limit.");

        if (!AllowedTypes.TryGetValue(file.ContentType ?? string.Empty, out var extension))
            return TypedResults.BadRequest($"Unsupported image type. Allowed: {string.Join(", ", AllowedTypes.Keys)}.");

        var fileName = $"{Guid.NewGuid():N}{extension}";

        await using var stream = file.OpenReadStream();
        await storage.PutAsync(Prefix + fileName, stream, file.ContentType!, ct);

        return TypedResults.Ok(new KurdnezamMediaDto(fileName, $"/api/kurdnezam/media/{fileName}"));
    }

    public static async Task<Results<FileStreamHttpResult, NotFound>> GetKurdnezamMedia(
        IFileStorage storage,
        HttpContext http,
        string fileName,
        CancellationToken ct)
    {
        if (!FileNamePattern().IsMatch(fileName))
            return TypedResults.NotFound();

        Stream stream;
        try
        {
            stream = await storage.GetAsync(Prefix + fileName, ct);
        }
        catch (Exception)
        {
            // Storage throws provider-specific "no such key" exceptions; a missing image is a 404.
            return TypedResults.NotFound();
        }

        var extension = Path.GetExtension(fileName);
        var contentType = ContentTypeByExtension.GetValueOrDefault(extension, "application/octet-stream");

        // File names are content-addressed by a fresh GUID, so a stored object never changes.
        http.Response.Headers.CacheControl = "public, max-age=31536000, immutable";

        return TypedResults.Stream(stream, contentType);
    }
}

/// <summary>The stored file and the URL to render it with.</summary>
public sealed record KurdnezamMediaDto(string FileName, string Url);
