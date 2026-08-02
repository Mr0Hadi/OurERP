using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class PurchaseReceiptRepository : GenericRepository<PurchaseReceipt>, IPurchaseReceiptRepository
    {
        private readonly IWMSDbContext _context;
        public PurchaseReceiptRepository(IWMSDbContext context) : base(context)
        {
            _context = context;
        }

        public async Task<PurchaseReceipt?> GetWithDetailsAsync(int id)
        {
            return await _context.PurchaseReceipts
                .Include(x => x.Purchase)
                .ThenInclude(x => x.Supplier)
                .Include(x => x.Items)
                .ThenInclude(x => x.PurchaseItem)
                .ThenInclude(x => x.Product)
                .Include(x => x.Items)
                .ThenInclude(x => x.Discrepancies)
                .ThenInclude(x => x.Decisions)
                .FirstOrDefaultAsync(x => x.Id == id);
        }

        public async Task<PurchaseReceipt?> GetByPurchaseIdAsync(int purchaseId)
        {
            return await _context.PurchaseReceipts
                .Include(x => x.Items)
                .ThenInclude(x => x.Discrepancies)
                .FirstOrDefaultAsync(x => x.PurchaseId == purchaseId);
        }
    }
}
