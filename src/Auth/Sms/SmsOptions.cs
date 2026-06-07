namespace Mabhas19.Auth.Sms;

public class SmsOptions
{
    public const string SectionName = "Sms";

    /// <summary>"relay", "direct" (msgway), "kavenegar" or "log" (default). When unconfigured, logs.</summary>
    public string Provider { get; set; } = "direct";
    public string? ApiKey { get; set; }
    public string? Sender { get; set; }

    /// <summary>Base URL of the external OTP relay microservice (used when Provider is "relay").</summary>
    public string RelayBaseUrl { get; set; } = "https://sms.kurdnezambargh.ir";

    /// <summary>Bearer token for the OTP relay. Injected via environment variable at deploy time; never hardcoded.</summary>
    public string RelayToken { get; set; } = "";

    // --- Direct msgway.com sending (Provider = "direct") ---

    /// <summary>msgway API base URL.</summary>
    public string MsgwayBaseUrl { get; set; } = "https://api.msgway.com";

    /// <summary>msgway API key (sent as the "apiKey" header). Injected at deploy time; never hardcoded.</summary>
    public string? MsgwayApiKey { get; set; }

    /// <summary>msgway provider id. Default 0.</summary>
    public int MsgwayProvider { get; set; } = 0;

    /// <summary>msgway template id whose Param1 is the verification code.</summary>
    public int MsgwayTemplateId { get; set; }
}
