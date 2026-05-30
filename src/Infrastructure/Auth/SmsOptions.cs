namespace Mabhas19.Infrastructure.Auth;

public class SmsOptions
{
    public const string SectionName = "Sms";

    /// <summary>Base URL of the kurdnezambargh SMS relay service.</summary>
    public string ServiceUrl { get; set; } = "https://sms.kurdnezambargh.ir";

    /// <summary>Bearer token for the relay. When empty, codes are only logged (development).</summary>
    public string? Token { get; set; }
}
