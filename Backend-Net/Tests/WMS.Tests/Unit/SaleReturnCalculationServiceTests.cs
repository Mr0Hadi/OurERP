using Domain.Entities;
using Domain.Enums;
using Infrastructure.Services;

namespace WMS.Tests.Unit
{
    public class SaleReturnCalculationServiceTests
    {
        private readonly SaleReturnCalculationService _sut = new();

        [Theory]
        [InlineData(SaleReturnStatusEnum.REJECTED, true)]
        [InlineData(SaleReturnStatusEnum.CANCELLED, true)]
        [InlineData(SaleReturnStatusEnum.PENDING_INSPECTION, false)]
        [InlineData(SaleReturnStatusEnum.COORDINATING, false)]
        [InlineData(SaleReturnStatusEnum.RESOLVED, false)]
        public void IsTerminal_OnlyRejectedAndCancelledAreTerminal(SaleReturnStatusEnum status, bool expected)
        {
            Assert.Equal(expected, _sut.IsTerminal(status));
        }

        [Theory]
        [InlineData(SaleReturnStatusEnum.PENDING_INSPECTION, true)]
        [InlineData(SaleReturnStatusEnum.COORDINATING, true)]
        [InlineData(SaleReturnStatusEnum.RESOLVED, false)]
        [InlineData(SaleReturnStatusEnum.REJECTED, false)]
        [InlineData(SaleReturnStatusEnum.CANCELLED, false)]
        public void IsMutable_ExcludesResolvedAndTerminalStatuses(SaleReturnStatusEnum status, bool expected)
        {
            var saleReturn = new SaleReturn { Status = status };

            Assert.Equal(expected, _sut.IsMutable(saleReturn));
        }

        [Fact]
        public void IsPreInspection_TrueOnlyWhenPendingAndNothingInspectedYet()
        {
            var pendingNoInspection = new SaleReturn
            {
                Status = SaleReturnStatusEnum.PENDING_INSPECTION,
                Claims = { new SaleReturnClaim { ClaimedQuantity = 5 } },
            };

            Assert.True(_sut.IsPreInspection(pendingNoInspection));
        }

        [Fact]
        public void IsPreInspection_FalseOnceAnyInspectionRecorded()
        {
            var partiallyInspected = new SaleReturn
            {
                Status = SaleReturnStatusEnum.PENDING_INSPECTION,
                Claims =
                {
                    new SaleReturnClaim
                    {
                        ClaimedQuantity = 5,
                        InspectionItems = new() { new SaleReturnItem { Quantity = 2 } },
                    },
                },
            };

            Assert.False(_sut.IsPreInspection(partiallyInspected));
        }

        [Fact]
        public void IsValidDecision_HealthyIssueRejectsReplacement()
        {
            Assert.False(_sut.IsValidDecision(null, SaleReturnDecisionTypeEnum.REPLACEMENT));
        }

        [Theory]
        [InlineData(SaleReturnDecisionTypeEnum.REFUND)]
        [InlineData(SaleReturnDecisionTypeEnum.STORE_CREDIT)]
        [InlineData(SaleReturnDecisionTypeEnum.NO_COMPENSATION)]
        public void IsValidDecision_HealthyIssueAllowsEverythingExceptReplacement(SaleReturnDecisionTypeEnum decision)
        {
            Assert.True(_sut.IsValidDecision(null, decision));
        }

        [Fact]
        public void IsValidDecision_ActualIssueAllowsReplacement()
        {
            Assert.True(_sut.IsValidDecision(SalesReturnIssueTypeEnum.DEFECTIVE, SaleReturnDecisionTypeEnum.REPLACEMENT));
        }

        [Fact]
        public void RecomputeReturnStatus_NotFullyInspected_StaysPendingInspection()
        {
            var saleReturn = new SaleReturn
            {
                Claims = { new SaleReturnClaim { ClaimedQuantity = 5, InspectionItems = new() { new SaleReturnItem { Quantity = 2 } } } },
            };

            Assert.Equal(SaleReturnStatusEnum.PENDING_INSPECTION, _sut.RecomputeReturnStatus(saleReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_FullyInspectedNoDecisions_IsCoordinating()
        {
            var saleReturn = new SaleReturn
            {
                Claims = { new SaleReturnClaim { ClaimedQuantity = 5, InspectionItems = new() { new SaleReturnItem { Quantity = 5 } } } },
            };

            Assert.Equal(SaleReturnStatusEnum.COORDINATING, _sut.RecomputeReturnStatus(saleReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_FullyInspectedAndFullyResolved_IsResolved()
        {
            var saleReturn = new SaleReturn
            {
                Claims =
                {
                    new SaleReturnClaim
                    {
                        ClaimedQuantity = 5,
                        InspectionItems =
                        {
                            new SaleReturnItem
                            {
                                Quantity = 5,
                                Decisions = { new SaleReturnDecision { Quantity = 5, Status = SaleReturnDecisionStatusEnum.RESOLVED } },
                            },
                        },
                    },
                },
            };

            Assert.Equal(SaleReturnStatusEnum.RESOLVED, _sut.RecomputeReturnStatus(saleReturn));
        }

        [Fact]
        public void RecomputeReturnStatus_FullyInspectedButAwaitingReplacement_IsCoordinating()
        {
            var saleReturn = new SaleReturn
            {
                Claims =
                {
                    new SaleReturnClaim
                    {
                        ClaimedQuantity = 5,
                        InspectionItems =
                        {
                            new SaleReturnItem
                            {
                                Quantity = 5,
                                Decisions = { new SaleReturnDecision { Quantity = 5, Status = SaleReturnDecisionStatusEnum.AWAITING } },
                            },
                        },
                    },
                },
            };

            Assert.Equal(SaleReturnStatusEnum.COORDINATING, _sut.RecomputeReturnStatus(saleReturn));
        }

        [Fact]
        public void GetOpenClaimQuantity_NoActiveReturns_IsZero()
        {
            Assert.Equal(0, _sut.GetOpenClaimQuantity(1, new List<SaleReturn>()));
        }

        [Fact]
        public void GetOpenClaimQuantity_StaysOpenUntilDecidedRegardlessOfInspection()
        {
            var activeReturns = new List<SaleReturn>
            {
                new()
                {
                    Claims =
                    {
                        new SaleReturnClaim
                        {
                            SaleItemId = 1,
                            ClaimedQuantity = 10,
                            InspectionItems = new() { new SaleReturnItem { Quantity = 10 } }, // inspected but not decided
                        },
                    },
                },
            };

            Assert.Equal(10, _sut.GetOpenClaimQuantity(1, activeReturns));
        }

        [Fact]
        public void GetOpenClaimQuantity_SumsAcrossMultipleActiveReturns()
        {
            var activeReturns = new List<SaleReturn>
            {
                new() { Claims = { new SaleReturnClaim { SaleItemId = 1, ClaimedQuantity = 3 } } },
                new() { Claims = { new SaleReturnClaim { SaleItemId = 1, ClaimedQuantity = 4 } } },
                new() { Claims = { new SaleReturnClaim { SaleItemId = 2, ClaimedQuantity = 100 } } },
            };

            Assert.Equal(7, _sut.GetOpenClaimQuantity(1, activeReturns));
        }

        [Fact]
        public void GetClaimableQuantity_SubtractsSettledAndOpenClaims()
        {
            var item = new SaleItem { Id = 1, ShippedQuantity = 10, SettledQuantity = 2 };
            var activeReturns = new List<SaleReturn>
            {
                new() { Claims = { new SaleReturnClaim { SaleItemId = 1, ClaimedQuantity = 3 } } },
            };

            Assert.Equal(5, _sut.GetClaimableQuantity(item, activeReturns));
        }

        [Fact]
        public void GetClaimableQuantity_NeverGoesNegative()
        {
            var item = new SaleItem { Id = 1, ShippedQuantity = 5, SettledQuantity = 5 };
            var activeReturns = new List<SaleReturn>
            {
                new() { Claims = { new SaleReturnClaim { SaleItemId = 1, ClaimedQuantity = 3 } } },
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
    }
}
