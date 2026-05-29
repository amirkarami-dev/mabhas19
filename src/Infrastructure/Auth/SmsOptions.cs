namespace Mabhas19.Infrastructure.Auth;

public class SmsOptions
{
    public const string SectionName = "Sms";

    /// <summary>"kavenegar" or "log" (default). When ApiKey is empty, always logs.</summary>
    public string Provider { get; set; } = "log";
    public string? ApiKey { get; set; }
    public string? Sender { get; set; }
}
