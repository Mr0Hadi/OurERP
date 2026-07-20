using Application.Common.Contracts.UserContextService;
using Common.Extensions;
using Domain.Enums;

namespace WMS.Services
{
    public class UserContextService : IUserContextService
    {

        private readonly IHttpContextAccessor _httpContextAccessor;

        public UserContextService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public string? GetAccessToken()
        {
            return _httpContextAccessor.HttpContext?.Request.Headers["Authorization"]
                .ToString()
                .Replace("Bearer ", "");
        }

        public string? GetUserId()
        {
            return _httpContextAccessor.HttpContext.User.GetUserCliam("Id");
        }
        
        public bool IsAdmin()
        {
            return _httpContextAccessor.HttpContext.User.HasClaim(x => x.Type == UserRolesEnum.Admin.ToString());
        }
    }
}
