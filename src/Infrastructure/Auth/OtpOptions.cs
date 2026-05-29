namespace Mabhas19.Infrastructure.Auth;

public class OtpOptions
{
    public const string SectionName = "Otp";

    public int CodeLength { get; set; } = 5;
    public int TtlSeconds { get; set; } = 120;

    /// <summary>When true, the generated code is logged (development convenience).</summary>
    public bool LogCode { get; set; } = true;
}
