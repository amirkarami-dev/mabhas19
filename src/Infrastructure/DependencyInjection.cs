using Mabhas19.Application.Common.Interfaces;
using Mabhas19.Infrastructure.Auth;
using Mabhas19.Infrastructure.Data;
using Mabhas19.Infrastructure.Data.Interceptors;
using Mabhas19.Infrastructure.External;
using Mabhas19.Infrastructure.Identity;
using Mabhas19.Infrastructure.Reporting;
using Mabhas19.Infrastructure.Storage;
using Mabhas19.Infrastructure.Subscriptions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Minio;

namespace Microsoft.Extensions.DependencyInjection;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        var connectionString = builder.Configuration.GetConnectionString(Services.Database);
        Guard.Against.Null(connectionString, message: $"Connection string '{Services.Database}' not found.");

        builder.Services.AddScoped<ISaveChangesInterceptor, AuditableEntityInterceptor>();
        builder.Services.AddScoped<ISaveChangesInterceptor, DispatchDomainEventsInterceptor>();

        builder.Services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.AddInterceptors(sp.GetServices<ISaveChangesInterceptor>());
            options.UseSqlServer(connectionString);
            options.ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));
        });

        builder.EnrichSqlServerDbContext<ApplicationDbContext>();

        builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        builder.Services.AddScoped<ApplicationDbContextInitialiser>();

        builder.Services.AddAuthentication()
            .AddBearerToken(IdentityConstants.BearerScheme);

        builder.Services.AddAuthorizationBuilder();

        builder.Services
            .AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddApiEndpoints();

        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddTransient<IIdentityService, IdentityService>();

        AddMabhas19Services(builder);
    }

    private static void AddMabhas19Services(IHostApplicationBuilder builder)
    {
        var services = builder.Services;
        var config = builder.Configuration;

        // Options
        services.Configure<MinioOptions>(config.GetSection(MinioOptions.SectionName));
        services.Configure<OtpOptions>(config.GetSection(OtpOptions.SectionName));
        services.Configure<SmsOptions>(config.GetSection(SmsOptions.SectionName));
        services.Configure<GoogleAuthOptions>(config.GetSection(GoogleAuthOptions.SectionName));
        services.Configure<NezamMohandesiOptions>(config.GetSection(NezamMohandesiOptions.SectionName));

        // OTP needs a cache store.
        services.AddDistributedMemoryCache();

        // Object storage (MinIO / S3).
        services.AddSingleton<IMinioClient>(sp =>
        {
            var o = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<MinioOptions>>().Value;
            return new MinioClient()
                .WithEndpoint(o.Endpoint)
                .WithCredentials(o.AccessKey, o.SecretKey)
                .WithSSL(o.UseSSL)
                .Build();
        });
        services.AddScoped<IFileStorage, MinioFileStorage>();

        // PDF reporting (QuestPDF community license + Persian font registration).
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
        ReportFonts.Register(builder.Environment.ContentRootPath);
        services.AddScoped<IReportGenerator, QuestPdfReportGenerator>();

        // Subscriptions, auth helpers.
        services.AddScoped<ISubscriptionService, SubscriptionService>();
        services.AddScoped<IUserAdminService, UserAdminService>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IGoogleTokenValidator, GoogleTokenValidator>();
        services.AddHttpClient<ISmsSender, SmsSender>();

        // External project import providers.
        services.AddHttpClient<IExternalProjectProvider, NezamMohandesiProjectProvider>();
    }
}
