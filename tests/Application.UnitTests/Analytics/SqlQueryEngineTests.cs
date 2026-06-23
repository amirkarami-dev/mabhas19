using Mabhas19.Application.Analytics.Reports;
using Mabhas19.Infrastructure.Analytics.Sql;
using NUnit.Framework;
using Shouldly;

namespace Mabhas19.Application.UnitTests.Analytics;

/// <summary>
/// Unit tests for <see cref="SqlQueryEngine.BuildSql"/> (the pure SQL builder)
/// and <see cref="FarsNezamSemanticModelStore"/> catalogue.
/// No database or network calls — BuildSql is tested directly.
/// </summary>
[TestFixture]
public class SqlQueryEngineTests
{
    // =========================================================================
    // FarsNezamSemanticModelStore catalogue tests
    // =========================================================================

    [Test]
    public async Task SemanticModelStore_ReturnsThreeModels()
    {
        var store = new FarsNezamSemanticModelStore();
        var models = await store.GetAllAsync();

        models.Count.ShouldBe(3);
    }

    [Test]
    public async Task SemanticModelStore_EachModelHasNonEmptyFields()
    {
        var store = new FarsNezamSemanticModelStore();
        var models = await store.GetAllAsync();

        foreach (var model in models)
        {
            model.Fields.Count.ShouldBeGreaterThan(0,
                $"Model '{model.ModelKey}' should have at least one field");
        }
    }

    [Test]
    public async Task SemanticModelStore_ResolvesBySource_Projects()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");

        model.ShouldNotBeNull();
        model!.ModelKey.ShouldBe("model-projects");
        model.Fields.ShouldContain(f => f.Id == "ProjectNo");
        model.Fields.ShouldContain(f => f.Id == "Zirbana");
        model.Fields.ShouldContain(f => f.Id == "Mantaghe");
    }

    [Test]
    public async Task SemanticModelStore_ResolvesBySource_Members()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("members");

        model.ShouldNotBeNull();
        model!.ModelKey.ShouldBe("model-members");
        model.Fields.ShouldContain(f => f.Id == "OzveyatID");
        model.Fields.ShouldContain(f => f.Id == "ReshteID");
    }

    [Test]
    public async Task SemanticModelStore_ResolvesBySource_LegalProjects()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("legal_projects");

        model.ShouldNotBeNull();
        model!.ModelKey.ShouldBe("model-legal-projects");
        model.Fields.ShouldContain(f => f.Id == "FullMeter");
        model.Fields.ShouldContain(f => f.Id == "FYear");
    }

    [Test]
    public async Task SemanticModelStore_ResolvesByModelKey()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetByIdAsync("model-members");

        model.ShouldNotBeNull();
        model!.Source.ShouldBe("members");
    }

    // =========================================================================
    // BuildSql — count projects grouped by Mantaghe, top 10
    // =========================================================================

    [Test]
    public async Task BuildSql_CountByMantaghe_ContainsExpectedFragments()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "projects",
            GroupBy = [new ReportGroupByDto { Field = "Mantaghe" }],
            Metrics = [new ReportMetricDto { Field = "*", Aggregation = "count", Alias = "project_count" }],
            Sorting = [new ReportSortDto { Field = "project_count", Direction = "desc" }],
            Limit   = 10,
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblProject", out var parameters);

        // Asserts
        sql.ShouldContain("FROM [tblProject]");
        sql.ShouldContain("GROUP BY [Mantaghe]");
        sql.ShouldContain("COUNT(*)");
        sql.ShouldContain("project_count");

        // OFFSET/FETCH with parameters — no raw value interpolation
        sql.ShouldContain("OFFSET");
        sql.ShouldContain("FETCH NEXT");
        sql.ShouldContain("@limit");
        sql.ShouldContain("@offset");

        // Parameters must contain limit and offset
        parameters.ShouldContain(p => p.Name == "@limit" && (int)p.Value! == 10);
        parameters.ShouldContain(p => p.Name == "@offset" && (int)p.Value! == 0);

        // No raw "10" interpolated directly into the SQL (it should be a parameter reference)
        sql.ShouldNotContain(" 10 ");
    }

    // =========================================================================
    // BuildSql — filter Zirbana > 100 → parameterized @p0 with value 100
    // =========================================================================

    [Test]
    public async Task BuildSql_FilterZirbanaGt100_IsParameterized()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "projects",
            Filters = [new ReportFilterDto { Field = "Zirbana", Operator = "gt", Value = 100 }],
            Metrics = [new ReportMetricDto { Field = "*", Aggregation = "count" }],
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblProject", out var parameters);

        // WHERE clause should use @p0, not the literal 100
        sql.ShouldContain("WHERE");
        sql.ShouldContain("[Zirbana] > @p0");
        sql.ShouldNotContain("WHERE [Zirbana] > 100");

        // @p0 parameter must carry the value 100
        parameters.ShouldContain(p => p.Name == "@p0");
        var p0 = parameters.First(p => p.Name == "@p0");
        Convert.ToInt64(p0.Value).ShouldBe(100L);
    }

    // =========================================================================
    // BuildSql — unknown field → throws (whitelist)
    // =========================================================================

    [Test]
    public async Task BuildSql_UnknownField_ThrowsInvalidOperationException()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "projects",
            Filters = [new ReportFilterDto { Field = "DROP_TABLE", Operator = "eq", Value = "x" }],
        };

        Should.Throw<InvalidOperationException>(() =>
            SqlQueryEngine.BuildSql(def, model!, "tblProject", out _));
    }

    [Test]
    public async Task BuildSql_UnknownGroupByField_ThrowsInvalidOperationException()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "projects",
            GroupBy = [new ReportGroupByDto { Field = "NonExistentField" }],
            Metrics = [new ReportMetricDto { Field = "*", Aggregation = "count" }],
        };

        Should.Throw<InvalidOperationException>(() =>
            SqlQueryEngine.BuildSql(def, model!, "tblProject", out _));
    }

    [Test]
    public async Task BuildSql_UnknownMetricField_ThrowsInvalidOperationException()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "projects",
            Metrics = [new ReportMetricDto { Field = "InjectField", Aggregation = "sum" }],
        };

        Should.Throw<InvalidOperationException>(() =>
            SqlQueryEngine.BuildSql(def, model!, "tblProject", out _));
    }

    // =========================================================================
    // BuildSql — contains filter → LIKE %value% as parameter (not interpolated)
    // =========================================================================

    [Test]
    public async Task BuildSql_ContainsFilter_UsesLikeWithParameter()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "projects",
            Filters = [new ReportFilterDto { Field = "karfarma", Operator = "contains", Value = "شرکت" }],
            Metrics = [new ReportMetricDto { Field = "*", Aggregation = "count" }],
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblProject", out var parameters);

        sql.ShouldContain("[karfarma] LIKE @p0");
        // The % wrapping should be IN the parameter value, not in the SQL string
        sql.ShouldNotContain("%شرکت%");

        var p0 = parameters.First(p => p.Name == "@p0");
        p0.Value.ShouldBe("%شرکت%");
    }

    // =========================================================================
    // BuildSql — IN filter → multiple parameters
    // =========================================================================

    [Test]
    public async Task BuildSql_InFilter_GeneratesMultipleParameters()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "projects",
            Filters =
            [
                new ReportFilterDto
                {
                    Field    = "Mantaghe",
                    Operator = "in",
                    Value    = new List<object> { 1, 2, 3 },
                },
            ],
            Metrics = [new ReportMetricDto { Field = "*", Aggregation = "count" }],
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblProject", out var parameters);

        sql.ShouldContain("[Mantaghe] IN (@p0, @p1, @p2)");
        parameters.ShouldContain(p => p.Name == "@p0");
        parameters.ShouldContain(p => p.Name == "@p1");
        parameters.ShouldContain(p => p.Name == "@p2");
    }

    // =========================================================================
    // BuildSql — Jalali dateBucket (year) → LEFT(col, 4)
    // =========================================================================

    [Test]
    public async Task BuildSql_JalaliDateBucketYear_UsesLeft4()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "projects",
            GroupBy = [new ReportGroupByDto { Field = "Tarikh", DateBucket = "year" }],
            Metrics = [new ReportMetricDto { Field = "*", Aggregation = "count" }],
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblProject", out _);

        sql.ShouldContain("LEFT([Tarikh], 4)");
        sql.ShouldContain("GROUP BY LEFT([Tarikh], 4)");
    }

    [Test]
    public async Task BuildSql_JalaliDateBucketMonth_UsesLeft7()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "projects",
            GroupBy = [new ReportGroupByDto { Field = "Tarikh", DateBucket = "month" }],
            Metrics = [new ReportMetricDto { Field = "*", Aggregation = "count" }],
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblProject", out _);

        sql.ShouldContain("LEFT([Tarikh], 7)");
    }

    // =========================================================================
    // BuildSql — members entity → COUNT(*) (no measure fields)
    // =========================================================================

    [Test]
    public async Task BuildSql_Members_CountGroupedByShobeID()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("members");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "members",
            GroupBy = [new ReportGroupByDto { Field = "ShobeID" }],
            Metrics = [new ReportMetricDto { Field = "*", Aggregation = "count", Alias = "member_count" }],
            Limit   = 50,
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblAzayeSazmanMain", out var parameters);

        sql.ShouldContain("FROM [tblAzayeSazmanMain]");
        sql.ShouldContain("GROUP BY [ShobeID]");
        sql.ShouldContain("COUNT(*)");
        sql.ShouldContain("member_count");
        parameters.ShouldContain(p => p.Name == "@limit" && (int)p.Value! == 50);
    }

    // =========================================================================
    // BuildSql — legal_projects SUM(FullMeter) by FYear
    // =========================================================================

    [Test]
    public async Task BuildSql_LegalProjects_SumFullMeterByYear()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("legal_projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "legal_projects",
            GroupBy = [new ReportGroupByDto { Field = "FYear" }],
            Metrics = [new ReportMetricDto { Field = "FullMeter", Aggregation = "sum", Alias = "total_meter" }],
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblHoghoghiProjectList", out _);

        sql.ShouldContain("FROM [tblHoghoghiProjectList]");
        sql.ShouldContain("SUM([FullMeter])");
        sql.ShouldContain("total_meter");
        sql.ShouldContain("GROUP BY [FYear]");
    }

    // =========================================================================
    // BuildSql — between filter → two parameters
    // =========================================================================

    [Test]
    public async Task BuildSql_BetweenFilter_TwoParameters()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "projects",
            Filters =
            [
                new ReportFilterDto
                {
                    Field    = "TedadVahed",
                    Operator = "between",
                    Value    = 5,
                    Value2   = 20,
                },
            ],
            Metrics = [new ReportMetricDto { Field = "*", Aggregation = "count" }],
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblProject", out var parameters);

        sql.ShouldContain("[TedadVahed] BETWEEN @p0 AND @p1");
        parameters.ShouldContain(p => p.Name == "@p0");
        parameters.ShouldContain(p => p.Name == "@p1");
    }

    // =========================================================================
    // BuildSql — no raw user values in SQL string for eq filter
    // =========================================================================

    [Test]
    public async Task BuildSql_EqFilter_NoValueInterpolatedInSql()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("projects");
        model.ShouldNotBeNull();

        const string sensitiveValue = "'; DROP TABLE tblProject; --";

        var def = new ReportDefinitionDto
        {
            Dataset = "projects",
            Filters = [new ReportFilterDto { Field = "karfarma", Operator = "eq", Value = sensitiveValue }],
            Metrics = [new ReportMetricDto { Field = "*", Aggregation = "count" }],
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblProject", out var parameters);

        // The injection string must NOT appear in the SQL
        sql.ShouldNotContain(sensitiveValue);
        // It should be a parameter
        sql.ShouldContain("[karfarma] = @p0");
        parameters.First(p => p.Name == "@p0").Value.ShouldBe(sensitiveValue);
    }

    // =========================================================================
    // SourceToTable whitelist sanity
    // =========================================================================

    [Test]
    public void SourceToTable_ContainsThreeExpectedMappings()
    {
        FarsNezamSemanticModelStore.SourceToTable.Count.ShouldBe(3);
        FarsNezamSemanticModelStore.SourceToTable["projects"].ShouldBe("tblProject");
        FarsNezamSemanticModelStore.SourceToTable["members"].ShouldBe("tblAzayeSazmanMain");
        FarsNezamSemanticModelStore.SourceToTable["legal_projects"].ShouldBe("tblHoghoghiProjectList");
    }

    // =========================================================================
    // BuildSql — code → label lookup join (legal_projects.Typ → tblMap_TypMohandes)
    // =========================================================================

    [Test]
    public async Task SemanticModelStore_LegalProjectsTyp_HasLookupConfigured()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("legal_projects");

        var typ = model!.Fields.First(f => f.Id == "Typ");
        typ.HasLookup.ShouldBeTrue();
        typ.LookupTable.ShouldBe("tblMap_TypMohandes");
        typ.LookupKeyColumn.ShouldBe("Id");
        typ.LookupNameColumn.ShouldBe("Onvan");
    }

    [Test]
    public async Task BuildSql_GroupByLookupField_EmitsLeftJoinAndProjectsLabel()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("legal_projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "legal_projects",
            GroupBy = [new ReportGroupByDto { Field = "Typ" }],
            Metrics = [new ReportMetricDto { Field = "*", Aggregation = "count", Alias = "c" }],
            Sorting = [new ReportSortDto { Field = "c", Direction = "desc" }],
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblHoghoghiProjectList", out _);

        // LEFT JOIN the lookup keyed on the base-table code column
        sql.ShouldContain("LEFT JOIN [tblMap_TypMohandes] AS [lk_Typ] ON [tblHoghoghiProjectList].[Typ] = [lk_Typ].[Id]");
        // Project + group by the label column (not the raw code)
        sql.ShouldContain("[lk_Typ].[Onvan] AS [Typ]");
        sql.ShouldContain("GROUP BY [lk_Typ].[Onvan]");
        sql.ShouldContain("COUNT(*) AS [c]");
    }

    [Test]
    public async Task BuildSql_LookupJoin_QualifiesBaseTableMeasureColumn()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("legal_projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "legal_projects",
            GroupBy = [new ReportGroupByDto { Field = "Typ" }],
            Metrics = [new ReportMetricDto { Field = "FullMeter", Aggregation = "sum", Alias = "m" }],
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblHoghoghiProjectList", out _);

        // When a join is present, base-table columns are table-qualified to avoid ambiguity.
        sql.ShouldContain("SUM([tblHoghoghiProjectList].[FullMeter])");
        sql.ShouldContain("LEFT JOIN [tblMap_TypMohandes]");
    }

    [Test]
    public async Task BuildSql_NoLookupField_KeepsColumnsUnqualified()
    {
        var store = new FarsNezamSemanticModelStore();
        var model = await store.GetBySourceAsync("legal_projects");
        model.ShouldNotBeNull();

        var def = new ReportDefinitionDto
        {
            Dataset = "legal_projects",
            GroupBy = [new ReportGroupByDto { Field = "FYear" }],
            Metrics = [new ReportMetricDto { Field = "FullMeter", Aggregation = "sum", Alias = "m" }],
        };

        var sql = SqlQueryEngine.BuildSql(def, model!, "tblHoghoghiProjectList", out _);

        // No lookup in the def → no join, columns stay bare (existing behaviour preserved).
        sql.ShouldNotContain("LEFT JOIN");
        sql.ShouldContain("SUM([FullMeter])");
        sql.ShouldContain("GROUP BY [FYear]");
    }
}
