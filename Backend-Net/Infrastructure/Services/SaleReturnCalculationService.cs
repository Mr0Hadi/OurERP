using Application.Common.Contracts.SaleReturn;
using Application.Common.Dtos.Returns;
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

        public bool IsUntouched(SaleReturn saleReturn) =>
            !saleReturn.AllEffects.Any(e => e.Status == ReturnEffectStatusEnum.APPLIED);

        public ReturnStatusEnum RecomputeReturnStatus(SaleReturn saleReturn)
        {
            if (IsTerminal(saleReturn.Status))
                return saleReturn.Status;

            var totalClaimed = saleReturn.ClaimedQuantity;
            var totalDecided = saleReturn.DecidedQuantity;

            if (totalDecided == 0)
                return ReturnStatusEnum.OPEN;

            var hasPending = saleReturn.AllEffects.Any(e => e.Status == ReturnEffectStatusEnum.PENDING);

            if (totalDecided >= totalClaimed && !hasPending)
                return ReturnStatusEnum.SETTLED;

            return ReturnStatusEnum.IN_PROGRESS;
        }

        // Off-order claims (Scope == OFF_ORDER, i.e. OffScopeKind.HasValue) never consume a line's
        // quota - EXCESS/UNLISTED goods are, by definition, outside what the line ever shipped.
        public int GetOpenClaimQuantity(int saleItemId, List<SaleReturn> activeReturns)
        {
            if (activeReturns == null || activeReturns.Count == 0)
                return 0;

            return activeReturns
                .SelectMany(r => r.Claims)
                .Where(c => c.OffScopeKind == null && c.SaleItemId == saleItemId)
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

            if (composition.GoodsIn is { Quantity: > 0 } goodsIn)
            {
                effects.Add(new SaleReturnEffect
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
                effects.Add(new SaleReturnEffect
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
                var effect = new SaleReturnEffect
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
                    effect.MoneyParts = money.Parts.Select(p => new SaleReturnEffectMoneyPart
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
