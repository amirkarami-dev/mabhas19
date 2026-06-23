using Mabhas19.Application.Analytics.SemanticModels;
using Mabhas19.Application.Common.Interfaces.Analytics;

namespace Mabhas19.Infrastructure.Analytics.Sql;

/// <summary>
/// Semantic model store for the FarsNezam external database.
/// Exposes three curated models backed by real SQL Server tables.
/// Each field <c>Id</c> equals the SQL column name — no Column override needed,
/// because the whitelist builder uses <c>ResolvedColumn</c> to bracket-quote the identifier.
/// </summary>
internal sealed class FarsNezamSemanticModelStore : ISemanticModelStore
{
    // ── Source key → real table name map (used by SqlQueryEngine) ────────────
    internal static readonly IReadOnlyDictionary<string, string> SourceToTable =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["projects"]      = "tblProject",
            ["members"]       = "tblAzayeSazmanMain",
            ["legal_projects"] = "tblHoghoghiProjectList",
        };

    private static readonly IReadOnlyList<SemanticModelDto> Catalogue = BuildCatalogue();

    public Task<IReadOnlyList<SemanticModelDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => Task.FromResult(Catalogue);

    public Task<SemanticModelDto?> GetByIdAsync(string modelKey, CancellationToken cancellationToken = default)
    {
        var model = Catalogue.FirstOrDefault(m =>
            string.Equals(m.ModelKey, modelKey, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(model);
    }

    public Task<SemanticModelDto?> GetBySourceAsync(string source, CancellationToken cancellationToken = default)
    {
        var model = Catalogue.FirstOrDefault(m =>
            string.Equals(m.Source, source, StringComparison.OrdinalIgnoreCase));
        return Task.FromResult(model);
    }

    // ── Catalogue ─────────────────────────────────────────────────────────────

    private static IReadOnlyList<SemanticModelDto> BuildCatalogue() =>
    [
        // ── Entity: projects → tblProject (171 068 rows) ─────────────────────
        new SemanticModelDto
        {
            ModelKey    = "model-projects",
            Name        = "پروژه‌ها",
            Description = "پروژه‌های ثبت‌شده در سامانه فارس‌نظام (tblProject)",
            Source      = "projects",
            Fields      =
            [
                // Dimensions
                new SemanticFieldDto { Id = "ProjectNo", Name = "شماره پرونده", Type = "string", Role = "dimension" },
                new SemanticFieldDto { Id = "karfarma",  Name = "کارفرما",       Type = "string", Role = "dimension" },
                new SemanticFieldDto { Id = "Mantaghe",  Name = "منطقه",         Type = "number", Role = "dimension" },
                new SemanticFieldDto { Id = "Daftar",    Name = "دفتر",          Type = "number", Role = "dimension" },
                new SemanticFieldDto { Id = "Skelet",    Name = "اسکلت",         Type = "number", Role = "dimension" },
                new SemanticFieldDto { Id = "TypeProject", Name = "نوع پروژه",  Type = "string", Role = "dimension" },
                new SemanticFieldDto { Id = "type",      Name = "نوع",           Type = "number", Role = "dimension" },
                new SemanticFieldDto { Id = "Tarikh",    Name = "تاریخ",         Type = "string", Role = "dimension" },
                // Measures
                new SemanticFieldDto { Id = "TedadVahed", Name = "تعداد واحد",  Type = "number", Role = "measure" },
                new SemanticFieldDto { Id = "TedadSaghf", Name = "تعداد سقف",  Type = "number", Role = "measure" },
                new SemanticFieldDto { Id = "Zirbana",    Name = "زیربنا",       Type = "number", Role = "measure" },
                new SemanticFieldDto { Id = "masahat",    Name = "مساحت",        Type = "number", Role = "measure" },
            ],
        },

        // ── Entity: members → tblAzayeSazmanMain (42 570 rows) ───────────────
        new SemanticModelDto
        {
            ModelKey    = "model-members",
            Name        = "اعضا",
            Description = "اعضای سازمان نظام مهندسی فارس (tblAzayeSazmanMain)",
            Source      = "members",
            Fields      =
            [
                // Dimensions
                new SemanticFieldDto { Id = "OzveyatID",       Name = "شناسه عضویت",      Type = "number", Role = "dimension" },
                new SemanticFieldDto { Id = "Nam",             Name = "نام",               Type = "string", Role = "dimension" },
                new SemanticFieldDto { Id = "NameKhanevadegi", Name = "نام خانوادگی",      Type = "string", Role = "dimension" },
                new SemanticFieldDto { Id = "ShobeID",         Name = "شعبه",              Type = "number", Role = "dimension" },
                new SemanticFieldDto { Id = "ReshteID",        Name = "رشته",              Type = "string", Role = "dimension" },
                new SemanticFieldDto { Id = "Vazeyat",         Name = "وضعیت",             Type = "number", Role = "dimension" },
                new SemanticFieldDto { Id = "Jenseyat",        Name = "جنسیت",             Type = "string", Role = "dimension" },
                new SemanticFieldDto { Id = "MadrakID",        Name = "مدرک",              Type = "number", Role = "dimension" },
                new SemanticFieldDto { Id = "Tarikh",          Name = "تاریخ",             Type = "string", Role = "dimension" },
                // No numeric measure → count(*) is used for aggregation
            ],
        },

        // ── Entity: legal_projects → tblHoghoghiProjectList (864 930 rows) ──
        new SemanticModelDto
        {
            ModelKey    = "model-legal-projects",
            Name        = "پروژه‌های حقوقی",
            Description = "لیست پروژه‌های حقوقی فارس‌نظام (tblHoghoghiProjectList)",
            Source      = "legal_projects",
            Fields      =
            [
                // Dimensions
                new SemanticFieldDto { Id = "Id",         Name = "شناسه",        Type = "number", Role = "dimension" },
                new SemanticFieldDto { Id = "ProjectNo",  Name = "شماره پرونده", Type = "string", Role = "dimension" },
                new SemanticFieldDto { Id = "DaftarNo",   Name = "شماره دفتر",   Type = "number", Role = "dimension" },
                // Typ is an engineer/service-role code; LEFT JOIN tblMap_TypMohandes to show the title.
                new SemanticFieldDto { Id = "Typ",        Name = "نوع خدمت",     Type = "string", Role = "dimension",
                    LookupTable = "tblMap_TypMohandes", LookupKeyColumn = "Id", LookupNameColumn = "Onvan" },
                new SemanticFieldDto { Id = "GroupBuild", Name = "گروه ساختمان", Type = "number", Role = "dimension" },
                new SemanticFieldDto { Id = "FYear",      Name = "سال",          Type = "number", Role = "dimension" },
                new SemanticFieldDto { Id = "Active",     Name = "فعال",         Type = "string", Role = "dimension" },
                // Measures
                new SemanticFieldDto { Id = "FullMeter",  Name = "متراژ کل",    Type = "number", Role = "measure" },
                new SemanticFieldDto { Id = "OffMeter",   Name = "متراژ آفیس",  Type = "number", Role = "measure" },
            ],
        },
    ];
}
