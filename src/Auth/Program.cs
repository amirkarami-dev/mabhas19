using Mabhas19.Auth.Data;
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

var app = builder.Build();
app.MapDefaultEndpoints();
app.MapGet("/", () => "Mabhas19 Auth");
app.Run();
public partial class Program;
