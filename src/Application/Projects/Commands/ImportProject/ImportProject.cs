using Mabhas19.Application.Common.Interfaces;
using Mabhas19.Application.Common.Security;
using Mabhas19.Domain.Entities;
using Mabhas19.Domain.Enums;
using ValidationException = Mabhas19.Application.Common.Exceptions.ValidationException;

namespace Mabhas19.Application.Projects.Commands.ImportProject;

[Authorize]
public record ImportProjectCommand : IRequest<int>
{
    /// <summary>External system to import from, e.g. "NezamMohandesi".</summary>
    public string Source { get; init; } = nameof(ProjectSource.NezamMohandesi);

    public string ExternalId { get; init; } = string.Empty;
}

public class ImportProjectCommandHandler : IRequestHandler<ImportProjectCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly IUser _user;
    private readonly ISubscriptionService _subscriptions;
    private readonly IEnumerable<IExternalProjectProvider> _providers;

    public ImportProjectCommandHandler(
        IApplicationDbContext context,
        IUser user,
        ISubscriptionService subscriptions,
        IEnumerable<IExternalProjectProvider> providers)
    {
        _context = context;
        _user = user;
        _subscriptions = subscriptions;
        _providers = providers;
    }

    public async Task<int> Handle(ImportProjectCommand request, CancellationToken cancellationToken)
    {
        var userId = _user.Id!;
        await _subscriptions.EnsureCanCreateProjectAsync(userId, cancellationToken);

        if (!Enum.TryParse<ProjectSource>(request.Source, ignoreCase: true, out var source))
        {
            var ex = new ValidationException();
            ex.Errors["Source"] = new[] { $"Unknown import source '{request.Source}'." };
            throw ex;
        }

        var provider = _providers.FirstOrDefault(p => p.Source == source)
            ?? throw new ValidationExceptionFor("Source", $"No import provider registered for '{request.Source}'.");

        var data = await provider.FetchAsync(request.ExternalId, cancellationToken);
        if (data is null)
        {
            throw new ValidationExceptionFor("ExternalId", $"No record found for id '{request.ExternalId}'.");
        }

        var climateCode = !string.IsNullOrWhiteSpace(data.ClimateCode)
            ? data.ClimateCode!
            : Domain.Services.ClimateData.GetCityClimate(data.City ?? string.Empty);

        var entity = new Project
        {
            Title = string.IsNullOrWhiteSpace(data.Title) ? $"پروژه وارد شده {request.ExternalId}" : data.Title!,
            Client = data.Client,
            Address = data.Address,
            City = data.City ?? string.Empty,
            ClimateCode = climateCode,
            TotalArea = data.TotalArea,
            FloorCount = data.FloorCount,
            UnitCount = data.UnitCount,
            Usage = data.Usage,
            Deed = data.Deed,
            Parcel = data.Parcel,
            SystemId = data.SystemId,
            OwnerId = userId,
            Source = source,
            ExternalId = request.ExternalId
        };

        _context.Projects.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}

/// <summary>Small helper to throw a single-field validation error.</summary>
internal sealed class ValidationExceptionFor : ValidationException
{
    public ValidationExceptionFor(string field, string message)
    {
        Errors[field] = new[] { message };
    }
}
