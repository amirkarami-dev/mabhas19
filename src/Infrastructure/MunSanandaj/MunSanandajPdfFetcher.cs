using System.Net;
using Mabhas19.Application.Common.Interfaces.MunSanandaj;

namespace Mabhas19.Infrastructure.MunSanandaj;

internal sealed class MunSanandajPdfFetcher : IMunSanandajPdfFetcher
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(60) };

    public async Task<string?> FetchAsBase64Async(string peygiri, CancellationToken ct = default)
    {
        // The PDF file is named by the Peygiri (tracking code), NOT the ProjectNo.
        var url = $"https://eservice.kurdnezam.ir/sm/pdf/{peygiri}.pdf";
        using var response = await Http.GetAsync(url, ct);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;
        response.EnsureSuccessStatusCode();
        var bytes = await response.Content.ReadAsByteArrayAsync(ct);
        return Convert.ToBase64String(bytes);
    }
}
