using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;

namespace Infrastructure.Repositories
{
    public class ProductCategoryRepository : GenericRepository<ProductCategory>, IProductCategoryRepository
    {
        private readonly IWMSDbContext _dbContext;
        public ProductCategoryRepository(IWMSDbContext context) : base(context)
        {
            _dbContext = context;
        }
    }
}
