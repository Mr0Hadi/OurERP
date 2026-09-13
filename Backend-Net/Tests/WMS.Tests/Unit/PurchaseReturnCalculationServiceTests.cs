using Application.Common.Dtos.Returns;
using Common.Exceptions;
using Application.Common.Enums;
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

        private static PurchaseReturn WithEffects(ReturnStatusEnum status, params PurchaseReturnEffect[] effects) => new()
        {
            Status = status,
            Claims =
            {
                new PurchaseReturnClaim
                {
                    Quantity = 5,
                    Resolutions = { new PurchaseReturnResolution { Quantity = 5, Effects = effects.ToList() } },
                },
            },
        };

        [Theory]
        [InlineData(ReturnLifecycleActionEnum.CANCEL)]
        [InlineData(ReturnLifecycleActionEnum.REJECT)]
        [InlineData(ReturnLifecycleActionEnum.DELETE)]
        public void GetLifecycleBlocker_OpenWithNoEffects_AllowsCancelRejectDelete(ReturnLifecycleActionEnum action)
        {
            Assert.Null(_sut.GetLifecycleBlocker(WithEffects(ReturnStatusEnum.OPEN), action));
        }

        [Fact]
        public void GetLifecycleBlocker_PendingGoodsNothingMoved_AllowsCancel()
        {
            var purchaseReturn = WithEffects(ReturnStatusEnum.IN_PROGRESS, new PurchaseReturnEffect { Direction = ReturnEffectDirectionEnum.GOODS_IN, Quantity = 5, Status = ReturnEffectStatusEnum.PENDING });

            Assert.Null(_sut.GetLifecycleBlocker(purchaseReturn, ReturnLifecycleActionEnum.CANCEL));
        }

        [Fact]
        public void GetLifecycleBlocker_PartiallyMovedGoods_BlocksEvenThoughEffectIsPending()
        {
            var purchaseReturn = WithEffects(ReturnStatusEnum.IN_PROGRESS, new PurchaseReturnEffect { Direction = ReturnEffectDirectionEnum.GOODS_OUT, Quantity = 5, AppliedQuantity = 1, Status = ReturnEffectStatusEnum.PENDING });

            Assert.True(_sut.HasMovedGoods(purchaseReturn));
            Assert.Contains("کالا", _sut.GetLifecycleBlocker(purchaseReturn, ReturnLifecycleActionEnum.CANCEL));
        }

        [Fact]
        public void GetLifecycleBlocker_RecordedMoney_BlocksAndPointsAtRemovingTheResolution()
        {
            var purchaseReturn = WithEffects(ReturnStatusEnum.IN_PROGRESS, new PurchaseReturnEffect { Direction = ReturnEffectDirectionEnum.MONEY_IN, Amount = 100, Status = ReturnEffectStatusEnum.APPLIED });

            var blocker = _sut.GetLifecycleBlocker(purchaseReturn, ReturnLifecycleActionEnum.REJECT);
            Assert.Contains("اثر مالی", blocker);
            Assert.Contains("حذف کنید", blocker);
        }

        [Theory]
        [InlineData(ReturnStatusEnum.REJECTED, ReturnLifecycleActionEnum.CANCEL, "بازگشایی")]
        [InlineData(ReturnStatusEnum.REJECTED, ReturnLifecycleActionEnum.REJECT, "قبلاً رد شده")]
        [InlineData(ReturnStatusEnum.REJECTED, ReturnLifecycleActionEnum.DELETE, "بازگشایی")]
        [InlineData(ReturnStatusEnum.CANCELLED, ReturnLifecycleActionEnum.CANCEL, "قبلاً لغو شده")]
        [InlineData(ReturnStatusEnum.CANCELLED, ReturnLifecycleActionEnum.REOPEN, "قبلاً لغو شده")]
        [InlineData(ReturnStatusEnum.SETTLED, ReturnLifecycleActionEnum.DELETE, "تسویه شده")]
        [InlineData(ReturnStatusEnum.OPEN, ReturnLifecycleActionEnum.REOPEN, "در انتظار تصمیم")]
        [InlineData(ReturnStatusEnum.IN_PROGRESS, ReturnLifecycleActionEnum.REOPEN, "در حال اجرا")]
        public void GetLifecycleBlocker_RefusalNamesTheActualStatus(ReturnStatusEnum status, ReturnLifecycleActionEnum action, string expectedFragment)
        {
            var blocker = _sut.GetLifecycleBlocker(WithEffects(status), action);

            Assert.NotNull(blocker);
            Assert.Contains(expectedFragment, blocker);
            Assert.DoesNotContain("دست‌نخورده", blocker);
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
                        Resolutions = { new PurchaseReturnResolution { Quantity = 3, Effects = { new PurchaseReturnEffect { Direction = ReturnEffectDirectionEnum.MONEY_OUT, Status = ReturnEffectStatusEnum.APPLIED } } } },
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
                Claims = { new PurchaseReturnClaim { Scope = ReturnClaimScopeEnum.OFF_ORDER, PurchaseItemId = null, OffScopeKind = ReturnOffScopeKindEnum.EXCESS, Quantity = 10 } },
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
        public void GetOpenClaimQuantity_TerminalReturnsNeverCount()
        {
            // The quota filters these itself rather than trusting the caller's query.
            var rejected = new PurchaseReturn
            {
                Status = ReturnStatusEnum.REJECTED,
                Claims = { new PurchaseReturnClaim { PurchaseItemId = 1, Quantity = 10 } },
            };
            var deleted = new PurchaseReturn
            {
                IsActive = false,
                Claims = { new PurchaseReturnClaim { PurchaseItemId = 1, Quantity = 10 } },
            };

            Assert.Equal(0, _sut.GetOpenClaimQuantity(1, new() { rejected, deleted }));
        }

        [Theory]
        [InlineData(ReturnStatusEnum.REJECTED, true)]
        [InlineData(ReturnStatusEnum.CANCELLED, false)]
        [InlineData(ReturnStatusEnum.OPEN, false)]
        [InlineData(ReturnStatusEnum.IN_PROGRESS, false)]
        [InlineData(ReturnStatusEnum.SETTLED, false)]
        public void CanPerform_Reopen_OnlyRejected(ReturnStatusEnum status, bool expected)
        {
            Assert.Equal(expected, _sut.CanPerform(WithEffects(status), ReturnLifecycleActionEnum.REOPEN));
        }

        [Fact]
        public void RecomputePurchaseStatus_NoItems_KeepsOriginalStatus()
        {
            // All() over an empty sequence is true, which used to make an item-less purchase RECEIVED.
            var purchase = new Purchase { Status = PurchaseStatusEnum.PENDING, Items = new() };

            Assert.Equal(PurchaseStatusEnum.PENDING, _sut.RecomputePurchaseStatus(purchase));
        }

        [Fact]
        public void ExpandComposition_MixedPartsNotSummingToAmount_Throws()
        {
            var composition = new EffectCompositionDto
            {
                Quantity = 1,
                MoneyOut = new MoneyEffectDto
                {
                    Method = ReturnPaymentMethodEnum.MIXED,
                    Amount = 100,
                    Parts = new() { new MoneyPartDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 40 } },
                },
            };

            Assert.Throws<ValidationCustomException>(() => _sut.ExpandComposition(composition, DateTime.Now));
        }

        [Fact]
        public void ExpandComposition_PartsOnNonMixedPayment_Throws()
        {
            // These used to be dropped silently, so the persisted effect disagreed with the request.
            var composition = new EffectCompositionDto
            {
                Quantity = 1,
                MoneyOut = new MoneyEffectDto
                {
                    Method = ReturnPaymentMethodEnum.CASH,
                    Amount = 100,
                    Parts = new() { new MoneyPartDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 100 } },
                },
            };

            Assert.Throws<ValidationCustomException>(() => _sut.ExpandComposition(composition, DateTime.Now));
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
            var composition = new EffectCompositionDto { Quantity = 3, GoodsIn = new() { new GoodsEffectDto { Quantity = 3 } } };

            var effects = _sut.ExpandComposition(composition, DateTime.Now);

            var effect = Assert.Single(effects);
            Assert.Equal(ReturnEffectDirectionEnum.GOODS_IN, effect.Direction);
            Assert.Equal(3, effect.Quantity);
            Assert.Equal(ReturnEffectStatusEnum.PENDING, effect.Status);
        }

        [Fact]
        public void ExpandComposition_MoneyOnly_ProducesOneAppliedEffect()
        {
            var composition = new EffectCompositionDto
            {
                Quantity = 2,
                MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 200 },
            };

            var effects = _sut.ExpandComposition(composition, DateTime.Now);

            var effect = Assert.Single(effects);
            Assert.Equal(ReturnEffectDirectionEnum.MONEY_OUT, effect.Direction);
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
                MoneyOut = new MoneyEffectDto
                {
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
                GoodsOut = new() { new GoodsEffectDto { Quantity = 2 } },
                MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 50 },
            };

            var effects = _sut.ExpandComposition(composition, DateTime.Now);

            Assert.Equal(2, effects.Count);
            Assert.Contains(effects, e => e.Direction == ReturnEffectDirectionEnum.GOODS_OUT);
            Assert.Contains(effects, e => e.Direction == ReturnEffectDirectionEnum.MONEY_IN);
        }

        [Fact]
        public void ExpandComposition_MultipleGoodsInItems_ProducesOneEffectPerItem()
        {
            // A replacement split across two different products - one resolution, one direction,
            // more than one product moving.
            var composition = new EffectCompositionDto
            {
                Quantity = 5,
                GoodsIn = new()
                {
                    new GoodsEffectDto { Quantity = 3, ProductId = 10 },
                    new GoodsEffectDto { Quantity = 2, ProductId = 20 },
                },
            };

            var effects = _sut.ExpandComposition(composition, DateTime.Now);

            Assert.Equal(2, effects.Count);
            Assert.All(effects, e => Assert.Equal(ReturnEffectDirectionEnum.GOODS_IN, e.Direction));
            Assert.Contains(effects, e => e.ProductId == 10 && e.Quantity == 3);
            Assert.Contains(effects, e => e.ProductId == 20 && e.Quantity == 2);
            Assert.Equal(5, effects.Sum(e => e.Quantity));
        }
    }
}
