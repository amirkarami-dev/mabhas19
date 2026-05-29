namespace Mabhas19.Application.Admin;

/// <summary>A user row for the admin management screen (identity + subscription + usage).</summary>
public record AdminUserDto
{
    public string Id { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string? PhoneNumber { get; init; }
    public bool IsAdmin { get; init; }
    public IReadOnlyList<string> Roles { get; init; } = Array.Empty<string>();
    public string Plan { get; init; } = "Free";
    public int MaxProjects { get; init; }
    public int UsedProjects { get; init; }
    public bool IsActive { get; init; }
    public DateTimeOffset? ValidTo { get; init; }
}

public record UpdateUserSubscriptionRequest
{
    public string Plan { get; init; } = "Free";
    public int MaxProjects { get; init; }
    public bool IsActive { get; init; } = true;
    public DateTimeOffset? ValidTo { get; init; }
}

public record SetUserRoleRequest
{
    public bool IsAdmin { get; init; }
}

public record CreateUserRequest
{
    public string Email { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public bool IsAdmin { get; init; }
}
