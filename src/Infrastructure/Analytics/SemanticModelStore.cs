using Mabhas19.Application.Analytics.SemanticModels;
using Mabhas19.Application.Common.Interfaces.Analytics;

namespace Mabhas19.Infrastructure.Analytics;

/// <summary>
/// Stub semantic model store.
/// TODO(v2): load <see cref="SemanticModelDto"/> records from the database or a YAML catalogue file.
/// </summary>
internal sealed class SemanticModelStore : ISemanticModelStore
{
    public Task<IReadOnlyList<SemanticModelDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => throw new NotImplementedException("v2");
}
