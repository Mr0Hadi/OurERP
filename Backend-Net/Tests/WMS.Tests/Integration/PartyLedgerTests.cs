using Application.Common.Dtos.Returns;
using Application.Features.Customer.Dtos;
using Application.Features.Customer.Queries;
using Application.Features.PartyAccount.Dtos;
using Application.Features.PartyAccount.Queries;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.SaleInstallment.Commands;
using Application.Features.Supplier.Dtos;
using Application.Features.Supplier.Queries;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// The party ledger: every issued invoice, payment, charge and on-account return settlement lands on the customer's or
    /// supplier's account, and anything taken back is a REVERSAL row. Balance = DEBIT - CREDIT, positive = they owe us.
    /// </summary>
    public class PartyLedgerTests
    {
        private static async Task<PartyStatementDto> StatementAsync(TestDatabase db, int? customerId = null, int? supplierId = null, DateTime? from = null)
        {
            using var read = db.NewScope();
            return Assert.IsType<PartyStatementDto>((await new GetPartyStatementQueryHandler(read.Db)
                .Handle(new GetPartyStatementQuery { CustomerId = customerId, SupplierId = supplierId, FromDate = from }, CancellationToken.None)).Data);
        }

        private static SaleScenario ProformaSale(TestScope scope, ulong unitPrice = 1_000)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0, unitPrice: unitPrice);
            scenario.Sale.Status = SalesStatusEnum.PROFORMA;
            scenario.Sale.InvoiceNumber = "";
            scenario.Sale.PaidAmount = 0;
            scenario.Sale.TotalAmount = unitPrice;
            scope.Context.SaveChanges();
            return scenario;
        }

        private static AddSalePaymentCommandHandler AddSalePayment(TestScope scope) => new(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

        [Fact]
        public async Task ProformaSale_IsNotOnTheAccount_UntilItsFirstPaymentIssuesIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = ProformaSale(scope, 10_000);

            Assert.Empty((await StatementAsync(db, customerId: s.Customer.Id)).Entries);

            await AddSalePayment(scope).Handle(new AddSalePaymentCommand { SaleId = s.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 4_000 }, CancellationToken.None);

            var statement = await StatementAsync(db, customerId: s.Customer.Id);
            Assert.Equal(2, statement.Entries.Count);
            var invoice = statement.Entries.Single(e => e.EntryType == PartyLedgerEntryTypeEnum.SALE_INVOICE);
            var payment = statement.Entries.Single(e => e.EntryType == PartyLedgerEntryTypeEnum.PAYMENT);
            Assert.Equal((10_000m, 0m), (invoice.Debit, invoice.Credit));
            Assert.Equal((0m, 4_000m), (payment.Debit, payment.Credit));
            Assert.Equal(6_000m, statement.ClosingBalance);
            Assert.Equal(statement.ClosingBalance, statement.Entries.Last().RunningBalance);
        }

        [Fact]
        public async Task VoidedPayment_IsReversed_NotDeleted()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = ProformaSale(scope, 10_000);
            var dto = Assert.IsType<SaleDto>((await AddSalePayment(scope).Handle(
                new AddSalePaymentCommand { SaleId = s.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 4_000 }, CancellationToken.None)).Data);

            await new VoidSalePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new VoidSalePaymentCommand { PaymentId = dto.PaymentDetails.Single().Id }, CancellationToken.None);

            var statement = await StatementAsync(db, customerId: s.Customer.Id);
            Assert.Equal(3, statement.Entries.Count);
            var reversal = statement.Entries.Single(e => e.EntryType == PartyLedgerEntryTypeEnum.REVERSAL);
            var original = statement.Entries.Single(e => e.EntryType == PartyLedgerEntryTypeEnum.PAYMENT);
            Assert.Equal(original.Id, reversal.ReversalOfEntryId);
            Assert.Equal(4_000m, reversal.Debit);
            Assert.Equal(10_000m, statement.ClosingBalance); // the invoice stays owed - voiding does not un-issue it
        }

        [Fact]
        public async Task CancelledSale_TakesTheInvoiceOff_AndTheRefundSettlesTheCustomer()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = ProformaSale(scope, 10_000);
            await AddSalePayment(scope).Handle(new AddSalePaymentCommand { SaleId = s.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 10_000 }, CancellationToken.None);
            Assert.Equal(0m, (await StatementAsync(db, customerId: s.Customer.Id)).ClosingBalance);

            await new ChangeSaleStatusCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ChangeSaleStatusCommand { Id = s.Sale.Id, Status = SalesStatusEnum.CANCELLED }, CancellationToken.None);
            // The money is still with us: we owe it back.
            Assert.Equal(-10_000m, (await StatementAsync(db, customerId: s.Customer.Id)).ClosingBalance);

            await AddSalePayment(scope).Handle(new AddSalePaymentCommand { SaleId = s.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 10_000, Direction = PaymentDirectionEnum.OUT }, CancellationToken.None);
            Assert.Equal(0m, (await StatementAsync(db, customerId: s.Customer.Id)).ClosingBalance);
        }

        [Fact]
        public async Task CustomerListAndDetail_ShowTheLedgerBalance()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = ProformaSale(scope, 10_000);
            await AddSalePayment(scope).Handle(new AddSalePaymentCommand { SaleId = s.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 2_500 }, CancellationToken.None);

            using var read = db.NewScope();
            var detail = Assert.IsType<CustomerDto>((await new GetCustomerDetailQueryHandler(read.CustomerRepository, TestMapper.Instance, FakeObjectStorage.Instance, read.Db)
                .Handle(new GetCustomerDetailQuery { Id = s.Customer.Id }, CancellationToken.None)).Data);
            Assert.Equal(7_500m, detail.LedgerBalance);

            var list = await new GetCustomerListQueryHandler(read.Db, FakeObjectStorage.Instance).Handle(new GetCustomerListQuery(), CancellationToken.None);
            var row = ((IEnumerable<CustomerListDto>)list.Data!.GetType().GetProperty("CustomerList")!.GetValue(list.Data)!).Single();
            Assert.Equal(7_500m, row.LedgerBalance);
        }

        [Fact]
        public async Task Purchase_Prepayment_ThenInvoice_ThenFinalPayment()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var p = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0, unitPrice: 9_000);
            p.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            p.Purchase.TotalAmount = 9_000;
            scope.Context.SaveChanges();
            var pay = new AddPurchasePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

            // A prepayment on a proforma: the supplier owes us until its invoice arrives.
            await pay.Handle(new AddPurchasePaymentCommand { PurchaseId = p.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 3_000 }, CancellationToken.None);
            Assert.Equal(3_000m, (await StatementAsync(db, supplierId: p.Supplier.Id)).ClosingBalance);

            await new ChangePurchaseStatusCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ChangePurchaseStatusCommand { Id = p.Purchase.Id, Status = PurchaseStatusEnum.PENDING }, CancellationToken.None);
            Assert.Equal(-6_000m, (await StatementAsync(db, supplierId: p.Supplier.Id)).ClosingBalance);

            await pay.Handle(new AddPurchasePaymentCommand { PurchaseId = p.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 6_000 }, CancellationToken.None);

            var statement = await StatementAsync(db, supplierId: p.Supplier.Id);
            Assert.Equal(0m, statement.ClosingBalance);
            Assert.Equal(9_000m, statement.TotalDebit);
            Assert.Equal(9_000m, statement.TotalCredit);

            using var read = db.NewScope();
            var detail = Assert.IsType<SupplierDto>((await new GetSupplierDetailQueryHandler(read.SupplierRepository, TestMapper.Instance, FakeObjectStorage.Instance, read.Db)
                .Handle(new GetSupplierDetailQuery { Id = p.Supplier.Id }, CancellationToken.None)).Data);
            Assert.Equal(0m, detail.LedgerBalance);
        }

        [Fact]
        public async Task CancelledIssuedPurchase_IsReversed_CancelledDraft_WritesNothing()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var issued = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0, unitPrice: 5_000);
            var status = new ChangePurchaseStatusCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

            // Seeded straight into SHIPPED, so its invoice never went through the ledger: record it the way leaving
            // PROFORMA would, then cancel.
            issued.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            scope.Context.SaveChanges();
            await status.Handle(new ChangePurchaseStatusCommand { Id = issued.Purchase.Id, Status = PurchaseStatusEnum.SHIPPED }, CancellationToken.None);
            await status.Handle(new ChangePurchaseStatusCommand { Id = issued.Purchase.Id, Status = PurchaseStatusEnum.CANCELLED }, CancellationToken.None);

            var statement = await StatementAsync(db, supplierId: issued.Supplier.Id);
            Assert.Equal(2, statement.Entries.Count);
            Assert.Equal(0m, statement.ClosingBalance);

            var draft = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0);
            draft.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            scope.Context.SaveChanges();
            await status.Handle(new ChangePurchaseStatusCommand { Id = draft.Purchase.Id, Status = PurchaseStatusEnum.CANCELLED }, CancellationToken.None);
            Assert.Empty((await StatementAsync(db, supplierId: draft.Supplier.Id)).Entries);
        }

        [Fact]
        public async Task InstallmentPlan_PutsInvoiceAndChargeOnTheAccount_AndEditsReplaceTheCharge()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = ProformaSale(scope, 10_000_000);
            s.Sale.PaymentType = PaymentTypeEnum.INSTALLMENT;
            scope.Context.SaveChanges();

            await new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork)
                .Handle(new CreateSaleInstallmentPlanCommand
                {
                    SaleId = s.Sale.Id,
                    MarkupPercentage = 20m,
                    DownPaymentAmount = 2_000_000,
                    InstallmentCount = 4,
                    FirstDueDate = DateTime.Now.Date.AddMonths(1),
                    PaymentType = PaymentTypeEnum.CASH,
                }, CancellationToken.None);

            // 10,000,000 invoice + 2,000,000 charge - 2,000,000 down payment.
            var statement = await StatementAsync(db, customerId: s.Customer.Id);
            Assert.Equal(10_000_000m, statement.ClosingBalance);
            Assert.Contains(statement.Entries, e => e.EntryType == PartyLedgerEntryTypeEnum.INSTALLMENT_CHARGE && e.Debit == 2_000_000m);

            var planId = scope.Context.SaleInstallmentPlans.Single().Id;
            await new UpdateSaleInstallmentPlanCommandHandler(scope.Db, scope.UnitOfWork).Handle(new UpdateSaleInstallmentPlanCommand
            {
                Id = planId,
                MarkupPercentage = 10m,
                InstallmentCount = 4,
                FirstDueDate = DateTime.Now.Date.AddMonths(1),
            }, CancellationToken.None);
            Assert.Equal(9_000_000m, (await StatementAsync(db, customerId: s.Customer.Id)).ClosingBalance);

            await new DeleteSaleInstallmentPlanCommandHandler(scope.Db, scope.UnitOfWork).Handle(new DeleteSaleInstallmentPlanCommand { Id = planId }, CancellationToken.None);
            // The charge is gone; the invoice and the down payment stay.
            Assert.Equal(8_000_000m, (await StatementAsync(db, customerId: s.Customer.Id)).ClosingBalance);

            // The same numbers the sale itself reports: payable - paid.
            using var verify = db.NewContext();
            var sale = verify.Sales.Single(x => x.Id == s.Sale.Id);
            Assert.Equal(8_000_000UL, sale.TotalAmount - sale.PaidAmount);
        }

        [Fact]
        public async Task Statement_FromDate_CarriesTheEarlierRowsAsOpeningBalance()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = ProformaSale(scope, 10_000);
            await AddSalePayment(scope).Handle(new AddSalePaymentCommand { SaleId = s.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1_000, PaidAt = new DateTime(2026, 1, 10) }, CancellationToken.None);
            await AddSalePayment(scope).Handle(new AddSalePaymentCommand { SaleId = s.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 2_000, PaidAt = new DateTime(2026, 3, 10) }, CancellationToken.None);

            var from = new DateTime(2026, 2, 1);
            var statement = await StatementAsync(db, customerId: s.Customer.Id, from: from);
            var full = await StatementAsync(db, customerId: s.Customer.Id);

            Assert.All(statement.Entries, e => Assert.True(e.OccurredAt >= from));
            Assert.Equal(full.ClosingBalance, statement.ClosingBalance);
            Assert.Equal(statement.OpeningBalance + statement.TotalDebit - statement.TotalCredit, statement.ClosingBalance);
        }

        /// <summary>
        /// Sync request item 11: 10 ordered and paid, 8 arrive, the supplier will never send the other 2 and refunds them.
        /// Closing the line takes 2 units' share off what we owe; the refund is a payment IN; the account ends at 0 and the
        /// purchase document agrees (PayableAmount - PaidAmount = 0).
        /// </summary>
        [Fact]
        public async Task ShortClosedPaidLine_TheRefundSettlesTheSupplier()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var p = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0, unitPrice: 1_000);
            p.Item.TotalAmount = 10_000; // the line snapshot a real invoice would carry
            p.Purchase.TotalAmount = 10_000;
            p.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            scope.Context.SaveChanges();
            var status = new ChangePurchaseStatusCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);
            var pay = new AddPurchasePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);

            await status.Handle(new ChangePurchaseStatusCommand { Id = p.Purchase.Id, Status = PurchaseStatusEnum.SHIPPED }, CancellationToken.None);
            await pay.Handle(new AddPurchasePaymentCommand { PurchaseId = p.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 10_000 }, CancellationToken.None);
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = p.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = p.Item.Id, ArrivedQuantity = 8 } },
                }, CancellationToken.None);

            await new ClosePurchaseItemCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork)
                .Handle(new ClosePurchaseItemCommand { PurchaseItemId = p.Item.Id }, CancellationToken.None);
            // We paid for 10 and owe for 8: the supplier owes us 2,000.
            Assert.Equal(2_000m, (await StatementAsync(db, supplierId: p.Supplier.Id)).ClosingBalance);

            var refunded = Assert.IsType<PurchaseDto>((await pay.Handle(new AddPurchasePaymentCommand
            {
                PurchaseId = p.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 2_000, Direction = PaymentDirectionEnum.IN,
            }, CancellationToken.None)).Data);

            Assert.Equal(0m, (await StatementAsync(db, supplierId: p.Supplier.Id)).ClosingBalance);
            Assert.Equal(10_000UL, refunded.TotalAmount);     // the issued invoice is untouched
            Assert.Equal(8_000UL, refunded.PayableAmount);    // minus the 2 never delivered
            Assert.Equal(8_000UL, refunded.PaidAmount);

            // Reopening the line takes the credit back.
            await new ReopenPurchaseItemCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork)
                .Handle(new ReopenPurchaseItemCommand { PurchaseItemId = p.Item.Id }, CancellationToken.None);
            Assert.Equal(-2_000m, (await StatementAsync(db, supplierId: p.Supplier.Id)).ClosingBalance);
        }

        // ---- returns ----

        private static async Task<(PurchaseScenario Scenario, int ClaimId)> PurchaseClaimAsync(TestScope scope)
        {
            var scenario = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0);
            await new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new ReceivePurchaseCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = scenario.Item.Id, ArrivedQuantity = 5 } },
                }, CancellationToken.None);
            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = scenario.Purchase.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = scenario.Item.Id, ProductId = scenario.Product.Id, UnitPrice = scenario.Item.UnitPrice, Quantity = 3, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, CancellationToken.None);
            return (scenario, scope.Context.PurchaseReturnClaims.Single().Id);
        }

        private static PR.AddClaimResolutionCommandHandler PurchaseAdd(TestScope scope) =>
            new(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

        [Fact]
        public async Task ReturnMoney_InCash_LeavesTheAccountAlone_OnAccount_MovesIt_AndRemovalReversesIt()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (scenario, claimId) = await PurchaseClaimAsync(scope);

            // Cash back from the supplier: the goods going back and the money coming in cancel out on the account.
            await PurchaseAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto { Quantity = 1, MoneyIn = new MoneyEffectDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 1_000, PaidAt = DateTime.Now } },
            }, CancellationToken.None);
            Assert.Empty((await StatementAsync(db, supplierId: scenario.Supplier.Id)).Entries);

            // On account (part of a MIXED payment): only that part stays on the account - the supplier owes it to us.
            var res = await PurchaseAdd(scope).Handle(new PR.AddClaimResolutionCommand
            {
                ClaimId = claimId,
                Composition = new EffectCompositionDto
                {
                    Quantity = 1,
                    MoneyIn = new MoneyEffectDto
                    {
                        Method = ReturnPaymentMethodEnum.MIXED,
                        Amount = 1_000,
                        PaidAt = DateTime.Now,
                        Parts = new()
                        {
                            new MoneyPartDto { Method = ReturnPaymentMethodEnum.CASH, Amount = 400 },
                            new MoneyPartDto { Method = ReturnPaymentMethodEnum.ON_ACCOUNT, Amount = 600 },
                        },
                    },
                },
            }, CancellationToken.None);

            var statement = await StatementAsync(db, supplierId: scenario.Supplier.Id);
            var settlement = Assert.Single(statement.Entries);
            Assert.Equal((PartyLedgerEntryTypeEnum.RETURN_SETTLEMENT, 600m), (settlement.EntryType, settlement.Debit));
            Assert.Equal(claimId, settlement.PurchaseReturnClaimId);

            var resolutionId = scope.Context.PurchaseReturnResolutions.OrderBy(x => x.Id).Last().Id;
            await new PR.RemoveClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.RemoveClaimResolutionCommand { Id = resolutionId }, CancellationToken.None);

            var after = await StatementAsync(db, supplierId: scenario.Supplier.Id);
            Assert.Equal(2, after.Entries.Count);
            Assert.Equal(settlement.Id, after.Entries.Single(e => e.EntryType == PartyLedgerEntryTypeEnum.REVERSAL).ReversalOfEntryId);
            Assert.Equal(0m, after.ClosingBalance);
        }

        [Fact]
        public void StatementValidator_NeedsExactlyOneParty()
        {
            var validator = new GetPartyStatementQueryValidator();
            Assert.False(validator.Validate(new GetPartyStatementQuery()).IsValid);
            Assert.False(validator.Validate(new GetPartyStatementQuery { CustomerId = 1, SupplierId = 1 }).IsValid);
            Assert.True(validator.Validate(new GetPartyStatementQuery { SupplierId = 1 }).IsValid);
        }

        [Fact]
        public async Task ZeroOrNegativeAmounts_AreRefusedByTheTable()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var s = ProformaSale(scope);
            scope.Context.PartyLedgerEntries.Add(new Domain.Entities.PartyLedgerEntry
            {
                CustomerId = s.Customer.Id,
                Direction = PartyLedgerDirectionEnum.DEBIT,
                Amount = 0,
                EntryType = PartyLedgerEntryTypeEnum.SALE_INVOICE,
                OccurredAt = DateTime.Now,
                CreatedAt = DateTime.Now,
            });

            await Assert.ThrowsAsync<DbUpdateException>(() => scope.Context.SaveChangesAsync());
        }
    }
}
