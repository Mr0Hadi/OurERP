using Application.Common.Contracts.PurchaseReturn;
using Domain.Enums;

namespace Infrastructure.Services
{
    public class PurchaseReturnCalculationService : IPurchaseReturnCalculationService
    {
        private static readonly HashSet<PurchaseReturnStatusEnum> TerminalReturnStatuses = new()
        {
            PurchaseReturnStatusEnum.REJECTED,
            PurchaseReturnStatusEnum.CANCELLED,
        };

        public bool IsTerminal(PurchaseReturnStatusEnum status) => TerminalReturnStatuses.Contains(status);

        public bool IsValidDecision(PurchaseIssueTypeEnum issueType, PurchaseReturnDecisionTypeEnum decisionType)
        {
            switch (issueType)
            {
                case PurchaseIssueTypeEnum.SHORTAGE:
                case PurchaseIssueTypeEnum.WRONG_ITEM:
                    return decisionType == PurchaseReturnDecisionTypeEnum.REFUND ||
                           decisionType == PurchaseReturnDecisionTypeEnum.REPLACEMENT ||
                           decisionType == PurchaseReturnDecisionTypeEnum.CREDIT;
                case PurchaseIssueTypeEnum.EXCESS:
                    return decisionType == PurchaseReturnDecisionTypeEnum.REFUND ||
                           decisionType == PurchaseReturnDecisionTypeEnum.CREDIT;
                case PurchaseIssueTypeEnum.DAMAGED:
                case PurchaseIssueTypeEnum.DEFECTIVE:
                case PurchaseIssueTypeEnum.EXPIRED:
                case PurchaseIssueTypeEnum.OTHER:
                    return decisionType == PurchaseReturnDecisionTypeEnum.REFUND ||
                           decisionType == PurchaseReturnDecisionTypeEnum.REPLACEMENT ||
                           decisionType == PurchaseReturnDecisionTypeEnum.CREDIT ||
                           decisionType == PurchaseReturnDecisionTypeEnum.WRITE_OFF;
                default:
                    return false;
            }
        }

        public PurchaseReturnStatusEnum RecomputeReturnStatus(Domain.Entities.PurchaseReturn purchaseReturn)
        {
            var allDecisions = purchaseReturn.Items.SelectMany(i => i.Decisions).ToList();
            var allocatedQty = allDecisions.Sum(d => d.Quantity);

            if (allocatedQty == 0)
                return PurchaseReturnStatusEnum.PENDING;

            var totalQty = purchaseReturn.Items.Sum(i => i.Quantity);
            var allFinal = allDecisions.Count > 0 && allDecisions.All(d => d.Status == PurchaseReturnDecisionStatusEnum.RESOLVED);

            if (allocatedQty >= totalQty && allFinal)
                return PurchaseReturnStatusEnum.RESOLVED;

            return PurchaseReturnStatusEnum.COORDINATING;
        }

        public int GetOpenIssueQuantity(int purchaseItemId, Domain.Entities.PurchaseReturn? activeReturn)
        {
            if (activeReturn == null)
                return 0;

            return activeReturn.Items
                .Where(i => i.PurchaseItemId == purchaseItemId)
                .Sum(i => i.Quantity - i.Decisions.Sum(d => d.Quantity));
        }

        public int GetReceivableQuantity(Domain.Entities.PurchaseItem item, Domain.Entities.PurchaseReturn? activeReturn)
        {
            var budget = item.Quantity - item.ReceivedQuantity - item.SettledQuantity;
            var openIssue = GetOpenIssueQuantity(item.Id, activeReturn);
            return Math.Max(0, budget - openIssue);
        }

        public PurchaseStatusEnum RecomputePurchaseStatus(Domain.Entities.Purchase purchase, Domain.Entities.PurchaseReturn? activeReturn)
        {
            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                return PurchaseStatusEnum.CANCELLED;

            var hasOpenIssue = purchase.Items.Any(i => GetOpenIssueQuantity(i.Id, activeReturn) > 0);
            var fullyAccounted = purchase.Items.All(i => i.ReceivedQuantity + i.SettledQuantity >= i.Quantity);

            if (fullyAccounted && !hasOpenIssue)
                return PurchaseStatusEnum.RECEIVED;

            if (purchase.Items.Any(i => i.ReceivedQuantity > 0 || i.SettledQuantity > 0))
                return PurchaseStatusEnum.PARTIALLY_RECEIVED;

            return purchase.Status;
        }

        public void ResolveAwaitingReplacements(Domain.Entities.Purchase purchase, Domain.Entities.PurchaseReturn? activeReturn, DateTime now)
        {
            if (activeReturn == null)
                return;

            var awaitingByPurchaseItem = activeReturn.Items
                .SelectMany(i => i.Decisions
                    .Where(d => d.DecisionType == PurchaseReturnDecisionTypeEnum.REPLACEMENT &&
                                d.Status == PurchaseReturnDecisionStatusEnum.AWAITING)
                    .Select(d => new { i.PurchaseItemId, Decision = d }))
                .GroupBy(x => x.PurchaseItemId);

            foreach (var group in awaitingByPurchaseItem)
            {
                var purchaseItem = purchase.Items.FirstOrDefault(x => x.Id == group.Key);
                if (purchaseItem == null)
                    continue;

                var lines = group.Select(x => x.Decision).OrderBy(d => d.CreatedAt).ToList();
                var totalAwaitingQty = lines.Sum(d => d.Quantity);
                var stillNeeded = Math.Max(0, purchaseItem.Quantity - purchaseItem.ReceivedQuantity - purchaseItem.SettledQuantity);
                var coveredBudget = Math.Max(0, totalAwaitingQty - stillNeeded);

                foreach (var line in lines)
                {
                    if (coveredBudget < line.Quantity)
                        break;

                    line.Status = PurchaseReturnDecisionStatusEnum.RESOLVED;
                    line.ResolvedAt = now;
                    coveredBudget -= line.Quantity;
                }
            }
        }
    }
}
