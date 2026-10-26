using Application.Common.Dtos.Returns;
using Application.Common.Settings;
using Application.Features.Cheque.Dtos;
using Application.Features.Cheque.Queries;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.Setting.Commands;
using Application.Features.Treasury;
using Application.Features.Treasury.Commands;
using Application.Features.Treasury.Dtos;
using Application.Features.Treasury.Queries;
using Common.Exceptions;
using Domain.Enums;
using MediatR;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// docs/frontend-requests.fa.md section 26: a cash box / bank account on return money (counted in that account once applied)
    /// and voidedAt on the cheque list.
    /// </summary>
    public class ReturnMoneyBankAccountTests
    {
        private static CancellationToken Ct => TestContext.Current.CancellationToken;

        private static IMediator Mediator(TestScope scope) => ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);

        private static async Task<BankAccountDto> CashBoxAsync(IMediator mediator, string title = "صندوق فروشگاه") =>
            Assert.IsType<BankAccountDto>((await mediator.Send(new CreateBankAccountCommand { Title = title, Kind = BankAccountKindEnum.CASH_BOX }, Ct)).Data);

        private static async Task<decimal> BalanceOfAsync(IMediator mediator, int accountId) =>
            Assert.IsType<BankAccountListDto>((await mediator.Send(new GetBankAccountListQuery(), Ct)).Data).Accounts.Single(x => x.Id == accountId).Balance;

        /// <summary>A purchase with 7 received and a claim of 3 defective units on its line.</summary>
        private static async Task<int> PurchaseClaimAsync(TestScope scope)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 7 } },
                }, CancellationToken.None);
            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 3, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);
            return scope.Context.PurchaseReturnClaims.Single().Id;
        }

        private static PR.AddClaimResolutionCommandHandler Add(TestScope scope) =>
            new(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

        private static PR.ExecuteMoneyEffectCommandHandler Execute(TestScope scope) =>
            new(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

        [Fact]
        public async Task AppliedReturnMoney_IsCountedInItsAccount_AndOnTheStatement()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var box = await CashBoxAsync(mediator);
            var claimId = await PurchaseClaimAsync(scope);

            await Add(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 3,
                    MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 3_000, PaidAt = DateTime.Now, BankAccountId = box.Id },
                },
            }, Ct);

            Assert.Equal(3_000, await BalanceOfAsync(mediator, box.Id));
            var statement = Assert.IsType<BankAccountStatementDto>((await mediator.Send(new GetBankAccountStatementQuery { BankAccountId = box.Id }, Ct)).Data);
            var row = Assert.Single(statement.Rows);
            Assert.Equal(BankAccountMovementKindEnum.RETURN_MONEY, row.Kind);
            Assert.Equal(3_000, row.In);
            Assert.NotNull(row.PurchaseReturnId);
            Assert.False(string.IsNullOrEmpty(row.ReturnNumber));
        }

        [Fact]
        public async Task PendingReturnMoney_CountsOnlyOnceExecuted_IntoTheAccountNamedThen()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var box = await CashBoxAsync(mediator);
            var claimId = await PurchaseClaimAsync(scope);

            await Add(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 3, MoneyOut = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.TRANSFER, Amount = 1_200 } },
            }, Ct);
            Assert.Equal(0, await BalanceOfAsync(mediator, box.Id));

            var effectId = scope.Context.PurchaseReturnEffects.Single().Id;
            await Execute(scope).Handle(new PR.ExecuteMoneyEffectCommand { EffectId = effectId, BankAccountId = box.Id }, Ct);

            Assert.Equal(-1_200, await BalanceOfAsync(mediator, box.Id));
        }

        [Fact]
        public async Task MixedReturnMoney_CountsEachPartInItsOwnAccount()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var box = await CashBoxAsync(mediator);
            var claimId = await PurchaseClaimAsync(scope);

            await Add(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 3,
                    MoneyIn = new MoneyEffectDto
                    {
                        Method = ReturnPaymentMethodEnum.MIXED, Amount = 3_000, PaidAt = DateTime.Now,
                        Parts = new()
                        {
                            new MoneyPartDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 1_000, BankAccountId = box.Id },
                            new MoneyPartDto { Method = ReturnPaymentMethodEnum.ON_ACCOUNT, Amount = 2_000 },
                        },
                    },
                },
            }, Ct);

            Assert.Equal(1_000, await BalanceOfAsync(mediator, box.Id));
        }

        [Fact]
        public async Task ReturnMoneyAccount_Refusals()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var box = await CashBoxAsync(mediator);
            var claimId = await PurchaseClaimAsync(scope);

            Task Decide(MoneyEffectDto money) => Add(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 1, MoneyIn = money },
            }, Ct);

            // No money moves on account, and a cheque on a return has no clearing date: neither names an account.
            await Assert.ThrowsAsync<ValidationCustomException>(() => Decide(new MoneyEffectDto { Method = ReturnPaymentMethodEnum.ON_ACCOUNT, Amount = 100, PaidAt = DateTime.Now, BankAccountId = box.Id }));
            await Assert.ThrowsAsync<ValidationCustomException>(() => Decide(new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CHECK, Amount = 100, PaidAt = DateTime.Now, BankAccountId = box.Id }));
            await Assert.ThrowsAsync<ValidationCustomException>(() => Decide(new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 100, PaidAt = DateTime.Now, BankAccountId = 999_999 }));

            await mediator.Send(new UpdateSystemSettingsCommand { Settings = new() { new() { Key = SystemSettingCatalog.PaymentRequireBankAccount.Key, Value = "true" } } }, Ct);
            await Assert.ThrowsAsync<ValidationCustomException>(() => Decide(new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 100, PaidAt = DateTime.Now }));
            // A promise is held to the setting only when it is executed.
            await Decide(new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 100 });
            var effectId = scope.Context.PurchaseReturnEffects.Single().Id;
            await Assert.ThrowsAsync<ValidationCustomException>(() => Execute(scope).Handle(new PR.ExecuteMoneyEffectCommand { EffectId = effectId }, Ct));
        }

        [Fact]
        public async Task ChequeList_SaysWhenAChequeWasVoided()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 1, stock: 0, unitPrice: 3_000);
            var sale = Assert.IsType<SaleDto>((await mediator.Send(new AddSalePaymentCommand
            {
                SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CHECK, Amount = 3_000, CheckNumber = "101", CheckDueDate = DateTime.Today.AddDays(5),
            }, Ct)).Data);
            await mediator.Send(new VoidSalePaymentCommand { PaymentId = sale.PaymentDetails.Single().Id }, Ct);

            var data = (await mediator.Send(new GetCheckListQuery { IncludeVoided = true }, Ct)).Data!;
            var cheques = (List<ChequeDto>)data.GetType().GetProperty("CheckList")!.GetValue(data)!;
            Assert.NotNull(Assert.Single(cheques).VoidedAt);
        }
    }
}
