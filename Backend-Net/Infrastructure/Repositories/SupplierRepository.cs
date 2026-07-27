using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;

namespace Infrastructure.Repositories
{
    public class SupplierRepository : GenericRepository<Supplier>, ISupplierRepository
    {
        private readonly IWMSDbContext _context;
        public SupplierRepository(IWMSDbContext context) : base(context)
        {
            _context = context;
        }
    }
}
