using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
using Application.Common.Queries;
using Domain.Entities;
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

        public async Task<List<PurchaseReturn>> GetActiveByPurchaseIdAsync(int purchaseId, CancellationToken cancellationToken)
        {
            return await _context.PurchaseReturns.Where(x => x.PurchaseId == purchaseId)
                .WhereNotDeleted()
                .WhereOpen()
                .WithReturnGraph()
                .ToListAsync(cancellationToken);
        }
    }
}
