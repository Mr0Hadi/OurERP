using Application.Common.Dtos.Returns;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Services;

namespace WMS.Tests.Unit
{
    public class PurchaseReturnCalculationServiceTests
    {
        private readonly PurchaseReturnCalculationService _sut = new();

        private static PurchaseItem MakeItem(int ordered, int received = 0, int settled = 0) => new()
        {
            Id = 1,
            Quantity = ordered,
            ReceivedQuantity = received,
            SettledQuantity = settled,
            UnitPrice = 100,
        };

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
            var purchaseReturn = new PurchaseReturn { Claims = { new PurchaseReturnClaim { Quantity = 5 } } };

            Assert.True(_sut.IsUntouched(purchaseReturn));
        }

        [Fact]
        public void IsUntouched_HasAppliedEffect_IsFalse()
        {
            var purchaseReturn = new PurchaseReturn
            {
                Claims =
                {
                    new PurchaseReturnClaim
                    {
                        Quantity = 5,
                        Resolutions = { new PurchaseReturnResolution { Quantity = 5, Effects = { new PurchaseReturnEffect { Status = ReturnEffectStatusEnum.APPLIED } } } },
                    },
                },
            };

            Assert.False(_sut.IsUntouched(purchaseReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_NoResolutions_IsOpen()
        {
            var purchaseReturn = new PurchaseReturn
            {
                Claims = { new PurchaseReturnClaim { Quantity = 5 } },
            };

            Assert.Equal(ReturnStatusEnum.OPEN, _sut.RecomputeReturnStatus(purchaseReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_PartiallyDecided_IsInProgress()
        {
            var purchaseReturn = new PurchaseReturn
            {
                Claims =
                {
                    new PurchaseReturnClaim
                    {
                        Quantity = 5,
                        Resolutions = { new PurchaseReturnResolution { Quantity = 2, Effects = { new PurchaseReturnEffect { Status = ReturnEffectStatusEnum.APPLIED } } } },
                    },
                },
            };

            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, _sut.RecomputeReturnStatus(purchaseReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_FullyDecidedButEffectStillPending_IsInProgress()
        {
            var purchaseReturn = new PurchaseReturn
            {
                Claims =
                {
                    new PurchaseReturnClaim
                    {
                        Quantity = 5,
                        Resolutions = { new PurchaseReturnResolution { Quantity = 5, Effects = { new PurchaseReturnEffect { Status = ReturnEffectStatusEnum.PENDING } } } },
                    },
                },
            };

            Assert.Equal(ReturnStatusEnum.IN_PROGRESS, _sut.RecomputeReturnStatus(purchaseReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_FullyDecidedAndApplied_IsSettled()
        {
            var purchaseReturn = new PurchaseReturn
            {
                Claims =
                {
                    new PurchaseReturnClaim
                    {
                        Quantity = 5,
                        Resolutions = { new PurchaseReturnResolution { Quantity = 5, Effects = { new PurchaseReturnEffect { Status = ReturnEffectStatusEnum.APPLIED } } } },
                    },
                },
            };

            Assert.Equal(ReturnStatusEnum.SETTLED, _sut.RecomputeReturnStatus(purchaseReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_MoneyOnlyResolution_GoesStraightToSettled()
        {
            // Money effects apply immediately - a return whose only decision is a refund settles
            // without ever touching a goods round.
            var purchaseReturn = new PurchaseReturn
            {
                Claims =
                {
                    new PurchaseReturnClaim
                    {
                        Quantity = 3,
                        Resolutions = { new PurchaseReturnResolution { Quantity = 3, Effects = { new PurchaseReturnEffect { Kind = ReturnEffectKindEnum.MONEY_OUT, Status = ReturnEffectStatusEnum.APPLIED } } } },
                    },
                },
            };

            Assert.Equal(ReturnStatusEnum.SETTLED, _sut.RecomputeReturnStatus(purchaseReturn));
        }

        [Fact]
        public void GetOpenClaimQuantity_NoActiveReturns_IsZero()
        {
            Assert.Equal(0, _sut.GetOpenClaimQuantity(1, new()));
        }

        [Fact]
        public void GetOpenClaimQuantity_SubtractsDecidedFromClaimed()
        {
            var activeReturn = new PurchaseReturn
            {
                Claims = { new PurchaseReturnClaim { PurchaseItemId = 1, Quantity = 10, Resolutions = { new PurchaseReturnResolution { Quantity = 4 } } } },
            };

            Assert.Equal(6, _sut.GetOpenClaimQuantity(1, new() { activeReturn }));
        }

        [Fact]
        public void GetOpenClaimQuantity_OffScopeClaimsNeverCount()
        {
            var activeReturn = new PurchaseReturn
            {
                Claims = { new PurchaseReturnClaim { PurchaseItemId = null, OffScopeKind = ReturnOffScopeKindEnum.EXCESS, Quantity = 10 } },
            };

            Assert.Equal(0, _sut.GetOpenClaimQuantity(1, new() { activeReturn }));
        }

        [Fact]
        public void GetClaimableQuantity_NoActiveReturns_IsReceivedMinusSettled()
        {
            var item = MakeItem(ordered: 10, received: 8, settled: 2);

            Assert.Equal(6, _sut.GetClaimableQuantity(item, new()));
        }

        [Fact]
        public void GetClaimableQuantity_SubtractsOpenClaimQuantity()
        {
            var item = MakeItem(ordered: 10, received: 10, settled: 0);
            var activeReturn = new PurchaseReturn
            {
                Claims = { new PurchaseReturnClaim { PurchaseItemId = item.Id, Quantity = 4 } },
            };

            Assert.Equal(6, _sut.GetClaimableQuantity(item, new() { activeReturn }));
        }

        [Fact]
        public void GetClaimableQuantity_NeverGoesNegative()
        {
            var item = MakeItem(ordered: 5, received: 3, settled: 0);
            var activeReturn = new PurchaseReturn
            {
                Claims = { new PurchaseReturnClaim { PurchaseItemId = item.Id, Quantity = 5 } },
            };

            Assert.Equal(0, _sut.GetClaimableQuantity(item, new() { activeReturn }));
        }

        [Fact]
        public void RecomputePurchaseStatus_Cancelled_StaysCancelled()
        {
            var purchase = new Purchase { Status = PurchaseStatusEnum.CANCELLED, Items = new() { MakeItem(10, 10) } };

            Assert.Equal(PurchaseStatusEnum.CANCELLED, _sut.RecomputePurchaseStatus(purchase));
        }

        [Fact]
        public void RecomputePurchaseStatus_FullyReceived_IsReceived()
        {
            var purchase = new Purchase { Status = PurchaseStatusEnum.SHIPPED, Items = new() { MakeItem(10, received: 10) } };

            Assert.Equal(PurchaseStatusEnum.RECEIVED, _sut.RecomputePurchaseStatus(purchase));
        }

        [Fact]
        public void RecomputePurchaseStatus_PartiallyReceived_IsPartiallyReceived()
        {
            var purchase = new Purchase { Status = PurchaseStatusEnum.SHIPPED, Items = new() { MakeItem(10, received: 4) } };

            Assert.Equal(PurchaseStatusEnum.PARTIALLY_RECEIVED, _sut.RecomputePurchaseStatus(purchase));
        }

        [Fact]
        public void RecomputePurchaseStatus_NothingReceivedYet_KeepsOriginalStatus()
        {
            var purchase = new Purchase { Status = PurchaseStatusEnum.SHIPPED, Items = new() { MakeItem(10) } };

            Assert.Equal(PurchaseStatusEnum.SHIPPED, _sut.RecomputePurchaseStatus(purchase));
        }

        [Fact]
        public void RecomputePurchaseStatus_FullyReceivedWithOpenReturnClaim_StillReceived()
        {
            // Receiving progress and return activity are independent - an open claim against
            // already-received goods does not block RECEIVED.
            var item = MakeItem(10, received: 10);
            var purchase = new Purchase { Status = PurchaseStatusEnum.SHIPPED, Items = new() { item } };

            Assert.Equal(PurchaseStatusEnum.RECEIVED, _sut.RecomputePurchaseStatus(purchase));
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
                Money = new MoneyEffectDto { Kind = ReturnEffectKindEnum.MONEY_OUT, Method = ReturnPaymentMethodEnum.CASH, Amount = 200 },
            };

            var effects = _sut.ExpandComposition(composition, DateTime.Now);

            var effect = Assert.Single(effects);
            Assert.Equal(ReturnEffectKindEnum.MONEY_OUT, effect.Kind);
            Assert.Equal(200UL, effect.Amount);
            Assert.Equal(ReturnEffectStatusEnum.APPLIED, effect.Status);
            Assert.NotNull(effect.AppliedAt);
        }

        [Fact]
        public void ExpandComposition_MixedMoney_CarriesParts()
        {
            var composition = new EffectCompositionDto
            {
                Quantity = 1,
                Money = new MoneyEffectDto
                {
                    Kind = ReturnEffectKindEnum.MONEY_OUT,
                    Method = ReturnPaymentMethodEnum.MIXED,
                    Amount = 300,
                    Parts = new()
                    {
                        new MoneyPartDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 100 },
                        new MoneyPartDto { Method = ReturnPaymentMethodEnum.TRANSFER, Amount = 200 },
                    },
                },
            };

            var effects = _sut.ExpandComposition(composition, DateTime.Now);

            var effect = Assert.Single(effects);
            Assert.Equal(2, effect.MoneyParts.Count);
            Assert.Equal(300UL, (ulong)effect.MoneyParts.Sum(p => (long)p.Amount));
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
