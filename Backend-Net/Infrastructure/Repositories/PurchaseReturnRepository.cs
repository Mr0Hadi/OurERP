using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class PurchaseReturnRepository : GenericRepository<PurchaseReturn>, IPurchaseReturnRepository
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnQueryService _purchaseReturnQueryService;

        public PurchaseReturnRepository(IWMSDbContext context, IPurchaseReturnQueryService purchaseReturnQueryService) : base(context)
        {
            _context = context;
            _purchaseReturnQueryService = purchaseReturnQueryService;
        }

        public async Task<List<PurchaseReturn>> GetActiveByPurchaseIdAsync(int purchaseId, CancellationToken cancellationToken)
        {
            return await _purchaseReturnQueryService
                .ActiveWithReturnGraph(_context.PurchaseReturns.Where(x => x.PurchaseId == purchaseId))
                .ToListAsync(cancellationToken);
        }
    }
}
