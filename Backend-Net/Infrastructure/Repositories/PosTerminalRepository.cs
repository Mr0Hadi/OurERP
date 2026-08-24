using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;

namespace Infrastructure.Repositories
{
    public class PosTerminalRepository : GenericRepository<PosTerminal>, IPosTerminalRepository
    {
        public PosTerminalRepository(IWMSDbContext context) : base(context)
        {
        }
    }
}
