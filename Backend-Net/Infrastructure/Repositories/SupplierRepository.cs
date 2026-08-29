using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class SupplierRepository : GenericRepository<Supplier>, ISupplierRepository
    {
        private readonly IWMSDbContext _context;
        public SupplierRepository(IWMSDbContext context) : base(context)
        {
            _context = context;
        }

        public override async Task<Supplier?> GetByIdAsync(object id, CancellationToken cancellationToken = default)
        {
            return await _context.Suppliers.Where(x => x.Id == Convert.ToInt32(id) && x.IsActive).FirstOrDefaultAsync();
        }
    }
}
