using Application.Common.Dtos.Returns;
using Application.Features.Account.Command;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
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
        public void ZeroReceivedQuantity_IsInvalid()
        {
            var command = new ReceivePurchaseCommand
            {
                PurchaseId = 1,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = 1, ReceivedQuantity = 0 } },
            };

            Assert.False(_sut.Validate(command).IsValid);
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

    public class AddClaimResolutionCommandValidatorTests_Purchase
    {
        private readonly Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommandValidator _sut = new();

        [Fact]
        public void ZeroClaimId_IsInvalid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 0,
                Composition = new EffectCompositionDto { Quantity = 1, MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 100 } },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void ZeroQuantity_IsInvalid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto { Quantity = 0, MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 100 } },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void NoEffects_IsInvalid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto { Quantity = 1 },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void MixedMoneyWithNoParts_IsInvalid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto
                {
                    Quantity = 1,
                    MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.MIXED, Amount = 100, Parts = new() },
                },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void WellFormedGoodsOnlyRequest_IsValid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto { Quantity = 2, GoodsOut = new() { new GoodsEffectDto { Quantity = 2 } } },
            };

            Assert.True(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void MultipleGoodsInItems_IsValid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto
                {
                    Quantity = 5,
                    GoodsIn = new()
                    {
                        new GoodsEffectDto { Quantity = 3, ProductId = 1 },
                        new GoodsEffectDto { Quantity = 2, ProductId = 2 },
                    },
                },
            };

            var result = _sut.Validate(command);
            Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
        }

        [Fact]
        public void GoodsInItemWithZeroQuantity_IsInvalid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto
                {
                    Quantity = 3,
                    GoodsIn = new()
                    {
                        new GoodsEffectDto { Quantity = 3, ProductId = 1 },
                        new GoodsEffectDto { Quantity = 0, ProductId = 2 },
                    },
                },
            };

            Assert.False(_sut.Validate(command).IsValid);
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
        public void OnOrderClaimWithoutOrderLineId_IsInvalid()
        {
            var command = new CreateSaleReturnCommand
            {
                SaleId = 1,
                Claims = new()
                {
                    new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = null, ProductId = 1, Quantity = 1, Problem = ReturnProblemEnum.DEFECTIVE },
                },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void OffOrderClaimWithoutOffScopeKind_IsInvalid()
        {
            var command = new CreateSaleReturnCommand
            {
                SaleId = 1,
                Claims = new()
                {
                    new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.OFF_ORDER, OffScopeKind = null, ProductId = 1, Quantity = 1, Problem = ReturnProblemEnum.OTHER },
                },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void WellFormedOnOrderClaim_IsValid()
        {
            var command = new CreateSaleReturnCommand
            {
                SaleId = 1,
                Claims = new()
                {
                    new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = 1, ProductId = 1, Quantity = 1, Problem = ReturnProblemEnum.DEFECTIVE },
                },
            };

            Assert.True(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void ZeroQuantity_IsInvalid()
        {
            var command = new CreateSaleReturnCommand
            {
                SaleId = 1,
                Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = 1, ProductId = 1, Quantity = 0, Problem = ReturnProblemEnum.DEFECTIVE } },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }
    }

    public class AddClaimResolutionCommandValidatorTests_Sale
    {
        private readonly Application.Features.SaleReturn.Commands.AddClaimResolutionCommandValidator _sut = new();

        [Fact]
        public void ZeroClaimId_IsInvalid()
        {
            var command = new Application.Features.SaleReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 0,
                Composition = new EffectCompositionDto { Quantity = 1, MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.STORE_CREDIT, Amount = 100 } },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        // Replaces InvalidMoneyKind_IsInvalid. Money direction used to be a MoneyEffectDto.Kind
        // field whose zero value was GOODS_IN, so a caller that simply omitted it got "جهت اثر مالی
        // نامعتبر است." - which is what made every money-bearing resolution unpostable. Direction is
        // structural now (MoneyIn/MoneyOut slots), so an invalid direction cannot be expressed and
        // the interesting case is the one that used to fail: a money effect with nothing but a
        // method and an amount.
        [Fact]
        public void MoneyEffectWithNoDirectionField_IsValid()
        {
            var command = new Application.Features.SaleReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto { Quantity = 1, MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 100 } },
            };

            var result = _sut.Validate(command);
            Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
        }

        [Fact]
        public void GoodsOnlyResolution_IsValid()
        {
            var command = new Application.Features.SaleReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto { Quantity = 2, GoodsIn = new() { new GoodsEffectDto { Quantity = 2 } } },
            };

            var result = _sut.Validate(command);
            Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
        }

        [Fact]
        public void WellFormedRequest_IsValid()
        {
            var command = new Application.Features.SaleReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto { Quantity = 2, MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.STORE_CREDIT, Amount = 200 } },
            };

            Assert.True(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void MultipleGoodsOutItems_IsValid()
        {
            var command = new Application.Features.SaleReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto
                {
                    Quantity = 5,
                    GoodsOut = new()
                    {
                        new GoodsEffectDto { Quantity = 3, ProductId = 1 },
                        new GoodsEffectDto { Quantity = 2, ProductId = 2 },
                    },
                },
            };

            var result = _sut.Validate(command);
            Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
        }

        [Fact]
        public void GoodsOutItemWithZeroQuantity_IsInvalid()
        {
            var command = new Application.Features.SaleReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto
                {
                    Quantity = 3,
                    GoodsOut = new()
                    {
                        new GoodsEffectDto { Quantity = 3, ProductId = 1 },
                        new GoodsEffectDto { Quantity = 0, ProductId = 2 },
                    },
                },
            };

            Assert.False(_sut.Validate(command).IsValid);
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
