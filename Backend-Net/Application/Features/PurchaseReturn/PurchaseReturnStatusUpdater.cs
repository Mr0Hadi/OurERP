using Domain.Entities;
using Domain.Enums;

namespace Application.Features.PurchaseReturn
{
    public static class PurchaseReturnStatusUpdater
    {
        public static PurchaseReturnStatusEnum RecomputeReturnStatus(Domain.Entities.PurchaseReturn purchaseReturn)
        {
            var items = purchaseReturn.Items ?? new List<PurchaseReturnItem>();
            if (items.Count == 0)
                return PurchaseReturnStatusEnum.PENDING;

            var allDecisions = items.SelectMany(x => x.Decisions ?? new List<PurchaseReturnDecision>()).ToList();
            var decidedQty = allDecisions.Sum(x => x.Quantity);

            if (decidedQty == 0)
                return PurchaseReturnStatusEnum.PENDING;

            var totalQty = items.Sum(x => x.Quantity);
            var allResolved = allDecisions.All(x => x.Status == PurchaseReturnDecisionStatusEnum.RESOLVED);

            if (decidedQty >= totalQty && allResolved)
                return PurchaseReturnStatusEnum.RESOLVED;

            return PurchaseReturnStatusEnum.COORDINATING;
        }

        public static int ComputeReceivableQuantity(PurchaseItem item, Domain.Entities.PurchaseReturn? purchaseReturn)
        {
            int faulty = 0;
            int replacement = 0;

            if (purchaseReturn?.Items != null && IsActive(purchaseReturn))
            {
                foreach (var returnItem in purchaseReturn.Items.Where(x => x.ProductId == item.ProductId))
                {
                    faulty += returnItem.Quantity;
                    replacement += (returnItem.Decisions ?? new List<PurchaseReturnDecision>())
                        .Where(x => x.DecisionType == PurchaseReturnDecisionTypeEnum.REPLACEMENT)
                        .Sum(x => x.Quantity);
                }
            }

            return Math.Max(0, item.Quantity - item.ReceivedQuantity - faulty + replacement);
        }

        public static PurchaseStatusEnum RecomputePurchaseStatus(Domain.Entities.Purchase purchase, Domain.Entities.PurchaseReturn? purchaseReturn)
        {
            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                return PurchaseStatusEnum.CANCELLED;

            var items = purchase.Items ?? new List<PurchaseItem>();
            foreach (var item in items)
            {
                if (ComputeReceivableQuantity(item, purchaseReturn) > 0)
                    return PurchaseStatusEnum.SHIPPED;
            }

            if (purchaseReturn != null &&
                IsActive(purchaseReturn) &&
                (purchaseReturn.Status == PurchaseReturnStatusEnum.PENDING ||
                 purchaseReturn.Status == PurchaseReturnStatusEnum.COORDINATING))
            {
                return PurchaseStatusEnum.RETURNED;
            }

            return PurchaseStatusEnum.RECEIVED;
        }

        public static void ResolveReplacementDecisions(Domain.Entities.Purchase purchase, Domain.Entities.PurchaseReturn? purchaseReturn)
        {
            var items = purchase.Items ?? new List<PurchaseItem>();

            foreach (var item in items)
            {
                var awaitingLines = (purchaseReturn?.Items ?? new List<PurchaseReturnItem>())
                    .Where(x => x.ProductId == item.ProductId)
                    .SelectMany(x => x.Decisions ?? new List<PurchaseReturnDecision>())
                    .Where(x => x.DecisionType == PurchaseReturnDecisionTypeEnum.REPLACEMENT &&
                                x.Status == PurchaseReturnDecisionStatusEnum.AWAITING)
                    .OrderBy(x => x.CreatedAt)
                    .ToList();

                if (awaitingLines.Count == 0)
                    continue;

                var settledQty = (purchaseReturn?.Items ?? new List<PurchaseReturnItem>())
                    .Where(x => x.ProductId == item.ProductId)
                    .SelectMany(x => x.Decisions ?? new List<PurchaseReturnDecision>())
                    .Where(x => x.DecisionType != PurchaseReturnDecisionTypeEnum.REPLACEMENT)
                    .Sum(x => x.Quantity);

                var stillNeeded = Math.Max(0, item.Quantity - item.ReceivedQuantity - settledQty);
                var totalAwaitingQty = awaitingLines.Sum(x => x.Quantity);
                var coveredBudget = Math.Max(0, totalAwaitingQty - stillNeeded);

                foreach (var line in awaitingLines)
                {
                    if (coveredBudget >= line.Quantity)
                    {
                        line.Status = PurchaseReturnDecisionStatusEnum.RESOLVED;
                        coveredBudget -= line.Quantity;
                    }
                    else
                    {
                        break;
                    }
                }
            }
        }

        private static bool IsActive(Domain.Entities.PurchaseReturn? purchaseReturn)
        {
            return purchaseReturn != null &&
                   purchaseReturn.IsActive &&
                   purchaseReturn.Status != PurchaseReturnStatusEnum.REJECTED &&
                   purchaseReturn.Status != PurchaseReturnStatusEnum.CANCELLED;
        }
    }
}
