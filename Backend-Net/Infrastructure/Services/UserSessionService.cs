using Application.Common.Contracts.Token;
using Application.Common.Dtos;
using Application.Features.User.Dto;
using Domain.Entities;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services
{
    public class UserSessionService : IUserSessionService
    {
        private readonly ITokenService _tokenService;
        private readonly IMemoryCache _memoryCache;
        private readonly IConfiguration _configuration;

        public UserSessionService(ITokenService tokenService, IMemoryCache memoryCache, IConfiguration configuration)
        {
            _tokenService = tokenService;
            _memoryCache = memoryCache;
            _configuration = configuration;
        }

        public async Task<TokenDto> IssueAsync(User user)
        {
            var tokens = await _tokenService.SetTokenAsync(new TokenUserInfoDto
            {
                Id = user.Id,
                Username = user.Username,
                FirstName = user.FirstName,
                LastName = user.LastName,
                MustChangePassword = user.MustChangePassword,
            });

            tokens.MustChangePassword = user.MustChangePassword;

            var sessionLifetime = TimeSpan.FromMinutes(Convert.ToInt32(_configuration["JwtSettings:RefreshTokenDurationInMinutes"]));

            // One string per user, replaced whole: a second login overwrites the first one's token
            // (single session), and a reference swap is atomic, so concurrent logins/refreshes cannot
            // corrupt anything - unlike the shared HashSet this replaced.
            _memoryCache.Set(CacheKey(user.Id), tokens.AccessToken, sessionLifetime);

            user.RefreshToken = tokens.RefreshToken;
            user.ExpireRefreshToken = DateTime.Now.Add(sessionLifetime);

            return tokens;
        }

        public bool IsCurrent(int userId, string accessToken)
        {
            return _memoryCache.TryGetValue(CacheKey(userId), out string? current)
                && current != null
                && string.Equals(current, accessToken, StringComparison.Ordinal);
        }

        public void RevokeAll(User user)
        {
            _memoryCache.Remove(CacheKey(user.Id));

            user.RefreshToken = null;
            user.ExpireRefreshToken = null;
        }

        private static string CacheKey(int userId) => $"UserSession:{userId}";
    }
}
