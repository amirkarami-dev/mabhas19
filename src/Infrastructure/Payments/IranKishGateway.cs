using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Mabhas19.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Mabhas19.Infrastructure.Payments;

/// <summary>Iran Kish (ایران کیش) merchant settings. Secrets arrive via env in production.</summary>
public class IranKishOptions
{
    public const string SectionName = "IranKish";

    public string TerminalId { get; set; } = string.Empty;

    public string AcceptorId { get; set; } = string.Empty;

    /// <summary>Hex pass phrase; part of the encrypted authentication envelope. SECRET.</summary>
    public string PassPhrase { get; set; } = string.Empty;

    /// <summary>Merchant RSA public key (PEM) issued by Iran Kish.</summary>
    public string RsaPublicKey { get; set; } = string.Empty;

    /// <summary>Card-preservation id. The legacy site shipped one in an XML file; empty works for plain purchases.</summary>
    public string CmsPreservationId { get; set; } = string.Empty;

    /// <summary>Where the BANK posts the payer back to — our API's callback endpoint.</summary>
    public string CallbackUrl { get; set; } = string.Empty;

    public string TokenUrl { get; set; } = "https://ikc.shaparak.ir/api/v3/tokenization/make";

    public string VerifyUrl { get; set; } = "https://ikc.shaparak.ir/api/v3/confirmation/purchase";

    /// <summary>The hosted payment page; the token is appended as the last path segment.</summary>
    public string PaymentPageUrl { get; set; } = "https://ikc.shaparak.ir/iuiv3/IPG/Index";
}

/// <summary>
/// Iran Kish v3 gateway — a port of the battle-tested VahedGas <c>PaymentIrkService</c> +
/// <c>CreateJsonRequest</c> pair, with the same wire format but modern internals: the request's
/// authentication envelope (AES-128-CBC over hex(terminal+passphrase+paddedAmount+"00"), SHA-256
/// of the ciphertext, RSA-PKCS1 of key||hash) is built with System.Security.Cryptography — the
/// BouncyCastle and merchant-XML-file dependencies are gone.
/// </summary>
public sealed class IranKishGateway(
    IHttpClientFactory httpClientFactory,
    IOptions<IranKishOptions> options,
    ILogger<IranKishGateway> logger) : IPaymentGateway
{
    private readonly IranKishOptions _o = options.Value;

    // The bank's contract is casing-sensitive and mixed (terminalId next to AcceptorId), so every
    // name is pinned explicitly rather than trusting a naming policy.
    private sealed record TokenRequestEnvelope(
        [property: JsonPropertyName("AuthenticationEnvelope")] AuthEnvelope AuthenticationEnvelope,
        [property: JsonPropertyName("Request")] TokenRequest Request);

    private sealed class AuthEnvelope
    {
        [JsonPropertyName("Data")] public string Data { get; set; } = string.Empty;
        [JsonPropertyName("Iv")] public string Iv { get; set; } = string.Empty;
    }

    private sealed class TokenRequest
    {
        [JsonPropertyName("AcceptorId")] public string AcceptorId { get; set; } = string.Empty;
        [JsonPropertyName("amount")] public long Amount { get; set; }
        [JsonPropertyName("BillInfo")] public object? BillInfo { get; set; }
        [JsonPropertyName("CmsPreservationId")] public string? CmsPreservationId { get; set; }
        [JsonPropertyName("multiplexParameters")] public object? MultiplexParameters { get; set; }
        [JsonPropertyName("PaymentId")] public string PaymentId { get; set; } = string.Empty;
        [JsonPropertyName("RequestId")] public string RequestId { get; set; } = string.Empty;
        [JsonPropertyName("RequestTimestamp")] public long RequestTimestamp { get; set; }
        [JsonPropertyName("RevertUri")] public string RevertUri { get; set; } = string.Empty;
        [JsonPropertyName("terminalId")] public string TerminalId { get; set; } = string.Empty;
        [JsonPropertyName("transactionType")] public string TransactionType { get; set; } = "Purchase";
        [JsonPropertyName("additionalParameters")] public List<KeyValuePair<string, string>>? AdditionalParameters { get; set; }
    }

    private sealed class TokenResponse
    {
        [JsonPropertyName("responseCode")] public string? ResponseCode { get; set; }
        [JsonPropertyName("description")] public JsonElement Description { get; set; }
        [JsonPropertyName("status")] public bool Status { get; set; }
        [JsonPropertyName("result")] public TokenResult? Result { get; set; }
    }

    private sealed class TokenResult
    {
        [JsonPropertyName("token")] public string? Token { get; set; }
    }

    private sealed record VerifyRequest(
        [property: JsonPropertyName("terminalId")] string TerminalId,
        [property: JsonPropertyName("retrievalReferenceNumber")] string RetrievalReferenceNumber,
        [property: JsonPropertyName("systemTraceAuditNumber")] string SystemTraceAuditNumber,
        [property: JsonPropertyName("tokenIdentity")] string TokenIdentity);

    private sealed class VerifyResponse
    {
        [JsonPropertyName("responseCode")] public string? ResponseCode { get; set; }
        [JsonPropertyName("description")] public string? Description { get; set; }
        [JsonPropertyName("status")] public bool Status { get; set; }
        [JsonPropertyName("result")] public VerifyResult? Result { get; set; }
    }

    private sealed class VerifyResult
    {
        [JsonPropertyName("amount")] public string? Amount { get; set; }
    }

    public async Task<PaymentInitResult> InitAsync(long amountRials, string paymentId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_o.TerminalId) || string.IsNullOrWhiteSpace(_o.PassPhrase) ||
            string.IsNullOrWhiteSpace(_o.RsaPublicKey))
        {
            return new PaymentInitResult(false, null, null, "درگاه پرداخت پیکربندی نشده است.");
        }

        var request = new TokenRequest
        {
            AcceptorId = _o.AcceptorId,
            Amount = amountRials,
            CmsPreservationId = string.IsNullOrWhiteSpace(_o.CmsPreservationId) ? null : _o.CmsPreservationId,
            PaymentId = paymentId,
            // Same convention the legacy merchant used: RequestId = "10" + PaymentId.
            RequestId = "10" + paymentId,
            RequestTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            RevertUri = _o.CallbackUrl,
            TerminalId = _o.TerminalId,
            AdditionalParameters = [new KeyValuePair<string, string>("nationalId", "")]
        };

        var payload = new TokenRequestEnvelope(BuildEnvelope(amountRials), request);

        try
        {
            using var http = httpClientFactory.CreateClient(nameof(IranKishGateway));
            using var response = await http.PostAsJsonAsync(_o.TokenUrl, payload, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            var parsed = JsonSerializer.Deserialize<TokenResponse>(body);
            if (parsed is not { Status: true } || string.IsNullOrWhiteSpace(parsed.Result?.Token))
            {
                logger.LogWarning("IranKish token refused for {PaymentId}: {Body}", paymentId, body);
                return new PaymentInitResult(false, null, null,
                    $"درگاه پرداخت درخواست را نپذیرفت (کد {parsed?.ResponseCode ?? "?"}).");
            }

            var token = parsed.Result.Token!;
            return new PaymentInitResult(true, token, $"{_o.PaymentPageUrl.TrimEnd('/')}/{token}", null);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "IranKish token request failed for {PaymentId}", paymentId);
            return new PaymentInitResult(false, null, null, "ارتباط با درگاه پرداخت برقرار نشد.");
        }
    }

    public async Task<PaymentVerifyResult> VerifyAsync(
        string retrievalReferenceNumber, string systemTraceAuditNumber, string token, CancellationToken ct = default)
    {
        try
        {
            using var http = httpClientFactory.CreateClient(nameof(IranKishGateway));
            using var response = await http.PostAsJsonAsync(_o.VerifyUrl,
                new VerifyRequest(_o.TerminalId, retrievalReferenceNumber, systemTraceAuditNumber, token), ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            var parsed = JsonSerializer.Deserialize<VerifyResponse>(body);
            if (parsed is not { Status: true })
            {
                logger.LogWarning("IranKish verify refused (rrn {Rrn}): {Body}", retrievalReferenceNumber, body);
                return new PaymentVerifyResult(false, null, parsed?.Description);
            }

            return new PaymentVerifyResult(true, parsed.Result?.Amount, parsed.Description);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "IranKish verify failed (rrn {Rrn})", retrievalReferenceNumber);
            return new PaymentVerifyResult(false, null, "ارتباط با درگاه پرداخت برقرار نشد.");
        }
    }

    /// <summary>
    /// The authentication envelope, byte-for-byte the legacy algorithm:
    /// hex(terminalId + passPhrase + amount.PadLeft(12,'0') + "00") → AES-128-CBC with a fresh
    /// key/iv → SHA-256 of the ciphertext → RSA-PKCS1(key ‖ hash) as hex Data, iv as hex Iv.
    /// </summary>
    private AuthEnvelope BuildEnvelope(long amountRials)
    {
        var baseHex = _o.TerminalId + _o.PassPhrase + amountRials.ToString().PadLeft(12, '0') + "00";
        var baseBytes = Convert.FromHexString(baseHex);

        using var aes = Aes.Create();
        aes.KeySize = 128;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;
        aes.GenerateKey();
        aes.GenerateIV();

        var encrypted = aes.EncryptCbc(baseBytes, aes.IV, PaddingMode.PKCS7);
        var hash = SHA256.HashData(encrypted);

        var keyAndHash = new byte[aes.Key.Length + hash.Length];
        aes.Key.CopyTo(keyAndHash, 0);
        hash.CopyTo(keyAndHash, aes.Key.Length);

        using var rsa = RSA.Create();
        rsa.ImportFromPem(_o.RsaPublicKey);
        var data = rsa.Encrypt(keyAndHash, RSAEncryptionPadding.Pkcs1);

        return new AuthEnvelope
        {
            Data = Convert.ToHexString(data),
            Iv = Convert.ToHexString(aes.IV)
        };
    }
}
