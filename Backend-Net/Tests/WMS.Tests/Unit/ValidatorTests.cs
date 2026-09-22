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
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = 1, ArrivedQuantity = 0 } },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void NegativeReceivedQuantity_IsInvalid()
        {
            var command = new ReceivePurchaseCommand
            {
                PurchaseId = 1,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = 1, ArrivedQuantity = -1 } },
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
                    new ReceivePurchaseItemDto { PurchaseItemId = 1, ArrivedQuantity = 1 },
                    new ReceivePurchaseItemDto { PurchaseItemId = 1, ArrivedQuantity = 2 },
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
                Composition = new EffectCompositionDto { Quantity = 2, GoodsOut = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 100 } } },
            };

            Assert.True(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void GoodsEffectWithoutUnitPrice_IsValid()
        {
            // UnitPrice is a recorded value, not a requirement: nothing reads it, so omitting it is legal.
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto { Quantity = 2, GoodsOut = new() { new GoodsEffectDto { Quantity = 2 } } },
            };

            Assert.True(_sut.Validate(command).IsValid);
        }

        [Fact]
        public void GoodsEffectPricedAtZero_IsValid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto { Quantity = 2, GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 0 } } },
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
                        new GoodsEffectDto { Quantity = 3, ProductId = 1, UnitPrice = 100 },
                        new GoodsEffectDto { Quantity = 2, ProductId = 2, UnitPrice = 100 },
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
                        new GoodsEffectDto { Quantity = 3, ProductId = 1, UnitPrice = 100 },
                        new GoodsEffectDto { Quantity = 0, ProductId = 2, UnitPrice = 100 },
                    },
                },
            };

            Assert.False(_sut.Validate(command).IsValid);
        }

        // Releasing quarantined goods values them at what they carry (0 for excess/unlisted); paying for them in the same
        // resolution says they are not free, and that purchase belongs on the order instead - so the pair is refused and the
        // message sends staff to the receiving screen. Everything around it stays legal.
        [Fact]
        public void ReleaseWithMoneyOut_IsInvalid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto
                {
                    Quantity = 2,
                    GoodsRelease = new() { new QuarantineEffectDto { Quantity = 2 } },
                    MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 2000 },
                },
            };

            var result = _sut.Validate(command);
            Assert.False(result.IsValid);
            Assert.Contains("دریافت کالا", string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
        }

        [Fact]
        public void ReleaseAlone_IsValid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto { Quantity = 2, GoodsRelease = new() { new QuarantineEffectDto { Quantity = 2 } } },
            };

            var result = _sut.Validate(command);
            Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
        }

        // Keeping defective goods we already paid for and taking part of the money back: the units carry the line's price, so
        // nothing is mis-valued.
        [Fact]
        public void ReleaseWithMoneyIn_IsValid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto
                {
                    Quantity = 2,
                    GoodsRelease = new() { new QuarantineEffectDto { Quantity = 2 } },
                    MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 500 },
                },
            };

            var result = _sut.Validate(command);
            Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
        }

        [Fact]
        public void GoodsOutWithMoneyOut_IsValid()
        {
            var command = new Application.Features.PurchaseReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto
                {
                    Quantity = 2,
                    GoodsOut = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 1000 } },
                    MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 2000 },
                },
            };

            var result = _sut.Validate(command);
            Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
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
                Composition = new EffectCompositionDto { Quantity = 2, GoodsIn = new() { new GoodsEffectDto { Quantity = 2, UnitPrice = 100 } } },
            };

            var result = _sut.Validate(command);
            Assert.True(result.IsValid, string.Join(" | ", result.Errors.Select(e => e.ErrorMessage)));
        }

        [Fact]
        public void GoodsEffectWithoutUnitPrice_IsValid()
        {
            // UnitPrice is a recorded value, not a requirement: nothing reads it, so omitting it is legal.
            var command = new Application.Features.SaleReturn.Commands.AddClaimResolutionCommand
            {
                ClaimId = 1,
                Composition = new EffectCompositionDto { Quantity = 2, GoodsIn = new() { new GoodsEffectDto { Quantity = 2 } } },
            };

            Assert.True(_sut.Validate(command).IsValid);
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
                        new GoodsEffectDto { Quantity = 3, ProductId = 1, UnitPrice = 100 },
                        new GoodsEffectDto { Quantity = 2, ProductId = 2, UnitPrice = 100 },
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
                        new GoodsEffectDto { Quantity = 3, ProductId = 1, UnitPrice = 100 },
                        new GoodsEffectDto { Quantity = 0, ProductId = 2, UnitPrice = 100 },
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

    /// <summary>
    /// The OFF_ORDER shape rules are pure input rules, so they live in the validators rather than the
    /// handlers: EXCESS must name the order line that prices it, UNLISTED must not name one (it used
    /// to be accepted and silently dropped).
    /// </summary>
    public class OffScopeClaimShapeValidatorTests
    {
        private readonly Application.Features.PurchaseReturn.Commands.CreatePurchaseReturnCommandValidator _purchase = new();
        private readonly CreateSaleReturnCommandValidator _sale = new();

        private static CreateReturnClaimDto Claim(ReturnOffScopeKindEnum kind, int? orderLineId) => new()
        {
            Scope = ReturnClaimScopeEnum.OFF_ORDER,
            OffScopeKind = kind,
            OrderLineId = orderLineId,
            ProductId = 1,
            UnitPrice = 100,
            Quantity = 1,
            Problem = ReturnProblemEnum.OVER_SHIPPED,
        };

        private bool ValidatePurchase(CreateReturnClaimDto claim) =>
            _purchase.Validate(new Application.Features.PurchaseReturn.Commands.CreatePurchaseReturnCommand { PurchaseId = 1, Claims = new() { claim } }).IsValid;

        private bool ValidateSale(CreateReturnClaimDto claim) =>
            _sale.Validate(new CreateSaleReturnCommand { SaleId = 1, Claims = new() { claim } }).IsValid;

        [Fact]
        public void ExcessWithoutOrderLineId_IsInvalid_OnBothSides()
        {
            Assert.False(ValidatePurchase(Claim(ReturnOffScopeKindEnum.EXCESS, null)));
            Assert.False(ValidateSale(Claim(ReturnOffScopeKindEnum.EXCESS, null)));
        }

        [Fact]
        public void ExcessWithOrderLineId_IsValid_OnBothSides()
        {
            Assert.True(ValidatePurchase(Claim(ReturnOffScopeKindEnum.EXCESS, 10)));
            Assert.True(ValidateSale(Claim(ReturnOffScopeKindEnum.EXCESS, 10)));
        }

        [Fact]
        public void UnlistedWithOrderLineId_IsInvalid_OnBothSides()
        {
            Assert.False(ValidatePurchase(Claim(ReturnOffScopeKindEnum.UNLISTED, 10)));
            Assert.False(ValidateSale(Claim(ReturnOffScopeKindEnum.UNLISTED, 10)));
        }

        [Fact]
        public void UnlistedWithoutOrderLineId_IsValid_OnBothSides()
        {
            Assert.True(ValidatePurchase(Claim(ReturnOffScopeKindEnum.UNLISTED, null)));
            Assert.True(ValidateSale(Claim(ReturnOffScopeKindEnum.UNLISTED, null)));
        }
    }

    /// <summary>
    /// Observations are the warehouse's "how much of this arrived damaged"; healthy quantity is the
    /// round's quantity minus them, so observing more than arrived used to add a negative number to
    /// Product.Stock. Pure input rule, so it is the validator's job on both sides.
    /// </summary>
    public class GoodsRoundObservationValidatorTests
    {
        private readonly Application.Features.PurchaseReturn.Commands.ExecuteGoodsRoundCommandValidator _purchase = new();
        private readonly Application.Features.SaleReturn.Commands.ExecuteGoodsRoundCommandValidator _sale = new();

        private static GoodsRoundLineDto Line(int quantity, params int[] observed) => new()
        {
            EffectId = 1,
            Quantity = quantity,
            Observations = observed.Select(q => new GoodsRoundObservationDto { Problem = ReturnProblemEnum.DAMAGED_IN_TRANSIT, Quantity = q }).ToList(),
        };

        private bool ValidatePurchase(GoodsRoundLineDto line) =>
            _purchase.Validate(new Application.Features.PurchaseReturn.Commands.ExecuteGoodsRoundCommand { PurchaseReturnId = 1, Rounds = new() { line } }).IsValid;

        private bool ValidateSale(GoodsRoundLineDto line) =>
            _sale.Validate(new Application.Features.SaleReturn.Commands.ExecuteGoodsRoundCommand { SaleReturnId = 1, Rounds = new() { line } }).IsValid;

        [Fact]
        public void ObservationsExceedingRoundQuantity_IsInvalid_OnBothSides()
        {
            Assert.False(ValidatePurchase(Line(2, 3)));
            Assert.False(ValidateSale(Line(2, 2, 1)));
        }

        [Fact]
        public void NegativeObservationQuantity_IsInvalid_OnBothSides()
        {
            Assert.False(ValidatePurchase(Line(5, -1)));
            Assert.False(ValidateSale(Line(5, -1)));
        }

        [Fact]
        public void ObservationsWithinRoundQuantity_IsValid_OnBothSides()
        {
            Assert.True(ValidatePurchase(Line(5, 2, 1)));
            Assert.True(ValidateSale(Line(5, 5)));
        }
    }
}
