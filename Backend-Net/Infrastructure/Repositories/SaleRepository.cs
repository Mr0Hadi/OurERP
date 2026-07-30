using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;

namespace Infrastructure.Repositories
{
    public class SaleRepository : GenericRepository<Sale>, ISaleRepository
    {
        private readonly IWMSDbContext _dbContext;
        public SaleRepository(IWMSDbContext context) : base(context)
        {
            _dbContext = context;
        }
    }
}
