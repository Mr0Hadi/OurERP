using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Features.SaleReturn;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class SaleReturnRepository : GenericRepository<SaleReturn>, ISaleReturnRepository
    {
        private readonly IWMSDbContext _context;

        public SaleReturnRepository(IWMSDbContext context) : base(context)
        {
            _context = context;
        }

        public async Task<List<SaleReturn>> GetActiveBySaleIdAsync(int saleId, CancellationToken cancellationToken)
        {
            return await _context.SaleReturns
                .Where(x => x.SaleId == saleId)
                .WhereActive()
                .WithReturnGraph()
                .ToListAsync(cancellationToken);
        }
    }
}
