namespace Mabhas19.Application.Common.Interfaces;

/// <summary>Sends SMS messages (used for mobile OTP login).</summary>
public interface ISmsSender
{
    Task SendAsync(string phoneNumber, string message, CancellationToken ct = default);
}
