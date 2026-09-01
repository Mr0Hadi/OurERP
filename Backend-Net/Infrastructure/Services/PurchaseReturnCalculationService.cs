using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Dtos.Returns;
using Domain.Entities;
using Domain.Enums;

namespace Infrastructure.Services
{
    public class PurchaseReturnCalculationService : IPurchaseReturnCalculationService
    {
        private static readonly HashSet<ReturnStatusEnum> TerminalReturnStatuses = new()
        {
            ReturnStatusEnum.REJECTED,
            ReturnStatusEnum.CANCELLED,
        };

        public bool IsTerminal(ReturnStatusEnum status) => TerminalReturnStatuses.Contains(status);

        public bool IsUntouched(PurchaseReturn purchaseReturn) =>
            !purchaseReturn.AllEffects.Any(e => e.Status == ReturnEffectStatusEnum.APPLIED);

        public ReturnStatusEnum RecomputeReturnStatus(PurchaseReturn purchaseReturn)
        {
            if (IsTerminal(purchaseReturn.Status))
                return purchaseReturn.Status;

            var totalClaimed = purchaseReturn.ClaimedQuantity;
            var totalDecided = purchaseReturn.DecidedQuantity;

            if (totalDecided == 0)
                return ReturnStatusEnum.OPEN;

            var hasPending = purchaseReturn.AllEffects.Any(e => e.Status == ReturnEffectStatusEnum.PENDING);

            if (totalDecided >= totalClaimed && !hasPending)
                return ReturnStatusEnum.SETTLED;

            return ReturnStatusEnum.IN_PROGRESS;
        }

        // Off-order claims (Scope == OFF_ORDER, i.e. OffScopeKind.HasValue) never consume a line's
        // quota - EXCESS/UNLISTED goods are, by definition, outside what the line ever ordered.
        public int GetOpenClaimQuantity(int purchaseItemId, List<PurchaseReturn> activeReturns)
        {
            if (activeReturns == null || activeReturns.Count == 0)
                return 0;

            return activeReturns
                .SelectMany(r => r.Claims)
                .Where(c => c.OffScopeKind == null && c.PurchaseItemId == purchaseItemId)
                .Sum(c => c.RemainingQuantity);
        }

        public int GetClaimableQuantity(PurchaseItem item, List<PurchaseReturn> activeReturns)
        {
            var budget = item.ReceivedQuantity - item.SettledQuantity;
            var openClaim = GetOpenClaimQuantity(item.Id, activeReturns);
            return Math.Max(0, budget - openClaim);
        }

        // Deliberately decoupled from return activity: whether a purchase's receiving is complete is
        // a question about ReceivedQuantity vs ordered Quantity alone. A still-open return claim
        // against already-received goods does not block RECEIVED - the two concerns are independent.
        public PurchaseStatusEnum RecomputePurchaseStatus(Purchase purchase)
        {
            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                return PurchaseStatusEnum.CANCELLED;

            var fullyReceived = purchase.Items.All(i => i.ReceivedQuantity >= i.Quantity);

            if (fullyReceived)
                return PurchaseStatusEnum.RECEIVED;

            if (purchase.Items.Any(i => i.ReceivedQuantity > 0))
                return PurchaseStatusEnum.PARTIALLY_RECEIVED;

            return purchase.Status;
        }

        public List<PurchaseReturnEffect> ExpandComposition(EffectCompositionDto composition, DateTime now)
        {
            var effects = new List<PurchaseReturnEffect>();

            if (composition.GoodsIn is { Quantity: > 0 } goodsIn)
            {
                effects.Add(new PurchaseReturnEffect
                {
                    Kind = ReturnEffectKindEnum.GOODS_IN,
                    Quantity = goodsIn.Quantity,
                    ProductId = goodsIn.ProductId,
                    Status = ReturnEffectStatusEnum.PENDING,
                    CreatedAt = now,
                });
            }

            if (composition.GoodsOut is { Quantity: > 0 } goodsOut)
            {
                effects.Add(new PurchaseReturnEffect
                {
                    Kind = ReturnEffectKindEnum.GOODS_OUT,
                    Quantity = goodsOut.Quantity,
                    ProductId = goodsOut.ProductId,
                    Status = ReturnEffectStatusEnum.PENDING,
                    CreatedAt = now,
                });
            }

            if (composition.Money is { Amount: > 0 } money)
            {
                var effect = new PurchaseReturnEffect
                {
                    Kind = money.Kind,
                    Amount = money.Amount,
                    Method = money.Method,
                    Reference = money.Reference,
                    Status = ReturnEffectStatusEnum.APPLIED,
                    CreatedAt = now,
                    AppliedAt = now,
                };

                if (money.Method == ReturnPaymentMethodEnum.MIXED && money.Parts != null)
                {
                    effect.MoneyParts = money.Parts.Select(p => new PurchaseReturnEffectMoneyPart
                    {
                        Method = p.Method,
                        Amount = p.Amount,
                        CheckNumber = p.CheckNumber,
                        TransferRef = p.TransferRef,
                    }).ToList();
                }

                effects.Add(effect);
            }

            return effects;
        }
    }
}
