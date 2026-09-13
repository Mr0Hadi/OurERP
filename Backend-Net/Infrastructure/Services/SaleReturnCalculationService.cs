using Application.Common.Contracts.SaleReturn;
using Application.Common.Dtos.Returns;
using Application.Common.Enums;
using Application.Common.Returns;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;

namespace Infrastructure.Services
{
    public class SaleReturnCalculationService : ISaleReturnCalculationService
    {
        private static readonly HashSet<ReturnStatusEnum> TerminalReturnStatuses = new()
        {
            ReturnStatusEnum.REJECTED,
            ReturnStatusEnum.CANCELLED,
        };

        public bool IsTerminal(ReturnStatusEnum status) => TerminalReturnStatuses.Contains(status);

        // The matrix itself lives in ReturnLifecycleRules so both return sides share one copy; this
        // service only supplies the two facts it needs from the loaded graph.
        public string? GetLifecycleBlocker(SaleReturn saleReturn, ReturnLifecycleActionEnum action) =>
            ReturnLifecycleRules.GetBlocker(saleReturn.Status, HasMovedGoods(saleReturn), HasRecordedMoney(saleReturn), action);

        public bool CanPerform(SaleReturn saleReturn, ReturnLifecycleActionEnum action) =>
            GetLifecycleBlocker(saleReturn, action) == null;

        // AppliedQuantity, not Status == APPLIED: a goods effect with 1 of 3 units moved is still
        // PENDING, and the old APPLIED-only test let such a return be cancelled with stock changed.
        public bool HasMovedGoods(SaleReturn saleReturn) =>
            saleReturn.AllEffects.Any(e => e.Direction is ReturnEffectDirectionEnum.GOODS_IN or ReturnEffectDirectionEnum.GOODS_OUT && e.AppliedQuantity > 0);

        public bool HasRecordedMoney(SaleReturn saleReturn) =>
            saleReturn.AllEffects.Any(e => e.Direction is ReturnEffectDirectionEnum.MONEY_IN or ReturnEffectDirectionEnum.MONEY_OUT);

        public ReturnStatusEnum RecomputeReturnStatus(SaleReturn saleReturn)
        {
            if (IsTerminal(saleReturn.Status))
                return saleReturn.Status;

            var totalClaimed = saleReturn.Quantity;
            var totalDecided = saleReturn.DecidedQuantity;

            if (totalDecided == 0)
                return ReturnStatusEnum.OPEN;

            var hasPending = saleReturn.AllEffects.Any(e => e.Status == ReturnEffectStatusEnum.PENDING);

            if (totalDecided >= totalClaimed && !hasPending)
                return ReturnStatusEnum.SETTLED;

            return ReturnStatusEnum.IN_PROGRESS;
        }

        // Off-order claims never consume a line's quota - EXCESS/UNLISTED goods are, by definition,
        // outside what the line ever shipped. EXCESS does carry its line reference (for pricing), so
        // this must key on Scope rather than on the line id being non-null: OnOrder*ItemId is the
        // line id for ON_ORDER claims only.
        //
        // Soft-deleted and terminal returns are filtered here rather than trusted from the caller.
        // Every caller today passes ISaleReturnRepository.GetActiveBySaleIdAsync, which already
        // filters both, but a quota that silently over-counts is a bad thing to leave resting on
        // the caller getting its query right.
        public int GetOpenClaimQuantity(int saleItemId, List<SaleReturn> activeReturns)
        {
            if (activeReturns == null || activeReturns.Count == 0)
                return 0;

            return activeReturns
                .Where(r => r.IsActive && !IsTerminal(r.Status))
                .SelectMany(r => r.Claims)
                .Where(c => c.OnOrderSaleItemId == saleItemId)
                .Sum(c => c.RemainingQuantity);
        }

        public int GetClaimableQuantity(SaleItem item, List<SaleReturn> activeReturns)
        {
            var budget = item.ShippedQuantity - item.SettledQuantity;
            var openClaim = GetOpenClaimQuantity(item.Id, activeReturns);
            return Math.Max(0, budget - openClaim);
        }

        public SalesStatusEnum RecomputeSaleStatus(Sale sale)
        {
            if (sale.Status == SalesStatusEnum.CANCELLED)
                return SalesStatusEnum.CANCELLED;

            var fullyReturned = sale.Items.Count > 0 &&
                sale.Items.All(i => i.ShippedQuantity > 0 && i.SettledQuantity >= i.ShippedQuantity);

            if (fullyReturned)
                return SalesStatusEnum.RETURNED;

            return sale.Status;
        }

        public List<SaleReturnEffect> ExpandComposition(EffectCompositionDto composition, DateTime now)
        {
            var effects = new List<SaleReturnEffect>();

            AddGoods(composition.GoodsIn, ReturnEffectDirectionEnum.GOODS_IN);
            AddGoods(composition.GoodsOut, ReturnEffectDirectionEnum.GOODS_OUT);

            void AddGoods(List<GoodsEffectDto>? items, ReturnEffectDirectionEnum direction)
            {
                if (items == null)
                    return;

                foreach (var item in items.Where(i => i.Quantity > 0))
                {
                    effects.Add(new SaleReturnEffect
                    {
                        Direction = direction,
                        Quantity = item.Quantity,
                        ProductId = item.ProductId,
                        UnitPrice = item.UnitPrice,
                        UnitCost = item.UnitCost,
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

                var effect = new SaleReturnEffect
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
                    effect.MoneyParts = money.Parts!.Select(p => new SaleReturnEffectMoneyPart
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
