using Application.Common.Dtos;
using Application.Features.User.Dto;

namespace Application.Common.Contracts.Token
{
    public interface ITokenService
    {

        Task<TokenDto> SetToken(TokenUserInfoDto userInfo);

        string GenerateRefreshToken();

        TokenInfoDto? GetTokenInfo(string token);

    }
}
