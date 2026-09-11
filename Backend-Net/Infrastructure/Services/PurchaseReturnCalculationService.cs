using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Dtos.Returns;
using Common.Exceptions;
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

        public bool CanReopen(ReturnStatusEnum status) => status == ReturnStatusEnum.REJECTED;

        // Money effects are born APPLIED (see ExpandComposition), so a resolution that carries any
        // money marks the return as touched and locks cancel/reject/delete from that moment on.
        // That is intentional: money has already moved, there is nothing left to un-do cheaply.
        public bool IsUntouched(PurchaseReturn purchaseReturn) =>
            !purchaseReturn.AllEffects.Any(e => e.Status == ReturnEffectStatusEnum.APPLIED);

        public ReturnStatusEnum RecomputeReturnStatus(PurchaseReturn purchaseReturn)
        {
            if (IsTerminal(purchaseReturn.Status))
                return purchaseReturn.Status;

            var totalClaimed = purchaseReturn.Quantity;
            var totalDecided = purchaseReturn.DecidedQuantity;

            if (totalDecided == 0)
                return ReturnStatusEnum.OPEN;

            var hasPending = purchaseReturn.AllEffects.Any(e => e.Status == ReturnEffectStatusEnum.PENDING);

            if (totalDecided >= totalClaimed && !hasPending)
                return ReturnStatusEnum.SETTLED;

            return ReturnStatusEnum.IN_PROGRESS;
        }

        // Off-order claims never consume a line's quota - EXCESS/UNLISTED goods are, by definition,
        // outside what the line ever ordered. Filtered on Scope, the explicit field, rather than on
        // OffScopeKind being null: the two are meant to agree, and a quota is the wrong place to
        // depend on that.
        //
        // Soft-deleted and terminal returns are filtered here rather than trusted from the caller.
        // Every caller today passes IPurchaseReturnRepository.GetActiveByPurchaseIdAsync, which
        // already filters both, but a quota that silently over-counts is a bad thing to leave
        // resting on the caller getting its query right.
        public int GetOpenClaimQuantity(int purchaseItemId, List<PurchaseReturn> activeReturns)
        {
            if (activeReturns == null || activeReturns.Count == 0)
                return 0;

            return activeReturns
                .Where(r => r.IsActive && !IsTerminal(r.Status))
                .SelectMany(r => r.Claims)
                .Where(c => c.Scope != ReturnClaimScopeEnum.OFF_ORDER && c.PurchaseItemId == purchaseItemId)
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

            // All() on an empty sequence is true, so a purchase carrying no items at all would
            // otherwise come out RECEIVED. Nothing has been received; leave its own status alone.
            if (purchase.Items.Count == 0)
                return purchase.Status;

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

            AddGoods(composition.GoodsIn, ReturnEffectDirectionEnum.GOODS_IN);
            AddGoods(composition.GoodsOut, ReturnEffectDirectionEnum.GOODS_OUT);

            void AddGoods(List<GoodsEffectDto>? items, ReturnEffectDirectionEnum direction)
            {
                if (items == null)
                    return;

                foreach (var item in items.Where(i => i.Quantity > 0))
                {
                    effects.Add(new PurchaseReturnEffect
                    {
                        Direction = direction,
                        Quantity = item.Quantity,
                        ProductId = item.ProductId,
                        Status = ReturnEffectStatusEnum.PENDING,
                        CreatedAt = now,
                    });
                }
            }

            AddMoney(composition.MoneyIn, ReturnEffectDirectionEnum.MONEY_IN);
            AddMoney(composition.MoneyOut, ReturnEffectDirectionEnum.MONEY_OUT);

            void AddMoney(MoneyEffectDto? money, ReturnEffectDirectionEnum direction)
            {
                if (money is not { Amount: > 0 })
                    return;

                ValidateMoney(money);

                var effect = new PurchaseReturnEffect
                {
                    Direction = direction,
                    Amount = money.Amount,
                    Method = money.Method,
                    Reference = money.Reference,
                    Status = ReturnEffectStatusEnum.APPLIED,
                    CreatedAt = now,
                    AppliedAt = now,
                };

                if (money.Method == ReturnPaymentMethodEnum.MIXED)
                {
                    effect.MoneyParts = money.Parts!.Select(p => new PurchaseReturnEffectMoneyPart
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

        // Last line of defence; AddClaimResolutionCommandValidator rejects these first, so a
        // request never reaches here. Kept because ExpandComposition is the single place that turns
        // a composition into rows, and a malformed money effect persisted is a money effect nobody
        // can reconcile later.
        private static void ValidateMoney(MoneyEffectDto money)
        {
            var isMixed = money.Method == ReturnPaymentMethodEnum.MIXED;
            var parts = money.Parts;

            if (isMixed && (parts == null || parts.Count == 0))
                throw new ValidationCustomException("پرداخت ترکیبی باید حداقل یک بخش داشته باشد.");

            if (!isMixed && parts != null && parts.Count > 0)
                throw new ValidationCustomException("بخش‌های پرداخت فقط برای پرداخت ترکیبی مجاز است.");

            if (isMixed && parts!.Aggregate(0UL, (sum, p) => sum + p.Amount) != money.Amount)
                throw new ValidationCustomException("مجموع بخش‌های پرداخت باید برابر مبلغ کل باشد.");
        }
    }
}
