using Mabhas19.Domain.Enums;

namespace Mabhas19.Domain.Entities;

/// <summary>
/// A user's subscription, which caps how many projects they may own.
/// Every registered user gets a Free plan with 5 projects by default.
/// </summary>
public class Subscription : BaseAuditableEntity
{
    public const int DefaultMaxProjects = 5;

    public required string UserId { get; set; }

    public SubscriptionPlan Plan { get; set; } = SubscriptionPlan.Free;

    public int MaxProjects { get; set; } = DefaultMaxProjects;

    public DateTimeOffset? ValidFrom { get; set; }

    public DateTimeOffset? ValidTo { get; set; }

    public bool IsActive { get; set; } = true;
}
