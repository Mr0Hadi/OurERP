using Domain.Entities;
using Domain.Enums;
using Infrastructure.Services;

namespace WMS.Tests.Unit
{
    /// <summary>frontend-requests 9.1: a replacement that arrived (or was shipped) on a line can be claimed again, and a decided
    /// resolution still waiting on an effect keeps holding its quantity.</summary>
    public class ReplacementQuotaTests
    {
        private static PurchaseReturn OpenReturnWithPendingResolution(int purchaseItemId, int quantity) => new()
        {
            IsActive = true,
            Status = ReturnStatusEnum.IN_PROGRESS,
            Claims =
            {
                new PurchaseReturnClaim
                {
                    Scope = ReturnClaimScopeEnum.ON_ORDER,
                    PurchaseItemId = purchaseItemId,
                    Quantity = quantity,
                    Resolutions =
                    {
                        new PurchaseReturnResolution
                        {
                            Quantity = quantity,
                            Effects = { new PurchaseReturnEffect { Direction = ReturnEffectDirectionEnum.GOODS_OUT, Quantity = quantity, Status = ReturnEffectStatusEnum.PENDING } },
                        },
                    },
                },
            },
        };

        [Fact]
        public void PurchaseLine_ReplacementReceived_IsClaimableAgain()
        {
            var item = new PurchaseItem { Id = 35, Quantity = 1, ReceivedQuantity = 1, SettledQuantity = 1, ReplacementReceivedQuantity = 1 };

            Assert.Equal(1, new PurchaseReturnCalculationService().GetClaimableQuantity(item, new()));
        }

        [Fact]
        public void PurchaseLine_DecidedButPendingResolution_StillHoldsItsQuantity()
        {
            var item = new PurchaseItem { Id = 7, Quantity = 5, ReceivedQuantity = 5 };

            Assert.Equal(3, new PurchaseReturnCalculationService().GetClaimableQuantity(item, new() { OpenReturnWithPendingResolution(7, 2) }));
        }

        [Fact]
        public void SaleLine_ReplacementShipped_IsClaimableAgain()
        {
            var item = new SaleItem { Id = 74, Quantity = 6, ShippedQuantity = 6, SettledQuantity = 2, ReplacementShippedQuantity = 2 };

            Assert.Equal(6, new SaleReturnCalculationService().GetClaimableQuantity(item, new()));
        }
    }
}
