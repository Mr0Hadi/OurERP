using Application.Common.Dtos.Returns;
using Domain.Enums;

namespace WMS.Tests.Unit
{
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
