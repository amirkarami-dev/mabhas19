using System.Security.Claims;
using OpenIddict.Abstractions;
using static OpenIddict.Abstractions.OpenIddictConstants;

namespace Mabhas19.Auth;

public static class OpenIddictClaimDestinations
{
    public static IEnumerable<string> For(Claim claim) => claim.Type switch
    {
        Claims.Name             => [Destinations.AccessToken, Destinations.IdentityToken],
        Claims.Email            => [Destinations.AccessToken, Destinations.IdentityToken],
        Claims.Role             => [Destinations.AccessToken, Destinations.IdentityToken],
        "preferred_username"    => [Destinations.AccessToken, Destinations.IdentityToken],
        _                       => [Destinations.AccessToken]
    };
}
