using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class ProductCategoryRepository : GenericRepository<ProductCategory>, IProductCategoryRepository
    {
        private readonly IWMSDbContext _dbContext;
        public ProductCategoryRepository(IWMSDbContext context) : base(context)
        {
            _dbContext = context;
        }

        public override async Task<ProductCategory?> GetByIdAsync(object id, CancellationToken cancellationToken = default)
        {
            return await _dbContext.ProductCategories.Where(x => x.Id == Convert.ToInt32(id) && x.IsActive).FirstOrDefaultAsync();
        }
    }
}
