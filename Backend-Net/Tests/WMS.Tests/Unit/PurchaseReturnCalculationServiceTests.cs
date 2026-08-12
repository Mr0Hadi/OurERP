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
        [InlineData(PurchaseReturnStatusEnum.REJECTED, true)]
        [InlineData(PurchaseReturnStatusEnum.CANCELLED, true)]
        [InlineData(PurchaseReturnStatusEnum.PENDING, false)]
        [InlineData(PurchaseReturnStatusEnum.COORDINATING, false)]
        [InlineData(PurchaseReturnStatusEnum.RESOLVED, false)]
        public void IsTerminal_OnlyRejectedAndCancelledAreTerminal(PurchaseReturnStatusEnum status, bool expected)
        {
            Assert.Equal(expected, _sut.IsTerminal(status));
        }

        [Theory]
        [InlineData(PurchaseIssueTypeEnum.SHORTAGE, PurchaseReturnDecisionTypeEnum.REFUND, true)]
        [InlineData(PurchaseIssueTypeEnum.SHORTAGE, PurchaseReturnDecisionTypeEnum.REPLACEMENT, true)]
        [InlineData(PurchaseIssueTypeEnum.SHORTAGE, PurchaseReturnDecisionTypeEnum.CREDIT, true)]
        [InlineData(PurchaseIssueTypeEnum.SHORTAGE, PurchaseReturnDecisionTypeEnum.WRITE_OFF, false)]
        [InlineData(PurchaseIssueTypeEnum.EXCESS, PurchaseReturnDecisionTypeEnum.REFUND, true)]
        [InlineData(PurchaseIssueTypeEnum.EXCESS, PurchaseReturnDecisionTypeEnum.CREDIT, true)]
        [InlineData(PurchaseIssueTypeEnum.EXCESS, PurchaseReturnDecisionTypeEnum.REPLACEMENT, false)]
        [InlineData(PurchaseIssueTypeEnum.EXCESS, PurchaseReturnDecisionTypeEnum.WRITE_OFF, false)]
        [InlineData(PurchaseIssueTypeEnum.DAMAGED, PurchaseReturnDecisionTypeEnum.WRITE_OFF, true)]
        [InlineData(PurchaseIssueTypeEnum.DEFECTIVE, PurchaseReturnDecisionTypeEnum.REPLACEMENT, true)]
        [InlineData(PurchaseIssueTypeEnum.EXPIRED, PurchaseReturnDecisionTypeEnum.CREDIT, true)]
        [InlineData(PurchaseIssueTypeEnum.OTHER, PurchaseReturnDecisionTypeEnum.REFUND, true)]
        public void IsValidDecision_FollowsTheDecisionMatrix(PurchaseIssueTypeEnum issue, PurchaseReturnDecisionTypeEnum decision, bool expected)
        {
            Assert.Equal(expected, _sut.IsValidDecision(issue, decision));
        }

        [Fact]
        public void RecomputeReturnStatus_NoDecisions_IsPending()
        {
            var purchaseReturn = new PurchaseReturn
            {
                Items = new() { new PurchaseReturnItem { Quantity = 5, Decisions = { } } },
            };

            Assert.Equal(PurchaseReturnStatusEnum.PENDING, _sut.RecomputeReturnStatus(purchaseReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_PartiallyDecided_IsCoordinating()
        {
            var purchaseReturn = new PurchaseReturn
            {
                Items =
                {
                    new PurchaseReturnItem
                    {
                        Quantity = 5,
                        Decisions = { new PurchaseReturnDecision { Quantity = 2, Status = PurchaseReturnDecisionStatusEnum.RESOLVED } },
                    },
                },
            };

            Assert.Equal(PurchaseReturnStatusEnum.COORDINATING, _sut.RecomputeReturnStatus(purchaseReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_FullyDecidedButAwaitingReplacement_IsCoordinating()
        {
            var purchaseReturn = new PurchaseReturn
            {
                Items =
                {
                    new PurchaseReturnItem
                    {
                        Quantity = 5,
                        Decisions = { new PurchaseReturnDecision { Quantity = 5, Status = PurchaseReturnDecisionStatusEnum.AWAITING } },
                    },
                },
            };

            Assert.Equal(PurchaseReturnStatusEnum.COORDINATING, _sut.RecomputeReturnStatus(purchaseReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_FullyDecidedAndResolved_IsResolved()
        {
            var purchaseReturn = new PurchaseReturn
            {
                Items =
                {
                    new PurchaseReturnItem
                    {
                        Quantity = 5,
                        Decisions = { new PurchaseReturnDecision { Quantity = 5, Status = PurchaseReturnDecisionStatusEnum.RESOLVED } },
                    },
                },
            };

            Assert.Equal(PurchaseReturnStatusEnum.RESOLVED, _sut.RecomputeReturnStatus(purchaseReturn));
        }

        [Fact]
        public void GetOpenIssueQuantity_NullActiveReturn_IsZero()
        {
            Assert.Equal(0, _sut.GetOpenIssueQuantity(1, null));
        }

        [Fact]
        public void GetOpenIssueQuantity_SubtractsDecidedFromReported()
        {
            var activeReturn = new PurchaseReturn
            {
                Items =
                {
                    new PurchaseReturnItem
                    {
                        PurchaseItemId = 1,
                        Quantity = 10,
                        Decisions = { new PurchaseReturnDecision { Quantity = 4 } },
                    },
                },
            };

            Assert.Equal(6, _sut.GetOpenIssueQuantity(1, activeReturn));
        }

        [Fact]
        public void GetReceivableQuantity_NoIssues_IsOrderedMinusReceivedMinusSettled()
        {
            var item = MakeItem(ordered: 10, received: 3, settled: 2);

            Assert.Equal(5, _sut.GetReceivableQuantity(item, null));
        }

        [Fact]
        public void GetReceivableQuantity_SubtractsOpenIssueQuantity()
        {
            var item = MakeItem(ordered: 10, received: 0, settled: 0);
            var activeReturn = new PurchaseReturn
            {
                Items = new() { new PurchaseReturnItem { PurchaseItemId = item.Id, Quantity = 4 } },
            };

            Assert.Equal(6, _sut.GetReceivableQuantity(item, activeReturn));
        }

        [Fact]
        public void GetReceivableQuantity_NeverGoesNegative()
        {
            var item = MakeItem(ordered: 5, received: 5, settled: 0);
            var activeReturn = new PurchaseReturn
            {
                Items = new() { new PurchaseReturnItem { PurchaseItemId = item.Id, Quantity = 3 } },
            };

            Assert.Equal(0, _sut.GetReceivableQuantity(item, activeReturn));
        }

        [Fact]
        public void RecomputePurchaseStatus_Cancelled_StaysCancelled()
        {
            var purchase = new Purchase { Status = PurchaseStatusEnum.CANCELLED, Items = new() { MakeItem(10, 10) } };

            Assert.Equal(PurchaseStatusEnum.CANCELLED, _sut.RecomputePurchaseStatus(purchase, null));
        }

        [Fact]
        public void RecomputePurchaseStatus_FullyAccountedNoOpenIssues_IsReceived()
        {
            var purchase = new Purchase { Status = PurchaseStatusEnum.SHIPPED, Items = new() { MakeItem(10, received: 10) } };

            Assert.Equal(PurchaseStatusEnum.RECEIVED, _sut.RecomputePurchaseStatus(purchase, null));
        }

        [Fact]
        public void RecomputePurchaseStatus_PartiallyReceived_IsPartiallyReceived()
        {
            var purchase = new Purchase { Status = PurchaseStatusEnum.SHIPPED, Items = new() { MakeItem(10, received: 4) } };

            Assert.Equal(PurchaseStatusEnum.PARTIALLY_RECEIVED, _sut.RecomputePurchaseStatus(purchase, null));
        }

        [Fact]
        public void RecomputePurchaseStatus_NothingReceivedYet_KeepsOriginalStatus()
        {
            var purchase = new Purchase { Status = PurchaseStatusEnum.SHIPPED, Items = new() { MakeItem(10) } };

            Assert.Equal(PurchaseStatusEnum.SHIPPED, _sut.RecomputePurchaseStatus(purchase, null));
        }

        [Fact]
        public void RecomputePurchaseStatus_FullyReceivedButOpenIssueRemains_IsNotReceived()
        {
            var item = MakeItem(10, received: 10);
            var purchase = new Purchase { Status = PurchaseStatusEnum.SHIPPED, Items = new() { item } };
            var activeReturn = new PurchaseReturn
            {
                Items = new() { new PurchaseReturnItem { PurchaseItemId = item.Id, Quantity = 2 } },
            };

            Assert.Equal(PurchaseStatusEnum.PARTIALLY_RECEIVED, _sut.RecomputePurchaseStatus(purchase, activeReturn));
        }

        [Fact]
        public void ResolveAwaitingReplacements_NullActiveReturn_NoOp()
        {
            var purchase = new Purchase { Items = new() { MakeItem(10) } };

            _sut.ResolveAwaitingReplacements(purchase, null, DateTime.Now);
        }

        [Fact]
        public void ResolveAwaitingReplacements_SurplusResolvesOldestAwaitingLineFifo()
        {
            var item = MakeItem(ordered: 10, received: 10, settled: 0);
            var purchase = new Purchase { Items = new() { item } };

            var oldDecision = new PurchaseReturnDecision
            {
                DecisionType = PurchaseReturnDecisionTypeEnum.REPLACEMENT,
                Quantity = 3,
                Status = PurchaseReturnDecisionStatusEnum.AWAITING,
                CreatedAt = DateTime.Now.AddMinutes(-10),
            };
            var newDecision = new PurchaseReturnDecision
            {
                DecisionType = PurchaseReturnDecisionTypeEnum.REPLACEMENT,
                Quantity = 5,
                Status = PurchaseReturnDecisionStatusEnum.AWAITING,
                CreatedAt = DateTime.Now,
            };

            var activeReturn = new PurchaseReturn
            {
                Items =
                {
                    new PurchaseReturnItem
                    {
                        PurchaseItemId = item.Id,
                        Quantity = 8,
                        Decisions = { oldDecision, newDecision },
                    },
                },
            };

            // Received 10 with nothing still normally owed (ordered 10, received 10) -> the whole
            // received batch beyond "still owed" (0) is surplus, i.e. all 10 could be replacement
            // stock, but only 8 quantity is actually AWAITING replacement, so both lines resolve.
            _sut.ResolveAwaitingReplacements(purchase, activeReturn, DateTime.Now);

            Assert.Equal(PurchaseReturnDecisionStatusEnum.RESOLVED, oldDecision.Status);
            Assert.Equal(PurchaseReturnDecisionStatusEnum.RESOLVED, newDecision.Status);
        }

        [Fact]
        public void ResolveAwaitingReplacements_InsufficientSurplus_LeavesLinesAwaiting()
        {
            // Ordered 10, received only 6: 4 still normally owed, so none of what arrived can be
            // surplus/replacement yet.
            var item = MakeItem(ordered: 10, received: 6, settled: 0);
            var purchase = new Purchase { Items = new() { item } };

            var decision = new PurchaseReturnDecision
            {
                DecisionType = PurchaseReturnDecisionTypeEnum.REPLACEMENT,
                Quantity = 2,
                Status = PurchaseReturnDecisionStatusEnum.AWAITING,
                CreatedAt = DateTime.Now,
            };

            var activeReturn = new PurchaseReturn
            {
                Items = new() { new PurchaseReturnItem { PurchaseItemId = item.Id, Quantity = 2, Decisions = { decision } } },
            };

            _sut.ResolveAwaitingReplacements(purchase, activeReturn, DateTime.Now);

            Assert.Equal(PurchaseReturnDecisionStatusEnum.AWAITING, decision.Status);
        }

        [Fact]
        public void ResolveAwaitingReplacements_NoSurplus_LeavesAllLinesAwaiting()
        {
            // Ordered 10, received 2: still owed = 8, which is >= the 7 units of AWAITING
            // replacement quantity, so nothing can be inferred as replacement stock yet.
            var item = MakeItem(ordered: 10, received: 2, settled: 0);
            var purchase = new Purchase { Items = new() { item } };

            var small = new PurchaseReturnDecision
            {
                DecisionType = PurchaseReturnDecisionTypeEnum.REPLACEMENT,
                Quantity = 2,
                Status = PurchaseReturnDecisionStatusEnum.AWAITING,
                CreatedAt = DateTime.Now.AddMinutes(-5),
            };
            var big = new PurchaseReturnDecision
            {
                DecisionType = PurchaseReturnDecisionTypeEnum.REPLACEMENT,
                Quantity = 5,
                Status = PurchaseReturnDecisionStatusEnum.AWAITING,
                CreatedAt = DateTime.Now,
            };

            var activeReturn = new PurchaseReturn
            {
                Items = new() { new PurchaseReturnItem { PurchaseItemId = item.Id, Quantity = 7, Decisions = { small, big } } },
            };

            // totalAwaiting = 7, stillNeeded = 10 - 2 - 0 = 8, surplus = max(0, 7-8) = 0
            _sut.ResolveAwaitingReplacements(purchase, activeReturn, DateTime.Now);

            Assert.Equal(PurchaseReturnDecisionStatusEnum.AWAITING, small.Status);
            Assert.Equal(PurchaseReturnDecisionStatusEnum.AWAITING, big.Status);
        }
    }
}
