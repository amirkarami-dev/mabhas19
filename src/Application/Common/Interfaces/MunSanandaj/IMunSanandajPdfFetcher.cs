namespace Mabhas19.Application.Common.Interfaces.MunSanandaj;

/// <summary>Fetches the pre-generated supervising-engineer PDF for a project and base64-encodes it.</summary>
public interface IMunSanandajPdfFetcher
{
    /// <summary>Returns null (not an exception) when the PDF hasn't been generated yet (HTTP 404) —
    /// the caller logs this attempt as Failed and retries on the next 12h run, same as any other failure.</summary>
    Task<string?> FetchAsBase64Async(string projectNo, CancellationToken ct = default);
}
