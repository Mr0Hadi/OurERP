using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class UserRepository : GenericRepository<User>, IUserRepository
    {
        private readonly IWMSDbContext _context;
        public UserRepository(IWMSDbContext context) : base(context)
        {
            _context = context;
        }

        public async Task<User?> GetByUsernameAsync(string username)
        {
            return await _context.Users.Include(x => x.Role).SingleOrDefaultAsync(u => u.Username == username);
        }

        public override async Task<User?> GetByIdAsync(object id)
        {
            return await _context.Users.Include(x => x.Role).SingleOrDefaultAsync(u => u.Id == Convert.ToInt32(id));
        }

        public async Task<bool> IsExistAsync(int userId)
        {
            return await _context.Users.AnyAsync(u => u.Id == userId);
        }
    }
}
