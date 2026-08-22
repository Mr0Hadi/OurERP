using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.SaleReturn;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class SaleReturnRepository : GenericRepository<SaleReturn>, ISaleReturnRepository
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnQueryService _saleReturnQueryService;

        public SaleReturnRepository(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService) : base(context)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
        }

        public async Task<List<SaleReturn>> GetActiveBySaleIdAsync(int saleId, CancellationToken cancellationToken)
        {
            return await _saleReturnQueryService
                .ActiveWithReturnGraph(_context.SaleReturns.Where(x => x.SaleId == saleId))
                .ToListAsync(cancellationToken);
        }
    }
}
