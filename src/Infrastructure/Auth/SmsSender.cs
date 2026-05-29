using System.Net;
using Mabhas19.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Mabhas19.Infrastructure.Auth;

/// <summary>
/// Sends SMS via Kavenegar (a common Iranian provider) when configured, otherwise logs
/// the message (development). Swap in another provider by extending <see cref="SendAsync"/>.
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

    public async Task SendAsync(string phoneNumber, string message, CancellationToken ct = default)
    {
        if (string.Equals(_options.Provider, "kavenegar", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            var url = $"https://api.kavenegar.com/v1/{_options.ApiKey}/sms/send.json"
                + $"?receptor={WebUtility.UrlEncode(phoneNumber)}"
                + $"&message={WebUtility.UrlEncode(message)}"
                + (string.IsNullOrWhiteSpace(_options.Sender) ? "" : $"&sender={WebUtility.UrlEncode(_options.Sender)}");

            try
            {
                var response = await _http.GetAsync(url, ct);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("SMS send failed ({Status}) for {Phone}", response.StatusCode, phoneNumber);
                }
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMS send error for {Phone}", phoneNumber);
                return;
            }
        }

        _logger.LogInformation("[SMS:log] to {Phone}: {Message}", phoneNumber, message);
        await Task.CompletedTask;
    }
}
