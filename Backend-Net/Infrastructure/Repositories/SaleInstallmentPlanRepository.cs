using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class SaleInstallmentPlanRepository : GenericRepository<SaleInstallmentPlan>, ISaleInstallmentPlanRepository
    {
        private readonly IWMSDbContext _context;

        public SaleInstallmentPlanRepository(IWMSDbContext context) : base(context)
        {
            _context = context;
        }

        public async Task<SaleInstallmentPlan?> GetActiveBySaleIdAsync(int saleId, CancellationToken cancellationToken)
        {
            return await _context.SaleInstallmentPlans
                .Include(x => x.Installments)
                .Where(x => x.SaleId == saleId && x.IsActive && x.Status == SaleInstallmentPlanStatusEnum.ACTIVE)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<SaleInstallmentPlan?> GetWithInstallmentsAsync(int planId, CancellationToken cancellationToken)
        {
            return await _context.SaleInstallmentPlans
                .Include(x => x.Installments)
                .Include(x => x.Sale)
                .FirstOrDefaultAsync(x => x.Id == planId, cancellationToken);
        }
    }
}
