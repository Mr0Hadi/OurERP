using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;

namespace Infrastructure.Repositories
{
    public class TeamRepository : GenericRepository<Team>, ITeamRepository
    {
        private readonly IWMSDbContext _context;
        public TeamRepository(IWMSDbContext context) : base(context)
        {
            _context = context;
        }
    }
}
