using Mabhas19.Auth.Data;
using Mabhas19.Auth.External;
using Mabhas19.Auth.Otp;
using Mabhas19.Auth.Sms;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();

builder.Services.AddDbContext<AuthDbContext>(o =>
{
    o.UseSqlServer(builder.Configuration.GetConnectionString("Mabhas19AuthDb"));
    o.UseOpenIddict(); // registers OpenIddict's EF Core stores' entity sets
});
builder.Services.AddIdentity<AuthUser, IdentityRole>()
    .AddEntityFrameworkStores<AuthDbContext>()
    .AddDefaultTokenProviders();

// Identity cookie paths — defaults already match, but made explicit for clarity.
builder.Services.ConfigureApplicationCookie(o =>
{
    o.LoginPath = "/Account/Login";
    o.LogoutPath = "/Account/Logout";
});

// OTP / SMS / Google services
builder.Services.AddDistributedMemoryCache();
builder.Services.Configure<OtpOptions>(builder.Configuration.GetSection(OtpOptions.SectionName));
builder.Services.Configure<SmsOptions>(builder.Configuration.GetSection(SmsOptions.SectionName));
builder.Services.Configure<GoogleAuthOptions>(builder.Configuration.GetSection(GoogleAuthOptions.SectionName));
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddHttpClient<ISmsSender, SmsSender>();
builder.Services.AddScoped<IGoogleTokenValidator, GoogleTokenValidator>();

builder.Services.AddScoped<AuthDbInitialiser>();

builder.Services.AddControllersWithViews();
builder.Services.AddRazorPages();

builder.Services.AddOpenIddict()
    .AddCore(o => o.UseEntityFrameworkCore().UseDbContext<AuthDbContext>())
    .AddServer(o =>
    {
        o.SetAuthorizationEndpointUris("connect/authorize")
         .SetTokenEndpointUris("connect/token")
         .SetUserInfoEndpointUris("connect/userinfo")
         .SetEndSessionEndpointUris("connect/logout");

        o.AllowAuthorizationCodeFlow().RequireProofKeyForCodeExchange()
         .AllowRefreshTokenFlow();

        o.RegisterScopes("openid", "profile", "email", "roles", "offline_access", "mabhas19.api", "plan.api");

        o.SetAccessTokenLifetime(TimeSpan.FromMinutes(30));
        o.SetRefreshTokenLifetime(TimeSpan.FromDays(14));

        // CRITICAL: signed (NOT encrypted) JWT access tokens, so resource servers can
        // validate via JWKS with standard AddJwtBearer — no OpenIddict client required.
        o.DisableAccessTokenEncryption();

        if (builder.Environment.IsDevelopment())
        {
            o.AddDevelopmentEncryptionCertificate().AddDevelopmentSigningCertificate();
        }
        else
        {
            // Use the Stream overload to avoid the obsolete X509Certificate2(string, string)
            // constructor that is an error under TreatWarningsAsErrors in .NET 10.
            var certPath = builder.Configuration["OpenIddict:SigningCertificatePath"]!;
            var certPwd = builder.Configuration["OpenIddict:SigningCertificatePassword"];
            o.AddSigningCertificate(File.OpenRead(certPath), certPwd);
            o.AddEncryptionCertificate(File.OpenRead(certPath), certPwd);
        }

        o.UseAspNetCore()
         .EnableAuthorizationEndpointPassthrough()
         .EnableTokenEndpointPassthrough()
         .EnableUserInfoEndpointPassthrough()
         .EnableEndSessionEndpointPassthrough();
    })
    .AddValidation(o => { o.UseLocalServer(); o.UseAspNetCore(); });

var app = builder.Build();

await app.InitialiseAuthAsync();

app.MapDefaultEndpoints();
app.MapGet("/", () => "Mabhas19 Auth");
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapRazorPages();
app.Run();
public partial class Program;
