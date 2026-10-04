using Application.Common.Contracts.Token;
using Application.Common.Dtos;
using Application.Features.User.Dto;
using Infrastructure.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using NSubstitute;

namespace WMS.Tests.Support
{
    /// <summary>
    /// A real <see cref="UserSessionService"/> over its own cache, with a token service that hands
    /// out a fresh, distinguishable token pair on every call - so a test can tell sessions apart.
    /// </summary>
    public static class TestSessions
    {
        public static IConfiguration Configuration { get; } = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:RefreshTokenDurationInMinutes"] = "120",
            })
            .Build();

        public static ITokenService CountingTokenService()
        {
            var counter = 0;
            var tokenService = Substitute.For<ITokenService>();
            tokenService.SetTokenAsync(Arg.Any<TokenUserInfoDto>())
                .Returns(_ =>
                {
                    var n = Interlocked.Increment(ref counter);
                    return Task.FromResult(new TokenDto { AccessToken = $"access-{n}", RefreshToken = $"refresh-{n}" });
                });
            return tokenService;
        }

        public static UserSessionService Create(ITokenService? tokenService = null, IMemoryCache? cache = null)
            => new(tokenService ?? CountingTokenService(), cache ?? new MemoryCache(new MemoryCacheOptions()), Configuration);
    }
}
