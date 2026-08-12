using Application.Common.Contracts.SaleReturn;
using Domain.Enums;

namespace Infrastructure.Services
{
    public class SaleReturnCalculationService : ISaleReturnCalculationService
    {
        private static readonly HashSet<SaleReturnStatusEnum> TerminalReturnStatuses = new()
        {
            SaleReturnStatusEnum.REJECTED,
            SaleReturnStatusEnum.CANCELLED,
        };

        public bool IsTerminal(SaleReturnStatusEnum status) => TerminalReturnStatuses.Contains(status);

        public bool IsMutable(Domain.Entities.SaleReturn saleReturn) =>
            saleReturn.Status != SaleReturnStatusEnum.RESOLVED && !IsTerminal(saleReturn.Status);

        public bool IsPreInspection(Domain.Entities.SaleReturn saleReturn) =>
            saleReturn.Status == SaleReturnStatusEnum.PENDING_INSPECTION && saleReturn.InspectedQuantity == 0;

        public bool IsValidDecision(SalesReturnIssueTypeEnum? issueType, SaleReturnDecisionTypeEnum decisionType)
        {
            if (issueType == null)
                return decisionType != SaleReturnDecisionTypeEnum.REPLACEMENT;

            return true;
        }

        public SaleReturnStatusEnum RecomputeReturnStatus(Domain.Entities.SaleReturn saleReturn)
        {
            if (saleReturn.InspectedQuantity < saleReturn.ClaimedQuantity)
                return SaleReturnStatusEnum.PENDING_INSPECTION;

            var allDecisions = saleReturn.Claims
                .SelectMany(c => c.InspectionItems)
                .SelectMany(i => i.Decisions)
                .ToList();

            var allFinal = allDecisions.Count > 0 && allDecisions.All(d => d.Status == SaleReturnDecisionStatusEnum.RESOLVED);

            if (saleReturn.DecidedQuantity >= saleReturn.InspectedQuantity && allFinal)
                return SaleReturnStatusEnum.RESOLVED;

            return SaleReturnStatusEnum.COORDINATING;
        }

        // A claim's quantity stays "open" (still counts against the claimable budget) until it has
        // an actual decision registered against it - whether that's because it hasn't been
        // inspected yet, or it's been inspected but not yet decided. So open = claimed - decided,
        // regardless of how much has been inspected in between.
        public int GetOpenClaimQuantity(int saleItemId, List<Domain.Entities.SaleReturn> activeReturns)
        {
            if (activeReturns == null || activeReturns.Count == 0)
                return 0;

            return activeReturns
                .SelectMany(r => r.Claims)
                .Where(c => c.SaleItemId == saleItemId)
                .Sum(c => c.ClaimedQuantity - c.DecidedQuantity);
        }

        public int GetClaimableQuantity(Domain.Entities.SaleItem item, List<Domain.Entities.SaleReturn> activeReturns)
        {
            var budget = item.ShippedQuantity - item.SettledQuantity;
            var openClaim = GetOpenClaimQuantity(item.Id, activeReturns);
            return Math.Max(0, budget - openClaim);
        }

        public SalesStatusEnum RecomputeSaleStatus(Domain.Entities.Sale sale)
        {
            if (sale.Status == SalesStatusEnum.CANCELLED)
                return SalesStatusEnum.CANCELLED;

            var fullyReturned = sale.Items.Count > 0 &&
                sale.Items.All(i => i.ShippedQuantity > 0 && i.SettledQuantity >= i.ShippedQuantity);

            if (fullyReturned)
                return SalesStatusEnum.RETURNED;

            return sale.Status;
        }
    }
}
