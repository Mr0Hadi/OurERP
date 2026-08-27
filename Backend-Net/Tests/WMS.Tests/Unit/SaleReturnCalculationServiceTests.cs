using Application.Common.Dtos.Returns;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Services;

namespace WMS.Tests.Unit
{
    public class SaleReturnCalculationServiceTests
    {
        private readonly SaleReturnCalculationService _sut = new();

        [Theory]
        [InlineData(ReturnStatusEnum.REJECTED, true)]
        [InlineData(ReturnStatusEnum.CANCELLED, true)]
        [InlineData(ReturnStatusEnum.OPEN, false)]
        [InlineData(ReturnStatusEnum.IN_PROGRESS, false)]
        [InlineData(ReturnStatusEnum.SETTLED, false)]
        public void IsTerminal_OnlyRejectedAndCancelledAreTerminal(ReturnStatusEnum status, bool expected)
        {
            Assert.Equal(expected, _sut.IsTerminal(status));
        }

        [Fact]
        public void IsUntouched_NoEffects_IsTrue()
        {
            var saleReturn = new SaleReturn { Claims = { new SaleReturnClaim { Quantity = 5 } } };

            Assert.True(_sut.IsUntouched(saleReturn));
        }

        [Fact]
        public void IsUntouched_HasAppliedEffect_IsFalse()
        {
            var saleReturn = new SaleReturn
            {
                Claims =
                {
                    new SaleReturnClaim
                    {
                        Quantity = 5,
                        Resolutions = { new SaleReturnResolution { Quantity = 5, Effects = { new SaleReturnEffect { Status = ReturnEffectStatusEnum.APPLIED } } } },
                    },
                },
            };

            Assert.False(_sut.IsUntouched(saleReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_NoResolutions_IsOpen()
        {
            var saleReturn = new SaleReturn { Claims = { new SaleReturnClaim { Quantity = 5 } } };

            Assert.Equal(ReturnStatusEnum.OPEN, _sut.RecomputeReturnStatus(saleReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_PartiallyDecided_IsInProgress()
        {
            var saleReturn = new SaleReturn
            {
                Claims =
                {
                    new SaleReturnClaim
                    {
                        Quantity = 5,
                        Resolutions = { new SaleReturnResolution { Quantity = 2, Effects = { new SaleReturnEffect { Status = ReturnEffectStatusEnum.APPLIED } } } },
                    },
                },
            };

            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, _sut.RecomputeReturnStatus(saleReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_FullyDecidedButEffectStillPending_IsInProgress()
        {
            var saleReturn = new SaleReturn
            {
                Claims =
                {
                    new SaleReturnClaim
                    {
                        Quantity = 5,
                        Resolutions = { new SaleReturnResolution { Quantity = 5, Effects = { new SaleReturnEffect { Status = ReturnEffectStatusEnum.PENDING } } } },
                    },
                },
            };

            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, _sut.RecomputeReturnStatus(saleReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_FullyDecidedAndApplied_IsSettled()
        {
            var saleReturn = new SaleReturn
            {
                Claims =
                {
                    new SaleReturnClaim
                    {
                        Quantity = 5,
                        Resolutions = { new SaleReturnResolution { Quantity = 5, Effects = { new SaleReturnEffect { Status = ReturnEffectStatusEnum.APPLIED } } } },
                    },
                },
            };

            Assert.Equal(ReturnStatusEnum.SETTLED, _sut.RecomputeReturnStatus(saleReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_MoneyOnlyResolution_GoesStraightToSettled()
        {
            var saleReturn = new SaleReturn
            {
                Claims =
                {
                    new SaleReturnClaim
                    {
                        Quantity = 3,
                        Resolutions = { new SaleReturnResolution { Quantity = 3, Effects = { new SaleReturnEffect { Kind = ReturnEffectKindEnum.MONEY_OUT, Status = ReturnEffectStatusEnum.APPLIED } } } },
                    },
                },
            };

            Assert.Equal(ReturnStatusEnum.SETTLED, _sut.RecomputeReturnStatus(saleReturn));
        }

        [Fact]
        public void GetOpenClaimQuantity_NoActiveReturns_IsZero()
        {
            Assert.Equal(0, _sut.GetOpenClaimQuantity(1, new List<SaleReturn>()));
        }

        [Fact]
        public void GetOpenClaimQuantity_SumsAcrossMultipleActiveReturns()
        {
            var activeReturns = new List<SaleReturn>
            {
                new() { Claims = { new SaleReturnClaim { SaleItemId = 1, Quantity = 3 } } },
                new() { Claims = { new SaleReturnClaim { SaleItemId = 1, Quantity = 4 } } },
                new() { Claims = { new SaleReturnClaim { SaleItemId = 2, Quantity = 100 } } },
            };

            Assert.Equal(7, _sut.GetOpenClaimQuantity(1, activeReturns));
        }

        [Fact]
        public void GetOpenClaimQuantity_OffScopeClaimsNeverCount()
        {
            var activeReturns = new List<SaleReturn>
            {
                new() { Claims = { new SaleReturnClaim { SaleItemId = null, OffScopeKind = ReturnOffScopeKindEnum.EXCESS, Quantity = 10 } } },
            };

            Assert.Equal(0, _sut.GetOpenClaimQuantity(1, activeReturns));
        }

        [Fact]
        public void GetClaimableQuantity_SubtractsSettledAndOpenClaims()
        {
            var item = new SaleItem { Id = 1, ShippedQuantity = 10, SettledQuantity = 2 };
            var activeReturns = new List<SaleReturn>
            {
                new() { Claims = { new SaleReturnClaim { SaleItemId = 1, Quantity = 3 } } },
            };

            Assert.Equal(5, _sut.GetClaimableQuantity(item, activeReturns));
        }

        [Fact]
        public void GetClaimableQuantity_NeverGoesNegative()
        {
            var item = new SaleItem { Id = 1, ShippedQuantity = 5, SettledQuantity = 5 };
            var activeReturns = new List<SaleReturn>
            {
                new() { Claims = { new SaleReturnClaim { SaleItemId = 1, Quantity = 3 } } },
            };

            Assert.Equal(0, _sut.GetClaimableQuantity(item, activeReturns));
        }

        [Fact]
        public void RecomputeSaleStatus_Cancelled_StaysCancelled()
        {
            var sale = new Sale { Status = SalesStatusEnum.CANCELLED, Items = new() { new SaleItem { ShippedQuantity = 5, SettledQuantity = 5 } } };

            Assert.Equal(SalesStatusEnum.CANCELLED, _sut.RecomputeSaleStatus(sale));
        }

        [Fact]
        public void RecomputeSaleStatus_EveryShippedUnitSettled_BecomesReturned()
        {
            var sale = new Sale
            {
                Status = SalesStatusEnum.SHIPPED,
                Items = new() { new SaleItem { ShippedQuantity = 5, SettledQuantity = 5 } },
            };

            Assert.Equal(SalesStatusEnum.RETURNED, _sut.RecomputeSaleStatus(sale));
        }

        [Fact]
        public void RecomputeSaleStatus_PartiallySettled_KeepsOriginalStatus()
        {
            var sale = new Sale
            {
                Status = SalesStatusEnum.SHIPPED,
                Items = new() { new SaleItem { ShippedQuantity = 5, SettledQuantity = 2 } },
            };

            Assert.Equal(SalesStatusEnum.SHIPPED, _sut.RecomputeSaleStatus(sale));
        }

        [Fact]
        public void RecomputeSaleStatus_ItemNeverShipped_IsNotConsideredFullyReturned()
        {
            var sale = new Sale
            {
                Status = SalesStatusEnum.PENDING,
                Items = new() { new SaleItem { ShippedQuantity = 0, SettledQuantity = 0 } },
            };

            Assert.Equal(SalesStatusEnum.PENDING, _sut.RecomputeSaleStatus(sale));
        }

        [Fact]
        public void ExpandComposition_GoodsInOnly_ProducesOnePendingEffect()
        {
            var composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new GoodsEffectDto { Quantity = 3 } };

            var effects = _sut.ExpandComposition(composition, DateTime.Now);

            var effect = Assert.Single(effects);
            Assert.Equal(ReturnEffectKindEnum.GOODS_IN, effect.Kind);
            Assert.Equal(3, effect.Quantity);
            Assert.Equal(ReturnEffectStatusEnum.PENDING, effect.Status);
        }

        [Fact]
        public void ExpandComposition_MoneyOnly_ProducesOneAppliedEffect()
        {
            var composition = new EffectCompositionDto
            {
                Quantity = 2,
                Money = new MoneyEffectDto { Kind = ReturnEffectKindEnum.MONEY_OUT, Method = ReturnPaymentMethodEnum.STORE_CREDIT, Amount = 200 },
            };

            var effects = _sut.ExpandComposition(composition, DateTime.Now);

            var effect = Assert.Single(effects);
            Assert.Equal(ReturnEffectKindEnum.MONEY_OUT, effect.Kind);
            Assert.Equal(200UL, effect.Amount);
            Assert.Equal(ReturnEffectStatusEnum.APPLIED, effect.Status);
            Assert.NotNull(effect.AppliedAt);
        }

        [Fact]
        public void ExpandComposition_GoodsAndMoneyTogether_ProducesBothEffects()
        {
            var composition = new EffectCompositionDto
            {
                Quantity = 2,
                GoodsOut = new GoodsEffectDto { Quantity = 2 },
                Money = new MoneyEffectDto { Kind = ReturnEffectKindEnum.MONEY_IN, Method = ReturnPaymentMethodEnum.CASH, Amount = 50 },
            };

            var effects = _sut.ExpandComposition(composition, DateTime.Now);

            Assert.Equal(2, effects.Count);
            Assert.Contains(effects, e => e.Kind == ReturnEffectKindEnum.GOODS_OUT);
            Assert.Contains(effects, e => e.Kind == ReturnEffectKindEnum.MONEY_IN);
        }
    }
}
