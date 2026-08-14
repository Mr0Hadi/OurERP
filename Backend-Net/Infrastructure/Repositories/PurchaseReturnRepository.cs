using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class PurchaseReturnRepository : GenericRepository<PurchaseReturn>, IPurchaseReturnRepository
    {
        private readonly IWMSDbContext _context;

        public PurchaseReturnRepository(IWMSDbContext context) : base(context)
        {
            _context = context;
        }

        public async Task<PurchaseReturn?> GetActiveByPurchaseIdAsync(int purchaseId, CancellationToken cancellationToken)
        {
            return await _context.PurchaseReturns
                .Where(x => x.PurchaseId == purchaseId &&
                            (x.Status == PurchaseReturnStatusEnum.PENDING || x.Status == PurchaseReturnStatusEnum.COORDINATING))
                .Include(x => x.Items)
                .ThenInclude(x => x.Decisions)
                .FirstOrDefaultAsync(cancellationToken);
        }
    }
}
