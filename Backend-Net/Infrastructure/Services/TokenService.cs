using Application.Common.Contracts.Token;
using Application.Common.Dtos;
using Application.Features.User.Dto;
using Domain.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Infrastructure.Services
{
    public class TokenService : ITokenService
    {

        private readonly IConfiguration _configuration;
		public TokenService(IConfiguration configuration)
		{
			_configuration = configuration;
		}

		public async Task<TokenDto> SetToken(TokenUserInfoDto userInfo)
        {

            var claimsList = new List<Claim>
            {
                new Claim("Id", userInfo.Id.ToString()),
                new Claim("FullName", userInfo.FullName),
                new Claim("Mobile", userInfo.Mobile.ToString()),
            };

            if (userInfo.RoleId == (int)UserRolesEnum.Admin)
            {
                claimsList.Add(new Claim("Admin", "Admin"));
            }
            else if (userInfo.RoleId == (int)UserRolesEnum.Manager)
            {
                claimsList.Add(new Claim("Manager", "Manager"));
			}

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:SigningKey"]));
            var signingCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

            var encryptionKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:EncryptionKey"]));
            var encryptingCredentials = new EncryptingCredentials(encryptionKey, SecurityAlgorithms.Aes256KW, SecurityAlgorithms.Aes256CbcHmacSha512);

            var tokenExp = DateTime.UtcNow.AddMinutes(Convert.ToInt32(_configuration["JwtSettings:TokenDurationInMinutes"]));

            var handler = new JwtSecurityTokenHandler();

            var jwtSecurityToken = handler.CreateJwtSecurityToken(
                issuer: _configuration["JwtSettings:Issuer"],
                audience: _configuration["JwtSettings:Audience"],
                subject: new ClaimsIdentity(claimsList),
                notBefore: DateTime.UtcNow,
                expires: tokenExp,
                issuedAt: DateTime.UtcNow,
                signingCredentials: signingCredentials,
                encryptingCredentials: encryptingCredentials
            );

            var accessToken = handler.WriteToken(jwtSecurityToken);


            var refreshToken = GenerateRefreshToken();

            return new TokenDto { AccessToken = accessToken, RefreshToken = refreshToken };

        }

        public string GenerateRefreshToken()
        {
            var randomNumber = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomNumber);
                return Convert.ToBase64String(randomNumber);
            }
        }

        public TokenInfoDto? GetTokenInfo(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();

            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateIssuerSigningKey = true,
                ValidateLifetime = false, 

                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:SigningKey"])),
                TokenDecryptionKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:EncryptionKey"]))
            };

            try
            {
                var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken validatedToken);

                if (validatedToken is JwtSecurityToken jwtToken)
                {
                    var idClaim = principal.Claims.FirstOrDefault(c => c.Type == "Id");
                    string id = idClaim?.Value;

                    var mobileClaim = principal.Claims.FirstOrDefault(c => c.Type == "Mobile");
                    string mobile = mobileClaim?.Value;

                    bool isExpired = jwtToken.ValidTo < DateTime.UtcNow;

                    return new TokenInfoDto
                    {
                        Id = id,
                        IsExpired = isExpired,
                        Mobile = mobile
                    };
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

    }
}
