namespace Mabhas19.Auth.Sms;

public class SmsOptions
{
    public const string SectionName = "Sms";

    /// <summary>"relay", "kavenegar" or "log" (default). When ApiKey is empty, always logs.</summary>
    public string Provider { get; set; } = "log";
    public string? ApiKey { get; set; }
    public string? Sender { get; set; }

    /// <summary>Base URL of the external OTP relay microservice (used when Provider is "relay").</summary>
    public string RelayBaseUrl { get; set; } = "https://sms.kurdnezambargh.ir";

    /// <summary>Bearer token for the OTP relay. Injected via environment variable at deploy time; never hardcoded.</summary>
    public string RelayToken { get; set; } = "";
}
