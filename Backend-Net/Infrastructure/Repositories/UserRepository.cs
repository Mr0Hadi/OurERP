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

        public async Task<User?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
        {
            return await _context.Users.SingleOrDefaultAsync(u => u.Username == username, cancellationToken);
        }

        public override async Task<User?> GetByIdAsync(object id, CancellationToken cancellationToken = default)
        {
            return await _context.Users.SingleOrDefaultAsync(u => u.Id == Convert.ToInt32(id), cancellationToken);
        }

        public async Task<bool> IsExistAsync(int userId, CancellationToken cancellationToken = default)
        {
            return await _context.Users.AnyAsync(u => u.Id == userId, cancellationToken);
        }
    }
}
