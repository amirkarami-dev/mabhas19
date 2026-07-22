using Mabhas19.Application.Common.Interfaces;
using Mabhas19.Application.Common.Security;
using Mabhas19.Domain.Constants;
using Mabhas19.Domain.Walfare;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ValidationException = Mabhas19.Application.Common.Exceptions.ValidationException;

namespace Mabhas19.Application.Walfare.Payments;

file static class Fail
{
    public static ValidationException With(string property, string message) =>
        new([new FluentValidation.Results.ValidationFailure(property, message)]);
}

/// <summary>What the SPA needs to push the payer into the gateway.</summary>
public sealed record PaymentRedirectDto(int TransactionId, string RedirectUrl);

// ── engineer: pay for a reservation ─────────────────────────────────────────

[Authorize]
public record InitPoolPaymentCommand(int ReservationId) : IRequest<PaymentRedirectDto>;

public class InitPoolPaymentCommandHandler(
    IApplicationDbContext context,
    IPaymentGateway gateway,
    IUser user) : IRequestHandler<InitPoolPaymentCommand, PaymentRedirectDto>
{
    public const string TargetType = "pool-reservation";

    public async Task<PaymentRedirectDto> Handle(InitPoolPaymentCommand request, CancellationToken cancellationToken)
    {
        var userId = user.Id ?? string.Empty;

        var reservation = await context.WelfarePoolReservations
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId && r.UserId == userId, cancellationToken)
            ?? throw Fail.With("ReservationId", "رزرو موردنظر یافت نشد.");

        if (reservation.Status == ReservationStatus.Paid)
            throw Fail.With("ReservationId", "این رزرو قبلاً پرداخت شده است.");
        if (reservation.Status == ReservationStatus.Cancelled)
            throw Fail.With("ReservationId", "این رزرو لغو شده است.");

        // One ledger row per attempt. A fresh row (and PaymentId) per click keeps the gateway's
        // "duplicate request id" rule happy after an abandoned attempt.
        var tx = new PaymentTransaction
        {
            Gateway = PaymentGateway.IranKish,
            AmountRials = reservation.AmountRials,
            PaymentId = string.Empty,
            Status = PaymentStatus.Initiated,
            TargetType = TargetType,
            TargetId = reservation.Id,
            UserId = userId,
            PayerName = reservation.FullName,
            PayerNationalCode = reservation.NationalCode
        };
        context.PaymentTransactions.Add(tx);
        await context.SaveChangesAsync(cancellationToken); // materialise tx.Id

        // PaymentId must be unique at the gateway; the row id is exactly that.
        tx.PaymentId = tx.Id.ToString();
        var init = await gateway.InitAsync(tx.AmountRials, tx.PaymentId, cancellationToken);

        if (!init.Success || init.RedirectUrl is null)
        {
            tx.Status = PaymentStatus.Failed;
            tx.Description = init.Error;
            await context.SaveChangesAsync(cancellationToken);
            throw Fail.With("ReservationId", init.Error ?? "اتصال به درگاه پرداخت ناموفق بود.");
        }

        tx.Token = init.Token;
        reservation.PaymentTransactionId = tx.Id;
        await context.SaveChangesAsync(cancellationToken);

        return new PaymentRedirectDto(tx.Id, init.RedirectUrl);
    }
}

// ── bank callback (anonymous form POST from Iran Kish) ──────────────────────

/// <summary>
/// Handles the browser's return from the gateway. Returns the FRONT URL to 302 the payer to —
/// nothing here trusts the posted fields alone: success is only recorded after server-to-server
/// verification, and the transaction is located by our own PaymentId + token pair.
/// </summary>
public record HandleIrkCallbackCommand(
    string? ResponseCode,
    string? Token,
    string? PaymentId,
    string? RetrievalReferenceNumber,
    string? SystemTraceAuditNumber,
    string? MaskedPan,
    string? Amount) : IRequest<string>;

public class HandleIrkCallbackCommandHandler(
    IApplicationDbContext context,
    IPaymentGateway gateway,
    IConfiguration configuration,
    ILogger<HandleIrkCallbackCommandHandler> logger) : IRequestHandler<HandleIrkCallbackCommand, string>
{
    public async Task<string> Handle(HandleIrkCallbackCommand request, CancellationToken cancellationToken)
    {
        var front = (configuration["Walfare:FrontBaseUrl"] ?? "https://refahi.kurdnezam.ir").TrimEnd('/');
        string Result(string status, string? tracking = null) =>
            $"{front}/pay/result?status={status}" +
            (tracking is null ? string.Empty : $"&tracking={Uri.EscapeDataString(tracking)}");

        var tx = await context.PaymentTransactions.FirstOrDefaultAsync(
            t => t.PaymentId == request.PaymentId && t.Token == request.Token, cancellationToken);
        if (tx is null)
        {
            logger.LogWarning("IranKish callback for unknown payment {PaymentId}", request.PaymentId);
            return Result("notfound");
        }

        // The gateway can retry the callback; a decided transaction stays decided.
        if (tx.Status == PaymentStatus.Succeeded)
            return Result("ok", tx.SystemTraceAuditNumber);

        tx.ResponseCode = request.ResponseCode;
        tx.MaskedPan = request.MaskedPan;

        if (request.ResponseCode?.Trim() != "0")
        {
            tx.Status = PaymentStatus.Failed;
            tx.Description = $"بانک پرداخت را نپذیرفت (کد {request.ResponseCode}).";
            await context.SaveChangesAsync(cancellationToken);
            return Result("failed");
        }

        var verify = await gateway.VerifyAsync(
            request.RetrievalReferenceNumber ?? string.Empty,
            request.SystemTraceAuditNumber ?? string.Empty,
            request.Token ?? string.Empty,
            cancellationToken);

        if (!verify.Success)
        {
            tx.Status = PaymentStatus.Failed;
            tx.Description = verify.Description ?? "تأیید پرداخت ناموفق بود.";
            await context.SaveChangesAsync(cancellationToken);
            return Result("failed");
        }

        tx.Status = PaymentStatus.Succeeded;
        tx.RetrievalReferenceNumber = request.RetrievalReferenceNumber;
        tx.SystemTraceAuditNumber = request.SystemTraceAuditNumber;
        tx.Description = verify.Description;
        tx.VerifiedAt = DateTimeOffset.UtcNow;

        if (tx.TargetType == InitPoolPaymentCommandHandler.TargetType)
        {
            var reservation = await context.WelfarePoolReservations
                .FirstOrDefaultAsync(r => r.Id == tx.TargetId, cancellationToken);
            if (reservation is not null)
            {
                reservation.Status = ReservationStatus.Paid;
                reservation.PaymentTransactionId = tx.Id;
                // کد رهگیری = the bank's trace number, exactly what the spec asks to store.
                reservation.TrackingCode = request.SystemTraceAuditNumber;
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        return Result("ok", request.SystemTraceAuditNumber);
    }
}

// ── admin: the payment ledger ────────────────────────────────────────────────

[Authorize(Roles = Roles.Administrator)]
public record GetPaymentsAdminQuery(
    PaymentStatus? Status = null,
    string? Q = null,
    int Page = 1,
    int PageSize = 20) : IRequest<WalfarePagedResult<PaymentTransactionDto>>;

public class GetPaymentsAdminQueryHandler(IApplicationDbContext context)
    : IRequestHandler<GetPaymentsAdminQuery, WalfarePagedResult<PaymentTransactionDto>>
{
    public async Task<WalfarePagedResult<PaymentTransactionDto>> Handle(
        GetPaymentsAdminQuery request, CancellationToken cancellationToken)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var query = context.PaymentTransactions.AsNoTracking().AsQueryable();

        if (request.Status is { } status) query = query.Where(t => t.Status == status);
        if (!string.IsNullOrWhiteSpace(request.Q))
        {
            var term = request.Q.Trim();
            query = query.Where(t =>
                t.PayerName.Contains(term) || t.PayerNationalCode.Contains(term) ||
                t.PaymentId.Contains(term) ||
                (t.SystemTraceAuditNumber != null && t.SystemTraceAuditNumber.Contains(term)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(t => t.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new PaymentTransactionDto
            {
                Id = t.Id,
                Gateway = t.Gateway,
                AmountRials = t.AmountRials,
                PaymentId = t.PaymentId,
                Status = t.Status,
                TargetType = t.TargetType,
                TargetId = t.TargetId,
                PayerName = t.PayerName,
                PayerNationalCode = t.PayerNationalCode,
                MaskedPan = t.MaskedPan,
                RetrievalReferenceNumber = t.RetrievalReferenceNumber,
                SystemTraceAuditNumber = t.SystemTraceAuditNumber,
                Description = t.Description,
                Created = t.Created,
                VerifiedAt = t.VerifiedAt
            })
            .ToListAsync(cancellationToken);

        return new WalfarePagedResult<PaymentTransactionDto>
        {
            Items = items, Total = total, Page = page, PageSize = pageSize
        };
    }
}
