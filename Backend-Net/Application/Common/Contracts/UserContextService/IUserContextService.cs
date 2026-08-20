namespace Application.Common.Contracts.UserContextService
{
    public interface IUserContextService
    {
        string? GetUserId();
        string? GetAccessToken();
        bool IsAdmin();
    }
}
