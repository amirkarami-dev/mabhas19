namespace Mabhas19.Application.Common.Interfaces;

/// <summary>Sends OTP codes via SMS (used for mobile OTP login).</summary>
public interface ISmsSender
{
    Task SendAsync(string phoneNumber, string code, CancellationToken ct = default);
}
