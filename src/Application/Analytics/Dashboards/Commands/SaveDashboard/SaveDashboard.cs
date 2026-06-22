using System.Text.Json;
using System.Text.Json.Nodes;
using Mabhas19.Application.Common.Interfaces;
using Mabhas19.Application.Common.Interfaces.Analytics;
using Mabhas19.Application.Common.Security;
using Mabhas19.Domain.Analytics;

namespace Mabhas19.Application.Analytics.Dashboards.Commands.SaveDashboard;

[Authorize]
public record SaveDashboardCommand(
    string Name,
    JsonArray Widgets,
    JsonObject Layout) : IRequest<int>;

public class SaveDashboardCommandHandler : IRequestHandler<SaveDashboardCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly ITenantContext _tenant;
    private readonly IUser _user;

    public SaveDashboardCommandHandler(IApplicationDbContext context, ITenantContext tenant, IUser user)
    {
        _context = context;
        _tenant = tenant;
        _user = user;
    }

    public async Task<int> Handle(SaveDashboardCommand request, CancellationToken cancellationToken)
    {
        var dashboard = new Dashboard
        {
            TenantId    = _tenant.TenantId ?? "default",
            Name        = request.Name,
            WidgetsJson = request.Widgets.ToJsonString(),
            LayoutJson  = request.Layout.ToJsonString(),
            OwnerName   = _user.Id
        };

        _context.AnalyticsDashboards.Add(dashboard);
        await _context.SaveChangesAsync(cancellationToken);

        return dashboard.Id;
    }
}
