using Application.Common.Dtos.Returns;
using Application.Common.Returns;
using Common.Exceptions;
using Domain.Enums;

namespace WMS.Tests.Unit
{
    /// <summary>
    /// The money-balance rule on its own (Application.Common.Returns.ReturnMoneyBalance): value of goods in
    /// minus value of goods out, each at its own unitPrice; a non-zero result requires money of at least
    /// that amount in the matching direction, and a zero result requires and forbids nothing.
    /// </summary>
    public class ReturnMoneyBalanceTests
    {
        private static object? DataValue(ValidationCustomException ex, string property) =>
            ex.Data.GetType().GetProperty(property)!.GetValue(ex.Data);

        [Fact]
        public void Balance_IsValueInMinusValueOut_AtEachEffectsOwnPrice()
        {
            var composition = new EffectCompositionDto
            {
                Quantity = 1,
                GoodsIn = new() { new GoodsEffectDto { Quantity = 1, UnitPrice = 10 }, new GoodsEffectDto { Quantity = 2, UnitPrice = 3 } },
                GoodsOut = new() { new GoodsEffectDto { Quantity = 1, ProductId = 99, UnitPrice = 4 } },
            };

            Assert.Equal((Int128)12, ReturnMoneyBalance.Compute(composition));
        }

        [Fact]
        public void GoodsPricedAtZero_CountAsZero()
        {
            var composition = new EffectCompositionDto { Quantity = 5, GoodsOut = new() { new GoodsEffectDto { Quantity = 5, UnitPrice = 0 } } };

            Assert.Equal((Int128)0, ReturnMoneyBalance.Compute(composition));
        }

        [Fact]
        public void Positive_WithExactOrLargerMoneyOut_IsSettled()
        {
            ReturnMoneyBalance.EnsureSettled(6, new EffectCompositionDto { MoneyOut = new MoneyEffectDto { Amount = 6 } });
            ReturnMoneyBalance.EnsureSettled(6, new EffectCompositionDto { MoneyOut = new MoneyEffectDto { Amount = 9 } });
        }

        [Fact]
        public void Positive_WithTooLittleMoneyOut_IsRefusedNamingDirectionAndAmount()
        {
            var ex = Assert.Throws<ValidationCustomException>(() => ReturnMoneyBalance.EnsureSettled(6, new EffectCompositionDto { MoneyOut = new MoneyEffectDto { Amount = 5 } }));

            Assert.Contains("moneyOut", ex.Error);
            Assert.Contains("6", ex.Error);
            Assert.Equal(ReturnEffectDirectionEnum.MONEY_OUT, DataValue(ex, "RequiredDirection"));
            Assert.Equal(6UL, DataValue(ex, "RequiredAmount"));
        }

        [Fact]
        public void Positive_SettledInTheWrongDirection_IsRefused()
        {
            Assert.Throws<ValidationCustomException>(() => ReturnMoneyBalance.EnsureSettled(6, new EffectCompositionDto { MoneyIn = new MoneyEffectDto { Amount = 6 } }));
        }

        [Fact]
        public void Negative_RequiresMoneyInOfAtLeastThatAmount()
        {
            ReturnMoneyBalance.EnsureSettled(-6, new EffectCompositionDto { MoneyIn = new MoneyEffectDto { Amount = 6 } });
            ReturnMoneyBalance.EnsureSettled(-6, new EffectCompositionDto { MoneyIn = new MoneyEffectDto { Amount = 100 }, MoneyOut = new MoneyEffectDto { Amount = 1 } });

            var ex = Assert.Throws<ValidationCustomException>(() => ReturnMoneyBalance.EnsureSettled(-6, new EffectCompositionDto()));
            Assert.Contains("moneyIn", ex.Error);
            Assert.Equal(ReturnEffectDirectionEnum.MONEY_IN, DataValue(ex, "RequiredDirection"));
            Assert.Equal(6UL, DataValue(ex, "RequiredAmount"));
        }

        [Fact]
        public void Zero_RequiresNothing_AndForbidsNothing()
        {
            ReturnMoneyBalance.EnsureSettled(0, new EffectCompositionDto());
            ReturnMoneyBalance.EnsureSettled(0, new EffectCompositionDto { MoneyOut = new MoneyEffectDto { Amount = 1800 } });
            ReturnMoneyBalance.EnsureSettled(0, new EffectCompositionDto { MoneyIn = new MoneyEffectDto { Amount = 3 }, MoneyOut = new MoneyEffectDto { Amount = 2 } });
        }
    }

    /// <summary>An on-order claim carries no off-scope kind; one sent anyway used to be dropped silently.</summary>
    public class OnOrderOffScopeKindValidatorTests
    {
        private static CreateReturnClaimDto OnOrderClaim(ReturnOffScopeKindEnum? kind) => new()
        {
            Scope = ReturnClaimScopeEnum.ON_ORDER,
            OffScopeKind = kind,
            OrderLineId = 1,
            ProductId = 1,
            UnitPrice = 100,
            Quantity = 1,
            Problem = ReturnProblemEnum.DEFECTIVE,
        };

        [Fact]
        public void OnOrderClaimWithOffScopeKind_IsInvalid_OnBothSides()
        {
            var purchase = new Application.Features.PurchaseReturn.Commands.CreatePurchaseReturnCommandValidator()
                .Validate(new Application.Features.PurchaseReturn.Commands.CreatePurchaseReturnCommand { PurchaseId = 1, Claims = new() { OnOrderClaim(ReturnOffScopeKindEnum.EXCESS) } });
            var sale = new Application.Features.SaleReturn.Commands.CreateSaleReturnCommandValidator()
                .Validate(new Application.Features.SaleReturn.Commands.CreateSaleReturnCommand { SaleId = 1, Claims = new() { OnOrderClaim(ReturnOffScopeKindEnum.UNLISTED) } });

            Assert.False(purchase.IsValid);
            Assert.False(sale.IsValid);
        }

        [Fact]
        public void OnOrderClaimWithoutOffScopeKind_IsValid_OnBothSides()
        {
            var purchase = new Application.Features.PurchaseReturn.Commands.CreatePurchaseReturnCommandValidator()
                .Validate(new Application.Features.PurchaseReturn.Commands.CreatePurchaseReturnCommand { PurchaseId = 1, Claims = new() { OnOrderClaim(null) } });
            var sale = new Application.Features.SaleReturn.Commands.CreateSaleReturnCommandValidator()
                .Validate(new Application.Features.SaleReturn.Commands.CreateSaleReturnCommand { SaleId = 1, Claims = new() { OnOrderClaim(null) } });

            Assert.True(purchase.IsValid);
            Assert.True(sale.IsValid);
        }
    }
}
