using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;

namespace Infrastructure.Repositories
{
    public class RoleRepository : GenericRepository<Role>, IRoleRepository
    {

        private readonly IWMSDbContext _db;

        public RoleRepository(IWMSDbContext db) : base(db)
        {
            _db = db;
        }

    }
}
