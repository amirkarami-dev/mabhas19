using System.Security.Cryptography;
using Mabhas19.Application.Common.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Mabhas19.Infrastructure.Auth;

public class OtpService : IOtpService
{
    private readonly IDistributedCache _cache;
    private readonly ISmsSender _sms;
    private readonly OtpOptions _options;
    private readonly ILogger<OtpService> _logger;

    public OtpService(
        IDistributedCache cache,
        ISmsSender sms,
        IOptions<OtpOptions> options,
        ILogger<OtpService> logger)
    {
        _cache = cache;
        _sms = sms;
        _options = options.Value;
        _logger = logger;
    }

    private static string Key(string phone) => $"otp:{phone}";

    public async Task RequestAsync(string phoneNumber, CancellationToken ct = default)
    {
        var code = GenerateCode(_options.CodeLength);

        await _cache.SetStringAsync(Key(phoneNumber), code, new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(_options.TtlSeconds)
        }, ct);

        if (_options.LogCode)
        {
            _logger.LogInformation("OTP for {Phone} is {Code}", phoneNumber, code);
        }

        await _sms.SendAsync(phoneNumber, $"کد ورود شما به مبحث ۱۹: {code}", ct);
    }

    public async Task<bool> VerifyAsync(string phoneNumber, string code, CancellationToken ct = default)
    {
        var stored = await _cache.GetStringAsync(Key(phoneNumber), ct);
        if (string.IsNullOrEmpty(stored)) return false;

        var ok = CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.UTF8.GetBytes(stored),
            System.Text.Encoding.UTF8.GetBytes(code.Trim()));

        if (ok)
        {
            await _cache.RemoveAsync(Key(phoneNumber), ct);
        }

        return ok;
    }

    private static string GenerateCode(int length)
    {
        var max = (int)Math.Pow(10, length);
        var value = RandomNumberGenerator.GetInt32(0, max);
        return value.ToString().PadLeft(length, '0');
    }
}
