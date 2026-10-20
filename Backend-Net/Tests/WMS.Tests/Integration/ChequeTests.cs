using Application.Common.Ledger;
using Application.Common.Settings;
using Application.Features.Cheque.Commands;
using Application.Features.Cheque.Dtos;
using Application.Features.Cheque.Queries;
using Application.Features.PartyAccount.Commands;
using Application.Features.PartyAccount.Dtos;
using Application.Features.Purchase.Commands;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.Setting.Commands;
using Application.Features.Treasury.Commands;
using Application.Features.Treasury.Dtos;
using Application.Features.Treasury.Queries;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using MediatR;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>GAP-03.3: received and issued cheques, cashing, bouncing and passing them on.</summary>
    public class ChequeTests
    {
        private static IMediator Mediator(TestScope scope) => ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);

        private static async Task<BankAccountDto> BankAsync(IMediator mediator, string title = "بانک ملت") =>
            Assert.IsType<BankAccountDto>((await mediator.Send(new CreateBankAccountCommand { Title = title, Kind = BankAccountKindEnum.BANK, BankName = "ملت" })).Data);

        private static async Task<decimal> BalanceOfAsync(IMediator mediator, int accountId) =>
            Assert.IsType<BankAccountListDto>((await mediator.Send(new GetBankAccountListQuery())).Data).Accounts.Single(x => x.Id == accountId).Balance;

        /// <summary>An issued sale of 3,000 paid by one received cheque due in ten days.</summary>
        private static async Task<(SaleScenario Scenario, SaleDto Sale, int ChequeId)> ChequeOnSaleAsync(IMediator mediator, TestScope scope)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 1, stock: 0, unitPrice: 3_000);
            var sale = Assert.IsType<SaleDto>((await mediator.Send(new AddSalePaymentCommand
            {
                SaleId = scenario.Sale.Id,
                Type = PaymentTypeEnum.CHECK,
                Amount = 3_000,
                CheckNumber = "889900",
                CheckDueDate = DateTime.Today.AddDays(10),
                CheckBankName = "صادرات",
                CheckDrawerName = "علی رضایی",
            })).Data);
            return (scenario, sale, sale.PaymentDetails.Single().Id);
        }

        [Fact]
        public async Task AReceivedCheque_IsPending_InNoBalance_UntilCashed_ThenIsFinal()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var bank = await BankAsync(mediator);
            var (_, sale, chequeId) = await ChequeOnSaleAsync(mediator, scope);

            var row = sale.PaymentDetails.Single();
            Assert.Equal(PaymentCheckStatusEnum.PENDING, row.CheckStatus);
            Assert.Equal(DateTime.Today.AddDays(10), row.CheckDueDate);
            Assert.Equal(3_000UL, sale.PaidAmount);
            Assert.Equal(0, await BalanceOfAsync(mediator, bank.Id));

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new CashCheckCommand { PaymentDetailId = chequeId }, TestContext.Current.CancellationToken));
            var cashed = Assert.IsType<ChequeDto>((await mediator.Send(new CashCheckCommand { PaymentDetailId = chequeId, BankAccountId = bank.Id }, TestContext.Current.CancellationToken)).Data);

            Assert.Equal(PaymentCheckStatusEnum.CASHED, cashed.Status);
            Assert.Equal(3_000, await BalanceOfAsync(mediator, bank.Id));
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new VoidSalePaymentCommand { PaymentId = chequeId }, TestContext.Current.CancellationToken));
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new BounceCheckCommand { PaymentDetailId = chequeId }, TestContext.Current.CancellationToken));
        }

        [Fact]
        public async Task ABouncedCheque_TakesThePaymentBack_TheInvoiceAndTheCustomerOweAgain()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (scenario, _, chequeId) = await ChequeOnSaleAsync(mediator, scope);
            Assert.Equal(-3_000, await PartyLedger.BalanceAsync(scope.Context, scenario.Customer.Id, null, CancellationToken.None));

            var bounced = Assert.IsType<ChequeDto>((await mediator.Send(new BounceCheckCommand { PaymentDetailId = chequeId, Note = "کسری موجودی" }, TestContext.Current.CancellationToken)).Data);

            Assert.Equal(PaymentCheckStatusEnum.BOUNCED, bounced.Status);
            Assert.Equal("کسری موجودی", bounced.StatusNote);
            using var verify = db.NewContext();
            Assert.Equal(0UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
            Assert.Equal(0, await PartyLedger.BalanceAsync(scope.Context, scenario.Customer.Id, null, CancellationToken.None));

            // Still on the cheque list, though its payment is voided.
            var data = (await mediator.Send(new GetCheckListQuery { Statuses = new() { PaymentCheckStatusEnum.BOUNCED } }, TestContext.Current.CancellationToken)).Data!;
            var rows = (List<ChequeDto>)data.GetType().GetProperty("CheckList")!.GetValue(data)!;
            Assert.Equal(chequeId, Assert.Single(rows).Id);
        }

        [Fact]
        public async Task ABouncedOnAccountCheque_RemovesItsAllocations()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 1, stock: 0, unitPrice: 3_000);
            var payment = Assert.IsType<PartyPaymentDto>((await mediator.Send(new AddPartyPaymentCommand
            {
                CustomerId = scenario.Customer.Id,
                Type = PaymentTypeEnum.CHECK,
                Amount = 3_000,
                CheckNumber = "1",
                Allocations = new() { new() { SaleId = scenario.Sale.Id, Amount = 3_000 } },
            }, TestContext.Current.CancellationToken)).Data);

            await mediator.Send(new BounceCheckCommand { PaymentDetailId = payment.Id }, TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            Assert.Equal(0UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
            Assert.NotNull(verify.PaymentAllocations.Single().VoidedAt);
        }

        [Fact]
        public async Task PassingAChequeOn_PaysTheSupplier_AndWhenItBouncesThere_BothSidesOweAgain()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var bank = await BankAsync(mediator);
            var (scenario, _, chequeId) = await ChequeOnSaleAsync(mediator, scope);
            var supplier = Seed.PendingPurchase(scope.Context).Supplier;

            var endorsed = Assert.IsType<ChequeDto>((await mediator.Send(new EndorseCheckCommand { PaymentDetailId = chequeId, SupplierId = supplier.Id }, TestContext.Current.CancellationToken)).Data);

            Assert.Equal(PaymentDirectionEnum.OUT, endorsed.Direction);
            Assert.Equal(chequeId, endorsed.EndorsedFromPaymentDetailId);
            Assert.Equal("889900", endorsed.CheckNumber);
            var received = await ChequeReader.ReadAsync(scope.Context, chequeId, CancellationToken.None);
            Assert.Equal(PaymentCheckStatusEnum.ENDORSED, received.Status);
            Assert.Equal(endorsed.Id, received.EndorsedToPaymentDetailId);
            // We paid the supplier 3,000 on account; the customer's cheque still counts as their payment.
            Assert.Equal(3_000, await PartyLedger.BalanceAsync(scope.Context, null, supplier.Id, CancellationToken.None));
            Assert.Equal(-3_000, await PartyLedger.BalanceAsync(scope.Context, scenario.Customer.Id, null, CancellationToken.None));
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new BounceCheckCommand { PaymentDetailId = chequeId }, TestContext.Current.CancellationToken));

            await mediator.Send(new BounceCheckCommand { PaymentDetailId = endorsed.Id }, TestContext.Current.CancellationToken);

            Assert.Equal(PaymentCheckStatusEnum.BOUNCED, (await ChequeReader.ReadAsync(scope.Context, chequeId, CancellationToken.None)).Status);
            Assert.Equal(0, await PartyLedger.BalanceAsync(scope.Context, null, supplier.Id, CancellationToken.None));
            Assert.Equal(0, await PartyLedger.BalanceAsync(scope.Context, scenario.Customer.Id, null, CancellationToken.None));
            using var verify = db.NewContext();
            Assert.Equal(0UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
            // No bank account of ours ever moved.
            Assert.Equal(0, await BalanceOfAsync(mediator, bank.Id));
        }

        [Fact]
        public async Task AnIssuedCheque_LeavesItsAccount_OnlyWhenCleared()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var bank = Assert.IsType<BankAccountDto>((await mediator.Send(new CreateBankAccountCommand { Title = "جاری", Kind = BankAccountKindEnum.BANK, OpeningBalance = 10_000 }, TestContext.Current.CancellationToken)).Data);
            var purchase = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, unitPrice: 4_000);

            await mediator.Send(new AddPurchasePaymentCommand
            {
                PurchaseId = purchase.Purchase.Id,
                Type = PaymentTypeEnum.CHECK,
                Amount = 4_000,
                CheckNumber = "50",
                CheckDueDate = DateTime.Today.AddDays(20),
                BankAccountId = bank.Id,
            }, TestContext.Current.CancellationToken);
            var chequeId = scope.Context.PaymentDetails.Single(x => x.PurchaseId == purchase.Purchase.Id).Id;
            Assert.Equal(10_000, await BalanceOfAsync(mediator, bank.Id));

            await mediator.Send(new CashCheckCommand { PaymentDetailId = chequeId }, TestContext.Current.CancellationToken);

            Assert.Equal(6_000, await BalanceOfAsync(mediator, bank.Id));
        }

        [Fact]
        public async Task AReceivedCheque_NeedsNoAccountWhenRecorded_EvenWhenAccountsAreRequired()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            await mediator.Send(new UpdateSystemSettingsCommand { Settings = new() { new() { Key = SystemSettingCatalog.PaymentRequireBankAccount.Key, Value = "true" } } }, TestContext.Current.CancellationToken);

            var (_, sale, _) = await ChequeOnSaleAsync(mediator, scope);

            Assert.Null(sale.PaymentDetails.Single().BankAccountId);
        }

        [Fact]
        public async Task CheckList_SummarisesPendingAndPastDue_AndFiltersOnTheDueDate()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (_, _, chequeId) = await ChequeOnSaleAsync(mediator, scope);
            var late = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 1, stock: 0, unitPrice: 1_000);
            await mediator.Send(new AddSalePaymentCommand { SaleId = late.Sale.Id, Type = PaymentTypeEnum.CHECK, Amount = 1_000, CheckDueDate = DateTime.Today.AddDays(-3) }, TestContext.Current.CancellationToken);

            var data = (await mediator.Send(new GetCheckListQuery { FromDueDate = DateTime.Today, ToDueDate = DateTime.Today.AddDays(30) }, TestContext.Current.CancellationToken)).Data!;
            var rows = (List<ChequeDto>)data.GetType().GetProperty("CheckList")!.GetValue(data)!;
            var summary = (ChequeListSummaryDto)data.GetType().GetProperty("Summary")!.GetValue(data)!;

            Assert.Equal(chequeId, Assert.Single(rows).Id);
            Assert.Equal(10, rows[0].DaysToDue);
            Assert.Equal(3_000, summary.PendingReceivedAmount);

            data = (await mediator.Send(new GetCheckListQuery(), TestContext.Current.CancellationToken)).Data!;
            summary = (ChequeListSummaryDto)data.GetType().GetProperty("Summary")!.GetValue(data)!;
            Assert.Equal(2, summary.PendingReceivedCount);
            Assert.Equal(1_000, summary.PastDueReceivedAmount);
        }
    }
}
