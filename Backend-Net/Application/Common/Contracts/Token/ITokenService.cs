using Application.Common.Dtos;
using Application.Features.User.Dto;

namespace Application.Common.Contracts.Token
{
    public interface ITokenService
    {

        // Task-returning so callers keep an awaitable seam (and so a future token store /
        // key-vault lookup can become real IO without breaking them), but the current
        // implementation is pure in-memory crypto - see TokenService.SetTokenAsync.
        Task<TokenDto> SetTokenAsync(TokenUserInfoDto userInfo);

        string GenerateRefreshToken();

        TokenInfoDto? GetTokenInfo(string token);

    }
}
