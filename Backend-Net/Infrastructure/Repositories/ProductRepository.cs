using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;

namespace Infrastructure.Repositories
{
    public class ProductRepository : GenericRepository<Product>, IProductRepository
    {
        private readonly IWMSDbContext _dbContext;
        public ProductRepository(IWMSDbContext context) : base(context)
        {
            _dbContext = context;
        }
    }
}
