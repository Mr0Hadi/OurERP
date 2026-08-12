using Domain.Entities;

namespace Application.Common.Contracts.Repositories
{
    public interface IUserRepository : IGenericRepository<User>
    {
        Task<User?> GetByUsernameAsync(string username);
        Task<bool> IsExistAsync(int userId);
    }
}
