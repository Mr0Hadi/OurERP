using Application.Features.Account.Command;
using Application.Features.Purchase.Commands;
using Application.Features.PurchaseReturn.Commands;
using Application.Features.Sale.Commands;
using Application.Features.SaleReturn.Commands;
using Domain.Enums;

namespace WMS.Tests.Unit
{
    public class ShipSaleCommandValidatorTests
    {
        private readonly ShipSaleCommandValidator _sut = new();

        [Fact]
        public void EmptyItems_IsInvalid()
        {
            var result = _sut.Validate(new ShipSaleCommand { SaleId = 1, Items = new() });

            Assert.False(result.IsValid);
        }

        [Fact]
        public void DuplicateSaleItemIds_IsInvalid()
        {
            var command = new ShipSaleCommand
            {
                SaleId = 1,
                Items = new()
                {
                    new ShipSaleItemDto { SaleItemId = 1, ShippedQuantity = 2 },
                    new ShipSaleItemDto { SaleItemId = 1, ShippedQuantity = 3 },
                },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void ZeroShippedQuantity_IsInvalid()
        {
            var command = new ShipSaleCommand
            {
                SaleId = 1,
                Items = new() { new ShipSaleItemDto { SaleItemId = 1, ShippedQuantity = 0 } },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void WellFormedRequest_IsValid()
        {
            var command = new ShipSaleCommand
            {
                SaleId = 1,
                Items = new() { new ShipSaleItemDto { SaleItemId = 1, ShippedQuantity = 5 } },
            };

            Assert.True(_sut.Validate(command).IsValid);
        }
    }

    public class ReceivePurchaseCommandValidatorTests
    {
        private readonly ReceivePurchaseCommandValidator _sut = new();

        [Fact]
        public void EmptyItems_IsInvalid()
        {
            var result = _sut.Validate(new ReceivePurchaseCommand { PurchaseId = 1, Items = new() });

            Assert.False(result.IsValid);
        }

        [Fact]
        public void ItemWithNeitherReceivedQuantityNorIssues_IsInvalid()
        {
            var command = new ReceivePurchaseCommand
            {
                PurchaseId = 1,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = 1, ReceivedQuantity = 0, Issues = new() } },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void ItemWithOnlyIssues_IsValid()
        {
            var command = new ReceivePurchaseCommand
            {
                PurchaseId = 1,
                Items = new()
                {
                    new ReceivePurchaseItemDto
                    {
                        PurchaseItemId = 1,
                        ReceivedQuantity = 0,
                        Issues = new() { new ReceivePurchaseIssueDto { Type = PurchaseIssueTypeEnum.SHORTAGE, Quantity = 2 } },
                    },
                },
            };

            Assert.True(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void NegativeReceivedQuantity_IsInvalid()
        {
            var command = new ReceivePurchaseCommand
            {
                PurchaseId = 1,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = 1, ReceivedQuantity = -1 } },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void DuplicatePurchaseItemIds_IsInvalid()
        {
            var command = new ReceivePurchaseCommand
            {
                PurchaseId = 1,
                Items = new()
                {
                    new ReceivePurchaseItemDto { PurchaseItemId = 1, ReceivedQuantity = 1 },
                    new ReceivePurchaseItemDto { PurchaseItemId = 1, ReceivedQuantity = 2 },
                },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class AddPurchaseReturnDecisionCommandValidatorTests
    {
        private readonly AddPurchaseReturnDecisionCommandValidator _sut = new();

        [Fact]
        public void ZeroPurchaseReturnItemId_IsInvalid()
        {
            var command = new AddPurchaseReturnDecisionCommand { PurchaseReturnItemId = 0, Quantity = 1, DecisionType = PurchaseReturnDecisionTypeEnum.REFUND };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void ZeroQuantity_IsInvalid()
        {
            var command = new AddPurchaseReturnDecisionCommand { PurchaseReturnItemId = 1, Quantity = 0, DecisionType = PurchaseReturnDecisionTypeEnum.REFUND };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void ZeroRefundAmount_IsInvalid()
        {
            var command = new AddPurchaseReturnDecisionCommand
            {
                PurchaseReturnItemId = 1,
                Quantity = 1,
                DecisionType = PurchaseReturnDecisionTypeEnum.REFUND,
                RefundAmount = 0,
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void NullRefundAmount_IsValid()
        {
            var command = new AddPurchaseReturnDecisionCommand
            {
                PurchaseReturnItemId = 1,
                Quantity = 1,
                DecisionType = PurchaseReturnDecisionTypeEnum.REFUND,
                RefundAmount = null,
            };

            Assert.True(_sut.Validate(command).IsValid);
        }
    }

    public class CreateSaleReturnCommandValidatorTests
    {
        private readonly CreateSaleReturnCommandValidator _sut = new();

        [Fact]
        public void EmptyClaims_IsInvalid()
        {
            Assert.False(_sut.Validate(new CreateSaleReturnCommand { SaleId = 1, Claims = new() }).IsValid);
        }

        [Fact]
        public void DuplicateSaleItemAndReasonCombo_IsInvalid()
        {
            var command = new CreateSaleReturnCommand
            {
                SaleId = 1,
                Claims = new()
                {
                    new CreateSaleReturnClaimDto { SaleItemId = 1, Reason = SalesReturnReasonEnum.DEFECTIVE, ClaimedQuantity = 1 },
                    new CreateSaleReturnClaimDto { SaleItemId = 1, Reason = SalesReturnReasonEnum.DEFECTIVE, ClaimedQuantity = 2 },
                },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void SameSaleItemDifferentReason_IsValid()
        {
            var command = new CreateSaleReturnCommand
            {
                SaleId = 1,
                Claims = new()
                {
                    new CreateSaleReturnClaimDto { SaleItemId = 1, Reason = SalesReturnReasonEnum.DEFECTIVE, ClaimedQuantity = 1 },
                    new CreateSaleReturnClaimDto { SaleItemId = 1, Reason = SalesReturnReasonEnum.WRONG_ITEM, ClaimedQuantity = 2 },
                },
            };

            Assert.True(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void ZeroClaimedQuantity_IsInvalid()
        {
            var command = new CreateSaleReturnCommand
            {
                SaleId = 1,
                Claims = new() { new CreateSaleReturnClaimDto { SaleItemId = 1, Reason = SalesReturnReasonEnum.DEFECTIVE, ClaimedQuantity = 0 } },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class AddSaleReturnDecisionCommandValidatorTests
    {
        private readonly AddSaleReturnDecisionCommandValidator _sut = new();

        [Fact]
        public void ZeroSaleReturnItemId_IsInvalid()
        {
            var command = new AddSaleReturnDecisionCommand { SaleReturnItemId = 0, Quantity = 1, DecisionType = SaleReturnDecisionTypeEnum.REFUND };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void NegativeRefundAmount_IsInvalid()
        {
            // UInt64 cannot go negative, but zero is the explicit disallowed sentinel value.
            var command = new AddSaleReturnDecisionCommand
            {
                SaleReturnItemId = 1,
                Quantity = 1,
                DecisionType = SaleReturnDecisionTypeEnum.REFUND,
                RefundAmount = 0,
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void WellFormedRequest_IsValid()
        {
            var command = new AddSaleReturnDecisionCommand
            {
                SaleReturnItemId = 1,
                Quantity = 2,
                DecisionType = SaleReturnDecisionTypeEnum.STORE_CREDIT,
            };

            Assert.True(_sut.Validate(command).IsValid);
        }
    }

    public class LoginUserCommandValidatorTests
    {
        private readonly LoginUserCommandValidator _sut = new();

        [Fact]
        public void EmptyUsername_IsInvalid()
        {
            Assert.False(_sut.Validate(new LoginUserCommand { Username = "", Password = "x" }).IsValid);
        }

        [Fact]
        public void PersianUsername_IsInvalid()
        {
            Assert.False(_sut.Validate(new LoginUserCommand { Username = "کاربر", Password = "x" }).IsValid);
        }

        [Fact]
        public void EmptyPassword_IsInvalid()
        {
            Assert.False(_sut.Validate(new LoginUserCommand { Username = "admin", Password = "" }).IsValid);
        }

        [Fact]
        public void ValidCredentials_IsValid()
        {
            Assert.True(_sut.Validate(new LoginUserCommand { Username = "admin", Password = "whatever" }).IsValid);
        }
    }
}
