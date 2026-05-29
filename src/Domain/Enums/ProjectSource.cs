namespace Mabhas19.Domain.Enums;

/// <summary>Where a project originated from.</summary>
public enum ProjectSource
{
    Manual = 0,

    /// <summary>Imported from the Building Engineering System Organization (نظام مهندسی ساختمان).</summary>
    NezamMohandesi = 1,

    Other = 2
}
