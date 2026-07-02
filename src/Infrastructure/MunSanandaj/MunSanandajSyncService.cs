using Mabhas19.Application.Common.Interfaces;
using Mabhas19.Application.Common.Interfaces.MunSanandaj;
using Mabhas19.Domain.MunSanandaj;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Mabhas19.Infrastructure.MunSanandaj;

internal sealed class MunSanandajSyncService : IMunSanandajSyncService
{
    private readonly IApplicationDbContext _context;
    private readonly IMunSanandajSourceReader _reader;
    private readonly IMunSanandajGatewayClient _gateway;
    private readonly IMunSanandajPdfFetcher _pdfFetcher;
    private readonly ILogger<MunSanandajSyncService> _logger;

    public MunSanandajSyncService(
        IApplicationDbContext context,
        IMunSanandajSourceReader reader,
        IMunSanandajGatewayClient gateway,
        IMunSanandajPdfFetcher pdfFetcher,
        ILogger<MunSanandajSyncService> logger)
    {
        _context = context;
        _reader = reader;
        _gateway = gateway;
        _pdfFetcher = pdfFetcher;
        _logger = logger;
    }

    public Task<Guid> RunSaveEngineerReportAsync(MunRunTrigger trigger, string? triggeredByUser, CancellationToken ct = default)
        => RunAsync(MunWorkerType.SaveEngineerReport, trigger, triggeredByUser, ProcessSaveEngineerReportRowAsync, ct);

    public Task<Guid> RunSaveEngMapAsync(MunRunTrigger trigger, string? triggeredByUser, CancellationToken ct = default)
        => RunAsync(MunWorkerType.SaveEngMap, trigger, triggeredByUser, ProcessSaveEngMapRowAsync, ct);

    private async Task<Guid> RunAsync(
        MunWorkerType workerType,
        MunRunTrigger trigger,
        string? triggeredByUser,
        Func<MunSourceRowDto, int, CancellationToken, Task<RowResult>> processRow,
        CancellationToken ct)
    {
        var run = new MunSyncRun
        {
            RunId = Guid.NewGuid(),
            WorkerType = workerType,
            StartedAt = DateTimeOffset.UtcNow,
            Status = MunRunStatus.Running,
            TriggeredBy = trigger,
            TriggeredByUser = triggeredByUser,
        };
        _context.MunSyncRuns.Add(run);
        await _context.SaveChangesAsync(ct);

        try
        {
            var rows = await _reader.GetPendingReportsAsync(ct);
            run.TotalRows = rows.Count;

            foreach (var row in rows)
            {
                var latestAttempt = await _context.MunReportLogs
                    .Where(l => l.WorkerType == workerType && l.Peygiri == row.Peygiri)
                    .OrderByDescending(l => l.Id)
                    .FirstOrDefaultAsync(ct);

                if (latestAttempt?.Status == MunLogStatus.Success)
                {
                    run.SuccessCount++;
                    continue;
                }

                var attemptNumber = (latestAttempt?.AttemptNumber ?? 0) + 1;
                var startedAt = DateTimeOffset.UtcNow;
                var result = await processRow(row, attemptNumber, ct);

                _context.MunReportLogs.Add(new MunReportLog
                {
                    RunId = run.Id,
                    WorkerType = workerType,
                    Peygiri = row.Peygiri,
                    ProjectNo = row.ProjectNo,
                    ReqId = row.ReqId,
                    Nosazi = row.Nosazi,
                    Status = result.Status,
                    AttemptNumber = attemptNumber,
                    RemoteSubmissionId = result.RemoteSubmissionId,
                    ResponseBody = result.RawResponse,
                    ErrorMessage = result.ErrorMessage,
                    CreatedEngineerCodes = result.CreatedEngineerCodes,
                    StartedAt = startedAt,
                    CompletedAt = DateTimeOffset.UtcNow,
                });

                if (result.Status == MunLogStatus.Success) run.SuccessCount++;
                else run.FailedCount++;

                await _context.SaveChangesAsync(ct);
            }

            run.Status = MunRunStatus.Completed;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MunSanandaj {WorkerType} run {RunId} failed", workerType, run.RunId);
            run.Status = MunRunStatus.Failed;
        }
        finally
        {
            run.CompletedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync(ct);
        }

        return run.RunId;
    }

    /// <summary>Internal (not private) so unit tests can exercise the addEngineer-then-retry
    /// control flow directly, without a database.</summary>
    internal async Task<RowResult> ProcessSaveEngineerReportRowAsync(MunSourceRowDto row, int attemptNumber, CancellationToken ct)
    {
        var pdfBase64 = await _pdfFetcher.FetchAsBase64Async(row.ProjectNo, ct);
        if (pdfBase64 is null)
            return RowResult.Failed(attemptNumber, "pdf not found");

        var result = await _gateway.SaveEngineerReportAsync(row.ProjectNo, row.ReqId, pdfBase64, ct);
        return result.Success
            ? RowResult.Succeeded(attemptNumber, result.RemoteSubmissionId, result.RawResponse)
            : RowResult.Failed(attemptNumber, result.ErrorMessage, result.RawResponse);
    }

    internal async Task<RowResult> ProcessSaveEngMapRowAsync(MunSourceRowDto row, int attemptNumber, CancellationToken ct)
    {
        var engineerInfos = await _reader.GetEngineersAsync(row.Peygiri, ct);
        if (engineerInfos.Count == 0)
            return RowResult.Failed(attemptNumber, "no engineers found for Peygiri");

        var pdfBase64 = await _pdfFetcher.FetchAsBase64Async(row.ProjectNo, ct);
        if (pdfBase64 is null)
            return RowResult.Failed(attemptNumber, "pdf not found");

        var engineersByCode = engineerInfos.ToDictionary(e => e.NationalId);
        var engMapEngineers = engineerInfos.Select(MunFieldMapper.ToEngMapEngineer).ToList();

        var result = await _gateway.SaveEngMapAsync(row.ProjectNo, engMapEngineers, pdfBase64, ct);
        if (result.Success)
            return RowResult.Succeeded(attemptNumber, result.RemoteSubmissionId, result.RawResponse);

        if (result.FailedEngineerMessages is { Count: > 0 } failed)
        {
            var createdCodes = new List<string>();
            foreach (var codeMeli in failed.Keys)
            {
                if (!engineersByCode.TryGetValue(codeMeli, out var engineerInfo)) continue;
                var addResult = await _gateway.AddEngineerAsync(engineerInfo, ct);
                if (addResult.Success) createdCodes.Add(codeMeli);
            }

            if (createdCodes.Count > 0)
            {
                var retryResult = await _gateway.SaveEngMapAsync(row.ProjectNo, engMapEngineers, pdfBase64, ct);
                return retryResult.Success
                    ? RowResult.Succeeded(attemptNumber, retryResult.RemoteSubmissionId, retryResult.RawResponse, string.Join(",", createdCodes))
                    : RowResult.Failed(attemptNumber, retryResult.ErrorMessage, retryResult.RawResponse, string.Join(",", createdCodes));
            }
        }

        return RowResult.Failed(attemptNumber, result.ErrorMessage, result.RawResponse);
    }

    /// <summary>Deconstructable result of processing one source row — kept as a nominal type
    /// (rather than a long value-tuple) so the two processors and their tests stay readable.</summary>
    internal readonly record struct RowResult(
        MunLogStatus Status,
        int AttemptNumber,
        string? RemoteSubmissionId,
        string RawResponse,
        string? ErrorMessage,
        string? CreatedEngineerCodes)
    {
        public static RowResult Succeeded(int attemptNumber, string? remoteSubmissionId, string rawResponse, string? createdEngineerCodes = null) =>
            new(MunLogStatus.Success, attemptNumber, remoteSubmissionId, rawResponse, null, createdEngineerCodes);

        public static RowResult Failed(int attemptNumber, string? errorMessage, string rawResponse = "", string? createdEngineerCodes = null) =>
            new(MunLogStatus.Failed, attemptNumber, null, rawResponse, errorMessage, createdEngineerCodes);

        // No hand-written Deconstruct: a positional record struct already auto-generates one
        // matching the primary constructor's parameter list — adding another here would collide.
    }
}
