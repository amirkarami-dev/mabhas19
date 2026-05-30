using System.Net.Http.Headers;
using System.Net.Http.Json;
using Mabhas19.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Mabhas19.Infrastructure.Auth;

/// <summary>
/// Delivers OTP codes through the kurdnezambargh SMS relay service
/// (https://sms.kurdnezambargh.ir), mirroring the vahedbargh-web integration.
/// The relay's static IP is whitelisted upstream (msgway template + Bale); it is
/// called as <c>POST {ServiceUrl}/send</c> with a Bearer token and a
/// <c>{ phone, code }</c> JSON body. When no token is configured the code is only
/// logged (development).
/// </summary>
public class SmsSender : ISmsSender
{
    private readonly HttpClient _http;
    private readonly SmsOptions _options;
    private readonly ILogger<SmsSender> _logger;

    public SmsSender(HttpClient http, IOptions<SmsOptions> options, ILogger<SmsSender> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(string phoneNumber, string code, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Token))
        {
            _logger.LogInformation("[SMS:log] to {Phone}: {Code}", phoneNumber, code);
            return;
        }

        try
        {
            var url = $"{_options.ServiceUrl.TrimEnd('/')}/send";
            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = JsonContent.Create(new { phone = phoneNumber, code })
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.Token);

            var response = await _http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("SMS relay returned {Status} for {Phone}: {Body}",
                    response.StatusCode, phoneNumber, body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SMS relay error for {Phone}", phoneNumber);
        }
    }
}
