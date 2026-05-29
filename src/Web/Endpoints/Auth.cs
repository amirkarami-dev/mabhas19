using Mabhas19.Application.Common.Interfaces;
using Mabhas19.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Mabhas19.Web.Endpoints;

/// <summary>
/// Supplementary authentication flows beyond username/password (which is handled by the
/// Identity API under /api/Users): mobile OTP and Google sign-in. Both issue the same
/// bearer tokens as the standard login by signing in with the bearer scheme.
/// </summary>
public class Auth : IEndpointGroup
{
    public static void Map(RouteGroupBuilder groupBuilder)
    {
        groupBuilder.MapPost(RequestOtp, "otp/request");
        groupBuilder.MapPost(VerifyOtp, "otp/verify");
        groupBuilder.MapPost(GoogleLogin, "google");
    }

    [EndpointSummary("Request a one-time login code via SMS")]
    public static async Task<IResult> RequestOtp(IOtpService otp, RequestOtpDto body)
    {
        if (string.IsNullOrWhiteSpace(body.PhoneNumber))
            return Results.BadRequest(new { error = "شماره موبایل الزامی است." });

        await otp.RequestAsync(body.PhoneNumber.Trim());
        return Results.Ok(new { sent = true });
    }

    [EndpointSummary("Verify the OTP and sign in (creating the user if needed)")]
    public static async Task<IResult> VerifyOtp(
        IOtpService otp,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        VerifyOtpDto body)
    {
        var phone = body.PhoneNumber?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(body.Code))
            return Results.BadRequest(new { error = "شماره موبایل و کد الزامی است." });

        if (!await otp.VerifyAsync(phone, body.Code))
            return Results.Unauthorized();

        var user = await userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone)
                   ?? await CreatePhoneUserAsync(userManager, phone);

        if (user is null) return Results.Problem("امکان ایجاد کاربر وجود ندارد.");

        signInManager.AuthenticationScheme = IdentityConstants.BearerScheme;
        await signInManager.SignInAsync(user, isPersistent: false);
        return Results.Empty;
    }

    [EndpointSummary("Sign in with a Google ID token (creating the user if needed)")]
    public static async Task<IResult> GoogleLogin(
        IGoogleTokenValidator validator,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        GoogleLoginDto body)
    {
        if (string.IsNullOrWhiteSpace(body.IdToken))
            return Results.BadRequest(new { error = "توکن گوگل الزامی است." });

        var info = await validator.ValidateAsync(body.IdToken);
        if (info is null || string.IsNullOrWhiteSpace(info.Email))
            return Results.Unauthorized();

        var user = await userManager.FindByEmailAsync(info.Email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = info.Email,
                Email = info.Email,
                EmailConfirmed = info.EmailVerified
            };
            var created = await userManager.CreateAsync(user);
            if (!created.Succeeded)
                return Results.Problem(string.Join("; ", created.Errors.Select(e => e.Description)));
        }

        signInManager.AuthenticationScheme = IdentityConstants.BearerScheme;
        await signInManager.SignInAsync(user, isPersistent: false);
        return Results.Empty;
    }

    private static async Task<ApplicationUser?> CreatePhoneUserAsync(UserManager<ApplicationUser> userManager, string phone)
    {
        var user = new ApplicationUser
        {
            UserName = phone,
            PhoneNumber = phone,
            PhoneNumberConfirmed = true
        };
        var result = await userManager.CreateAsync(user);
        return result.Succeeded ? user : null;
    }
}

public record RequestOtpDto
{
    public string PhoneNumber { get; init; } = string.Empty;
}

public record VerifyOtpDto
{
    public string PhoneNumber { get; init; } = string.Empty;
    public string Code { get; init; } = string.Empty;
}

public record GoogleLoginDto
{
    public string IdToken { get; init; } = string.Empty;
}
