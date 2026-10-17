using Application.Common.Ledger;
using Application.Features.Accounting;
using Application.Common.Payments;
using Application.Common.Settings;
using Application.Features.Accounting.Dtos;
using Application.Features.Accounting.Queries;
using Application.Features.PartyAccount.Commands;
using Application.Features.PartyAccount.Dtos;
using Application.Features.PartyAccount.Queries;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.Setting.Commands;
using Application.Features.Treasury;
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
    /// <summary>
    /// GAP-03: cash boxes and bank accounts on every receipt and payment, money received/paid with no invoice, and applying it
    /// to invoices later (or never).
    /// </summary>
    public class PartyPaymentTests
    {
        private static IMediator Mediator(TestScope scope) => ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);

        private static async Task<BankAccountDto> AccountAsync(IMediator mediator, string title, BankAccountKindEnum kind = BankAccountKindEnum.BANK, ulong opening = 0) =>
            Assert.IsType<BankAccountDto>((await mediator.Send(new CreateBankAccountCommand
            {
                Title = title,
                Kind = kind,
                BankName = kind == BankAccountKindEnum.BANK ? "ملت" : null,
                OpeningBalance = opening,
            })).Data);

        /// <summary>A customer with two issued, unpaid sales of 3,000 and 2,000.</summary>
        private static (Customer Customer, Sale First, Sale Second) TwoOpenSales(TestScope scope)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 1, stock: 0, unitPrice: 3_000);
            var second = Seed.Sale(scenario.Customer, SalesStatusEnum.SHIPPED, Seed.SaleItem(scenario.Product, 1, 2_000, shippedQuantity: 1));
            scope.Context.Sales.Add(second);
            scope.Context.SaveChanges();
            return (scenario.Customer, scenario.Sale, second);
        }

        private static Task<decimal> CustomerBalanceAsync(TestScope scope, int customerId) =>
            PartyLedger.BalanceAsync(scope.Context, customerId, null, CancellationToken.None);

        private static async Task<PartyPaymentDto> ReceiveAsync(IMediator mediator, int customerId, ulong amount, int? accountId = null, List<PaymentAllocationInput>? allocations = null) =>
            Assert.IsType<PartyPaymentDto>((await mediator.Send(new AddPartyPaymentCommand
            {
                CustomerId = customerId,
                Type = PaymentTypeEnum.CASH,
                Amount = amount,
                BankAccountId = accountId,
                Description = "علی‌الحساب",
                Allocations = allocations ?? new(),
            })).Data);

        [Fact]
        public async Task OnAccountReceipt_MovesTheBalanceAtOnce_AndAllocatingItLater_PaysTheInvoices_WithoutMovingItAgain()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (customer, first, second) = TwoOpenSales(scope);
            var cash = await AccountAsync(mediator, "صندوق فروشگاه", BankAccountKindEnum.CASH_BOX);

            var payment = await ReceiveAsync(mediator, customer.Id, 5_000, cash.Id);
            Assert.Equal(PaymentDirectionEnum.IN, payment.Direction);
            Assert.Equal(5_000, payment.UnallocatedAmount);
            Assert.True(payment.CanAllocate);
            Assert.Equal(-5_000, await CustomerBalanceAsync(scope, customer.Id));

            payment = Assert.IsType<PartyPaymentDto>((await mediator.Send(new AllocatePartyPaymentCommand
            {
                PaymentDetailId = payment.Id,
                Allocations = new() { new() { SaleId = first.Id, Amount = 3_000 }, new() { SaleId = second.Id, Amount = 1_500 } },
            })).Data);

            Assert.Equal(4_500, payment.AllocatedAmount);
            Assert.Equal(500, payment.UnallocatedAmount);
            Assert.Equal(2, payment.Allocations.Count);
            // Allocation is bookkeeping: the balance does not move a second time.
            Assert.Equal(-5_000, await CustomerBalanceAsync(scope, customer.Id));

            using var verify = db.NewContext();
            Assert.Equal(3_000UL, verify.Sales.Single(x => x.Id == first.Id).PaidAmount);
            Assert.Equal(1_500UL, verify.Sales.Single(x => x.Id == second.Id).PaidAmount);

            var detail = await ProformaFlow.DetailAsync(mediator, second.Id);
            var allocation = Assert.Single(detail.PaymentAllocations);
            Assert.Equal(payment.Id, allocation.PaymentDetailId);
            Assert.Equal(1_500UL, allocation.Amount);
            Assert.Equal("صندوق فروشگاه", allocation.BankAccountTitle);
        }

        [Fact]
        public async Task Allocation_IsRefused_BeyondWhatTheInvoiceOwes_BeyondWhatThePaymentHasLeft_AndForAnotherCustomer()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (customer, first, second) = TwoOpenSales(scope);
            var payment = await ReceiveAsync(mediator, customer.Id, 4_000);

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new AllocatePartyPaymentCommand
            {
                PaymentDetailId = payment.Id,
                Allocations = new() { new() { SaleId = first.Id, Amount = 3_001 } },
            }));
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new AllocatePartyPaymentCommand
            {
                PaymentDetailId = payment.Id,
                Allocations = new() { new() { SaleId = first.Id, Amount = 3_000 }, new() { SaleId = second.Id, Amount = 1_500 } },
            }));

            var stranger = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 1, stock: 0, unitPrice: 1_000);
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new AllocatePartyPaymentCommand
            {
                PaymentDetailId = payment.Id,
                Allocations = new() { new() { SaleId = stranger.Sale.Id, Amount = 100 } },
            }));

            using var verify = db.NewContext();
            Assert.Empty(verify.PaymentAllocations);
        }

        [Fact]
        public async Task ReceiptWithAllocations_AppliesThemInTheSameRequest()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (customer, first, _) = TwoOpenSales(scope);

            var payment = await ReceiveAsync(mediator, customer.Id, 3_000, allocations: new() { new() { SaleId = first.Id, Amount = 3_000 } });

            Assert.Equal(0, payment.UnallocatedAmount);
            using var verify = db.NewContext();
            Assert.Equal(3_000UL, verify.Sales.Single(x => x.Id == first.Id).PaidAmount);
        }

        [Fact]
        public async Task Void_IsRefusedWhileAllocated_ThenRemovingTheAllocation_AndVoiding_TakesItAllBack()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (customer, first, _) = TwoOpenSales(scope);
            var payment = await ReceiveAsync(mediator, customer.Id, 3_000, allocations: new() { new() { SaleId = first.Id, Amount = 3_000 } });

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new VoidPartyPaymentCommand { PaymentDetailId = payment.Id }));

            payment = Assert.IsType<PartyPaymentDto>((await mediator.Send(new RemovePartyPaymentAllocationCommand { AllocationId = payment.Allocations.Single().Id })).Data);
            Assert.Equal(3_000, payment.UnallocatedAmount);
            Assert.NotNull(payment.Allocations.Single().VoidedAt);

            payment = Assert.IsType<PartyPaymentDto>((await mediator.Send(new VoidPartyPaymentCommand { PaymentDetailId = payment.Id })).Data);
            Assert.NotNull(payment.VoidedAt);
            Assert.Equal(0, payment.UnallocatedAmount);

            using var verify = db.NewContext();
            Assert.Equal(0UL, verify.Sales.Single(x => x.Id == first.Id).PaidAmount);
            // The receipt and its reversal cancel out (the seeded invoices were never put on the account).
            Assert.Equal(0, await CustomerBalanceAsync(scope, customer.Id));
        }

        [Fact]
        public async Task CancellingASale_ReleasesItsAllocations_SoTheMoneyCanPayAnotherInvoice()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0, unitPrice: 3_000);
            scenario.Sale.Status = SalesStatusEnum.PROCESSING;
            scope.Context.SaveChanges();
            var payment = await ReceiveAsync(mediator, scenario.Customer.Id, 3_000, allocations: new() { new() { SaleId = scenario.Sale.Id, Amount = 3_000 } });

            var cancelled = Assert.IsType<SaleDto>((await mediator.Send(new ChangeSaleStatusCommand { Id = scenario.Sale.Id, Status = SalesStatusEnum.CANCELLED })).Data);

            Assert.Equal(0UL, cancelled.PaidAmount);
            Assert.NotNull(Assert.Single(cancelled.PaymentAllocations).VoidedAt);
            var after = Assert.IsType<PartyPaymentDto>((await mediator.Send(new GetPartyPaymentDetailQuery { Id = payment.Id })).Data);
            Assert.Equal(3_000, after.UnallocatedAmount);
        }

        [Fact]
        public async Task AllocatingToAProforma_PaysIt_AndIssuesItsInvoice_ButOnlyOnceTheWarehouseHasChecked()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var barcodes = await ProformaFlow.ScannableStockAsync(scope, scenario.Product, 1);
            var sale = await ProformaFlow.CreateAsync(mediator, scenario, quantity: 1, unitPrice: 2_000);
            var payment = await ReceiveAsync(mediator, scenario.Customer.Id, 5_000);

            // A draft takes no money, however it arrives.
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new AllocatePartyPaymentCommand
            {
                PaymentDetailId = payment.Id,
                Allocations = new() { new() { SaleId = sale.Id, Amount = 1_000 } },
            }));

            sale = await ProformaFlow.CheckAsync(mediator, await ProformaFlow.ApproveAsync(mediator, sale), barcodes);
            await mediator.Send(new AllocatePartyPaymentCommand
            {
                PaymentDetailId = payment.Id,
                Allocations = new() { new() { SaleId = sale.Id, Amount = 1_000 } },
            });

            sale = await ProformaFlow.DetailAsync(mediator, sale.Id);
            Assert.Equal(SalesStatusEnum.PROCESSING, sale.Status);
            Assert.False(string.IsNullOrEmpty(sale.InvoiceNumber));
            Assert.Equal(1_000UL, sale.PaidAmount);
            Assert.Null(sale.ReservationExpiresAt);
        }

        [Fact]
        public async Task ARefundToTheCustomer_StaysOnTheAccount_AndIsNeverAllocated()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (customer, first, _) = TwoOpenSales(scope);

            var refund = Assert.IsType<PartyPaymentDto>((await mediator.Send(new AddPartyPaymentCommand
            {
                CustomerId = customer.Id,
                Direction = PaymentDirectionEnum.OUT,
                Type = PaymentTypeEnum.CASH,
                Amount = 1_000,
            })).Data);

            Assert.False(refund.CanAllocate);
            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new AllocatePartyPaymentCommand
            {
                PaymentDetailId = refund.Id,
                Allocations = new() { new() { SaleId = first.Id, Amount = 1_000 } },
            }));
        }

        [Fact]
        public async Task SupplierPayment_IsAllocatedToThatSuppliersPurchase()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var purchase = Seed.PendingPurchase(scope.Context, orderedQuantity: 2, unitPrice: 4_000);

            var payment = Assert.IsType<PartyPaymentDto>((await mediator.Send(new AddPartyPaymentCommand
            {
                SupplierId = purchase.Supplier.Id,
                Type = PaymentTypeEnum.TRANSFER,
                Amount = 10_000,
                Allocations = new() { new() { PurchaseId = purchase.Purchase.Id, Amount = 8_000 } },
            })).Data);

            Assert.Equal(PaymentDirectionEnum.OUT, payment.Direction);
            Assert.Equal(2_000, payment.UnallocatedAmount);
            using var verify = db.NewContext();
            Assert.Equal(8_000UL, verify.Purchases.Single(x => x.Id == purchase.Purchase.Id).PaidAmount);
            // We paid 10,000 and the supplier's invoice is not on the account in this seed: we are owed 10,000 back.
            Assert.Equal(10_000, await PartyLedger.BalanceAsync(scope.Context, null, purchase.Supplier.Id, CancellationToken.None));
        }

        [Fact]
        public async Task AllocatableDocuments_AreTheOpenInvoices_OldestDueFirst()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (customer, first, second) = TwoOpenSales(scope);
            first.PaymentDate = DateTime.Today.AddDays(10);
            second.PaymentDate = DateTime.Today.AddDays(2);
            scope.Context.SaveChanges();

            var documents = Assert.IsType<List<AllocatableDocumentDto>>((await mediator.Send(new GetAllocatableDocumentListQuery { CustomerId = customer.Id })).Data);

            Assert.Equal(new[] { second.Id, first.Id }, documents.Select(d => d.SaleId!.Value));
            Assert.Equal(2_000UL, documents[0].RemainingAmount);
        }

        [Fact]
        public async Task PartyPaymentList_FiltersOnWhatIsLeftToAllocate()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (customer, first, _) = TwoOpenSales(scope);
            var open = await ReceiveAsync(mediator, customer.Id, 1_000);
            await ReceiveAsync(mediator, customer.Id, 3_000, allocations: new() { new() { SaleId = first.Id, Amount = 3_000 } });

            var data = (await mediator.Send(new GetPartyPaymentListQuery { CustomerId = customer.Id, HasUnallocated = true })).Data!;
            var rows = (List<PartyPaymentDto>)data.GetType().GetProperty("PartyPaymentList")!.GetValue(data)!;

            Assert.Equal(open.Id, Assert.Single(rows).Id);
        }

        [Fact]
        public async Task BankAccounts_BalanceIsOpeningPlusMovements_AndTransfersMoveBothSides()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (customer, first, _) = TwoOpenSales(scope);
            var cash = await AccountAsync(mediator, "صندوق", BankAccountKindEnum.CASH_BOX, opening: 1_000);
            var bank = await AccountAsync(mediator, "بانک ملت");

            // Money in on an invoice and on account, both into the cash box; a supplier paid from it.
            await mediator.Send(new AddSalePaymentCommand { SaleId = first.Id, Type = PaymentTypeEnum.CASH, Amount = 3_000, BankAccountId = cash.Id });
            await ReceiveAsync(mediator, customer.Id, 500, cash.Id);
            var supplier = Seed.PendingPurchase(scope.Context).Supplier;
            await mediator.Send(new AddPartyPaymentCommand { SupplierId = supplier.Id, Type = PaymentTypeEnum.CASH, Amount = 700, BankAccountId = cash.Id });

            var transfer = Assert.IsType<BankAccountTransferDto>((await mediator.Send(new TransferBetweenBankAccountsCommand
            {
                FromBankAccountId = cash.Id,
                ToBankAccountId = bank.Id,
                Amount = 2_000,
            })).Data);

            var list = Assert.IsType<BankAccountListDto>((await mediator.Send(new GetBankAccountListQuery())).Data);
            Assert.Equal(1_000 + 3_000 + 500 - 700 - 2_000, list.Accounts.Single(x => x.Id == cash.Id).Balance);
            Assert.Equal(2_000, list.Accounts.Single(x => x.Id == bank.Id).Balance);
            Assert.Equal(3_800, list.TotalBalance);

            var statement = Assert.IsType<BankAccountStatementDto>((await mediator.Send(new GetBankAccountStatementQuery { BankAccountId = cash.Id })).Data);
            Assert.Equal(1_000, statement.OpeningBalance);
            Assert.Equal(4, statement.Rows.Count);
            Assert.Equal(1_800, statement.ClosingBalance);
            Assert.Equal(statement.ClosingBalance, statement.Rows.Last().Balance);
            Assert.Contains(statement.Rows, r => r.IsOnAccount && r.In == 500);
            Assert.Contains(statement.Rows, r => r.Kind == BankAccountMovementKindEnum.TRANSFER_OUT && r.Out == 2_000 && r.CounterpartBankAccountId == bank.Id);

            await mediator.Send(new VoidBankAccountTransferCommand { Id = transfer.Id });
            list = Assert.IsType<BankAccountListDto>((await mediator.Send(new GetBankAccountListQuery())).Data);
            Assert.Equal(3_800, list.Accounts.Single(x => x.Id == cash.Id).Balance);
            Assert.Equal(0, list.Accounts.Single(x => x.Id == bank.Id).Balance);
        }

        [Fact]
        public async Task AnInactiveAccount_IsRefused_AndTheRequireSetting_RefusesPaymentsWithNoAccount_ExceptCredit()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (customer, first, _) = TwoOpenSales(scope);
            var closed = await AccountAsync(mediator, "حساب بسته");
            await mediator.Send(new DeleteBankAccountCommand { Id = closed.Id });

            await Assert.ThrowsAsync<ValidationCustomException>(() => ReceiveAsync(mediator, customer.Id, 100, closed.Id));

            await mediator.Send(new UpdateSystemSettingsCommand { Settings = new() { new() { Key = SystemSettingCatalog.PaymentRequireBankAccount.Key, Value = "true" } } });
            await Assert.ThrowsAsync<ValidationCustomException>(() => ReceiveAsync(mediator, customer.Id, 100));
            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                mediator.Send(new AddSalePaymentCommand { SaleId = first.Id, Type = PaymentTypeEnum.CASH, Amount = 100 }));

            // A CREDIT row moves no money, so it needs no account.
            await mediator.Send(new AddSalePaymentCommand { SaleId = first.Id, Type = PaymentTypeEnum.CREDIT, Amount = 100 });
        }

        [Fact]
        public async Task ACardPayment_TakesTheAccountItsDeviceSettlesInto()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var bank = await AccountAsync(mediator, "بانک کارتخوان");
            var terminal = new PosTerminal { Name = "کارتخوان ۱", Host = "127.0.0.1", Port = 1, IsActive = true, BankAccountId = bank.Id };
            scope.Context.PosTerminals.Add(terminal);
            scope.Context.SaveChanges();

            var row = new PaymentDetail { Type = PaymentTypeEnum.TRANSFER, Direction = PaymentDirectionEnum.IN, Amount = 1, PosTerminalId = terminal.Id };
            await scope.PaymentAccounts.ApplyAsync(new[] { row }, CancellationToken.None);

            Assert.Equal(bank.Id, row.BankAccountId);
        }

        [Fact]
        public async Task PaymentJournal_ListsOnAccountPayments_WithTheirParty_AndAccount()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (customer, _, _) = TwoOpenSales(scope);
            var cash = await AccountAsync(mediator, "صندوق", BankAccountKindEnum.CASH_BOX);
            await ReceiveAsync(mediator, customer.Id, 900, cash.Id);

            var data = (await mediator.Send(new GetPaymentJournalQuery { CustomerId = customer.Id, IsOnAccount = true })).Data!;
            var rows = (List<PaymentJournalRowDto>)data.GetType().GetProperty("PaymentJournal")!.GetValue(data)!;

            var row = Assert.Single(rows);
            Assert.True(row.IsOnAccount);
            Assert.Null(row.SaleId);
            Assert.Equal(customer.Id, row.PartyId);
            Assert.Equal(cash.Id, row.BankAccountId);
            Assert.Equal(DocumentSideEnum.SALE, row.DocumentSide);
        }
    }
}
