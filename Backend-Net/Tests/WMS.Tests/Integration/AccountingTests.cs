using Application.Common.Dtos;
using Application.Common.Dtos.Returns;
using Application.Common.DataTransfer;
using Application.Features.Accounting;
using Application.Features.Accounting.DataTransfer;
using Application.Features.Accounting.Dtos;
using Application.Features.Accounting.Queries;
using Application.Features.Purchase.Commands;
using Application.Features.Purchase.Dtos;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.SaleInstallment.Commands;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Migrations;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;
using PR = Application.Features.PurchaseReturn.Commands;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// The accounting dashboard and its journals, over one realistic history written through the real handlers (so the
    /// party ledger is the one the live code writes), plus the party-ledger backfill migration replayed against it.
    /// </summary>
    public class AccountingTests
    {
        private static readonly CancellationToken Ct = CancellationToken.None;

        /// <summary>Who is who in <see cref="BuildHistoryAsync"/>.</summary>
        private sealed record History(
            int SaleA, int CustomerA, // issued 10,000, paid 4,000 (+1,000 voided), due 45 days ago: 6,000 overdue
            int SaleB, int CustomerB, // paid 5,000, cancelled, refunded: 0
            int SaleC, int CustomerC, // installment: 10,000,000 + 2,000,000 charge, 2,000,000 down: 10,000,000 in 4 future installments
            int PurchaseP1, int Supplier1, // prepaid 3,000, invoiced 9,000, paid 6,000: 0
            int PurchaseP2, int Supplier2, // 10 ordered and paid, 8 arrived, line closed short, 2,000 refunded: 0
            int PurchaseP3, int Supplier3); // invoiced 10,000, a return settled 600 on account: we owe 9,400

        private static SaleScenario ProformaSale(TestScope scope, ulong total)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0, unitPrice: total);
            scenario.Sale.Status = SalesStatusEnum.PROFORMA;
            scenario.Sale.InvoiceNumber = "";
            scenario.Sale.InvoiceDate = null;
            scenario.Sale.PaidAmount = 0;
            scenario.Sale.TotalAmount = total;
            scope.Context.SaveChanges();
            return scenario;
        }

        private static async Task<History> BuildHistoryAsync(TestScope scope)
        {
            var addSalePayment = new AddSalePaymentCommandHandler(scope.Db, scope.PosPaymentGuard, FakeObjectStorage.Instance, scope.UnitOfWork, scope.SaleReturnCalculation);
            var purchaseStatus = new ChangePurchaseStatusCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork);
            var addPurchasePayment = new AddPurchasePaymentCommandHandler(scope.Db, scope.PosPaymentGuard, FakeObjectStorage.Instance, scope.UnitOfWork);
            var receive = new ReceivePurchaseCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.ProductUnitService, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork);

            // A: 4,000 paid, 1,000 paid and voided, due 45 days ago.
            var a = ProformaSale(scope, 10_000);
            await addSalePayment.Handle(new AddSalePaymentCommand { SaleId = a.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 4_000 }, Ct);
            var voided = Assert.IsType<SaleDto>((await addSalePayment.Handle(new AddSalePaymentCommand { SaleId = a.Sale.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 1_000 }, Ct)).Data);
            await new VoidSalePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, scope.SaleReturnCalculation)
                .Handle(new VoidSalePaymentCommand { PaymentId = voided.PaymentDetails.Single(p => p.Amount == 1_000).Id }, Ct);
            a.Sale.PaymentDate = DateTime.Now.Date.AddDays(-45);
            scope.Context.SaveChanges();

            // B: paid in full, cancelled, refunded.
            var b = ProformaSale(scope, 5_000);
            await addSalePayment.Handle(new AddSalePaymentCommand { SaleId = b.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 5_000 }, Ct);
            await new ChangeSaleStatusCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork, scope.SaleReturnCalculation)
                .Handle(new ChangeSaleStatusCommand { Id = b.Sale.Id, Status = SalesStatusEnum.CANCELLED }, Ct);
            await addSalePayment.Handle(new AddSalePaymentCommand { SaleId = b.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 5_000, Direction = PaymentDirectionEnum.OUT }, Ct);

            // C: installment sale.
            var c = ProformaSale(scope, 10_000_000);
            c.Sale.PaymentType = PaymentTypeEnum.INSTALLMENT;
            scope.Context.SaveChanges();
            await new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork).Handle(new CreateSaleInstallmentPlanCommand
            {
                SaleId = c.Sale.Id,
                MarkupPercentage = 20m,
                DownPaymentAmount = 2_000_000,
                InstallmentCount = 4,
                FirstDueDate = DateTime.Now.Date.AddMonths(1),
                PaymentType = PaymentTypeEnum.CASH,
            }, Ct);

            // P1: prepayment on the proforma, invoice recorded, paid off.
            var p1 = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, stock: 0, unitPrice: 9_000);
            p1.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            scope.Context.SaveChanges();
            await addPurchasePayment.Handle(new AddPurchasePaymentCommand { PurchaseId = p1.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 3_000 }, Ct);
            await purchaseStatus.Handle(new ChangePurchaseStatusCommand { Id = p1.Purchase.Id, Status = PurchaseStatusEnum.PENDING }, Ct);
            await addPurchasePayment.Handle(new AddPurchasePaymentCommand { PurchaseId = p1.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 6_000 }, Ct);

            // P2: 10 ordered and paid, 8 arrive, the line is closed short and the supplier refunds the 2.
            var p2 = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0, unitPrice: 1_000);
            p2.Item.TotalAmount = 10_000;
            p2.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            scope.Context.SaveChanges();
            await purchaseStatus.Handle(new ChangePurchaseStatusCommand { Id = p2.Purchase.Id, Status = PurchaseStatusEnum.SHIPPED }, Ct);
            await addPurchasePayment.Handle(new AddPurchasePaymentCommand { PurchaseId = p2.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 10_000 }, Ct);
            await receive.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = p2.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = p2.Item.Id, ArrivedQuantity = 8 } },
            }, Ct);
            await new ClosePurchaseItemCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.UnitOfWork)
                .Handle(new ClosePurchaseItemCommand { PurchaseItemId = p2.Item.Id }, Ct);
            await addPurchasePayment.Handle(new AddPurchasePaymentCommand
            {
                PurchaseId = p2.Purchase.Id, Type = PaymentTypeEnum.TRANSFER, Amount = 2_000, Direction = PaymentDirectionEnum.IN,
            }, Ct);

            // P3: invoice recorded, 5 received, a return settled 400 in cash and 600 on account.
            var p3 = Seed.PendingPurchase(scope.Context, orderedQuantity: 10, stock: 0, unitPrice: 1_000);
            p3.Purchase.Status = PurchaseStatusEnum.PROFORMA;
            scope.Context.SaveChanges();
            await purchaseStatus.Handle(new ChangePurchaseStatusCommand { Id = p3.Purchase.Id, Status = PurchaseStatusEnum.SHIPPED }, Ct);
            await receive.Handle(new ReceivePurchaseCommand
            {
                PurchaseId = p3.Purchase.Id,
                Items = new() { new ReceivePurchaseItemDto { PurchaseItemId = p3.Item.Id, ArrivedQuantity = 5 } },
            }, Ct);
            await new PR.CreatePurchaseReturnCommandHandler(scope.Db, scope.PurchaseReturnRepository, scope.PurchaseReturnCalculation, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.CreatePurchaseReturnCommand
                {
                    PurchaseId = p3.Purchase.Id,
                    Claims = new() { new CreateReturnClaimDto { Scope = ReturnClaimScopeEnum.ON_ORDER, OrderLineId = p3.Item.Id, ProductId = p3.Product.Id, UnitPrice = p3.Item.UnitPrice, Quantity = 3, Problem = ReturnProblemEnum.DEFECTIVE } },
                }, Ct);
            var claimId = scope.Context.PurchaseReturnClaims.Single().Id;
            await new PR.AddClaimResolutionCommandHandler(scope.Db, scope.PurchaseReturnCalculation, scope.InventoryCostingService, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new PR.AddClaimResolutionCommand
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
                }, Ct);

            return new History(a.Sale.Id, a.Customer.Id, b.Sale.Id, b.Customer.Id, c.Sale.Id, c.Customer.Id,
                p1.Purchase.Id, p1.Supplier.Id, p2.Purchase.Id, p2.Supplier.Id, p3.Purchase.Id, p3.Supplier.Id);
        }

        private static T Prop<T>(ResponseDto res, string name) => (T)res.Data!.GetType().GetProperty(name)!.GetValue(res.Data)!;

        // ------------------------------------------------------------------ party balances

        [Fact]
        public async Task PartyBalanceList_ReadsTheLedger_AndAgesWhatIsStillOwed()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var h = await BuildHistoryAsync(scope);

            using var read = db.NewScope();
            var res = await new GetPartyBalanceListQueryHandler(read.Db).Handle(new GetPartyBalanceListQuery { Take = 100 }, Ct);
            var rows = Prop<List<PartyBalanceRowDto>>(res, "PartyBalanceList");
            PartyBalanceRowDto Row(AccountingPartyTypeEnum type, int id) => rows.Single(x => x.PartyType == type && x.PartyId == id);

            Assert.Equal(6_000m, Row(AccountingPartyTypeEnum.CUSTOMER, h.CustomerA).Balance);
            Assert.Equal(6_000m, Row(AccountingPartyTypeEnum.CUSTOMER, h.CustomerA).Aging.Days31To60);
            Assert.Equal(0m, Row(AccountingPartyTypeEnum.CUSTOMER, h.CustomerB).Balance);
            Assert.Equal(10_000_000m, Row(AccountingPartyTypeEnum.CUSTOMER, h.CustomerC).Balance);
            Assert.Equal(10_000_000m, Row(AccountingPartyTypeEnum.CUSTOMER, h.CustomerC).Aging.NotDue);
            Assert.Equal(4, Row(AccountingPartyTypeEnum.CUSTOMER, h.CustomerC).OpenItemCount);
            Assert.Equal(0m, Row(AccountingPartyTypeEnum.SUPPLIER, h.Supplier1).Balance);
            Assert.Equal(0m, Row(AccountingPartyTypeEnum.SUPPLIER, h.Supplier2).Balance);
            Assert.Equal(-9_400m, Row(AccountingPartyTypeEnum.SUPPLIER, h.Supplier3).Balance);

            var summary = Prop<PartyBalanceSummaryDto>(res, "Summary");
            Assert.Equal(10_006_000m, summary.TotalReceivable);
            Assert.Equal(9_400m, summary.TotalPayable);
            Assert.Equal(6_000m, summary.ReceivableAging.Days31To60);
            Assert.Equal(6_000m, summary.ReceivableAging.Overdue);
            Assert.Equal(10_000m, summary.PayableAging.NotDue); // P3 has paid nothing on its invoice yet

            // Default order: the biggest debtor first.
            Assert.Equal(h.CustomerC, rows.First().PartyId);

            var debtors = Prop<List<PartyBalanceRowDto>>(await new GetPartyBalanceListQueryHandler(read.Db)
                .Handle(new GetPartyBalanceListQuery { BalanceState = PartyBalanceStateEnum.DEBTOR, Take = 100 }, Ct), "PartyBalanceList");
            Assert.Equal(new[] { h.CustomerA, h.CustomerC }.OrderBy(x => x), debtors.Select(x => x.PartyId).OrderBy(x => x));

            var overdue = Prop<List<PartyBalanceRowDto>>(await new GetPartyBalanceListQueryHandler(read.Db)
                .Handle(new GetPartyBalanceListQuery { OverdueOnly = true, Take = 100 }, Ct), "PartyBalanceList");
            Assert.Equal(h.CustomerA, Assert.Single(overdue).PartyId);

            var suppliers = Prop<List<PartyBalanceRowDto>>(await new GetPartyBalanceListQueryHandler(read.Db)
                .Handle(new GetPartyBalanceListQuery { PartyType = AccountingPartyTypeEnum.SUPPLIER, Take = 100 }, Ct), "PartyBalanceList");
            Assert.All(suppliers, x => Assert.Equal(AccountingPartyTypeEnum.SUPPLIER, x.PartyType));
        }

        [Fact]
        public async Task PartyLedgerEntryList_TotalsEveryRow_AndCanHideWhatWasTakenBack()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var h = await BuildHistoryAsync(scope);

            using var read = db.NewScope();
            var handler = new GetPartyLedgerEntryListQueryHandler(read.Db);
            var all = await handler.Handle(new GetPartyLedgerEntryListQuery { Take = 200 }, Ct);
            var summary = Prop<PartyLedgerEntrySummaryDto>(all, "Summary");
            // Net of every row = receivables - payables of the balance table.
            Assert.Equal(10_006_000m - 9_400m, summary.Net);
            Assert.Equal(read.Context.PartyLedgerEntries.Count(), summary.Count);

            var rows = Prop<List<PartyLedgerEntryRowDto>>(all, "PartyLedgerEntryList");
            Assert.Contains(rows, x => x.IsReversed && x.EntryType == PartyLedgerEntryTypeEnum.PAYMENT && x.PartyId == h.CustomerA);
            Assert.All(rows, x => Assert.False(string.IsNullOrEmpty(x.EntryTypeTitle)));

            // Without the voided payment, the cancelled invoice and their reversals the net is the same.
            var standing = await handler.Handle(new GetPartyLedgerEntryListQuery { ExcludeReversed = true, Take = 200 }, Ct);
            Assert.Equal(summary.Net, Prop<PartyLedgerEntrySummaryDto>(standing, "Summary").Net);
            Assert.DoesNotContain(Prop<List<PartyLedgerEntryRowDto>>(standing, "PartyLedgerEntryList"), x => x.IsReversed || x.EntryType == PartyLedgerEntryTypeEnum.REVERSAL);

            var payments = await handler.Handle(new GetPartyLedgerEntryListQuery { CustomerId = h.CustomerA, EntryTypes = new() { PartyLedgerEntryTypeEnum.PAYMENT }, Take = 200 }, Ct);
            Assert.Equal(2, Prop<PartyLedgerEntrySummaryDto>(payments, "Summary").Count);
            Assert.All(Prop<List<PartyLedgerEntryRowDto>>(payments, "PartyLedgerEntryList"), x => Assert.NotNull(x.PaymentType));
        }

        // ------------------------------------------------------------------ journals

        [Fact]
        public async Task SaleJournal_ShowsIssuedInvoices_WithPayableAndRemaining()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var h = await BuildHistoryAsync(scope);

            using var read = db.NewScope();
            var handler = new GetSaleJournalQueryHandler(read.Db);
            var res = await handler.Handle(new GetSaleJournalQuery { Take = 100 }, Ct);
            var rows = Prop<List<SaleJournalRowDto>>(res, "SaleJournal");

            // Cancelled B is not an issued invoice.
            Assert.Equal(new[] { h.SaleA, h.SaleC }.OrderBy(x => x), rows.Select(x => x.Id).OrderBy(x => x));
            var a = rows.Single(x => x.Id == h.SaleA);
            Assert.Equal((10_000m, 4_000m, 6_000m, 45), (a.PayableAmount, a.PaidAmount, a.RemainingAmount, a.OverdueDays!.Value));
            var c = rows.Single(x => x.Id == h.SaleC);
            Assert.True(c.HasInstallmentPlan);
            Assert.Equal((2_000_000m, 12_000_000m, 10_000_000m), (c.InstallmentChargeAmount, c.PayableAmount, c.RemainingAmount));
            Assert.Null(c.OverdueDays);

            var summary = Prop<JournalSummaryDto>(res, "Summary");
            Assert.Equal(2, summary.Count);
            Assert.Equal(10_010_000m, summary.TotalAmount);
            Assert.Equal(12_010_000m, summary.PayableAmount);
            Assert.Equal(10_006_000m, summary.RemainingAmount);

            var overdue = await handler.Handle(new GetSaleJournalQuery { PaymentState = InvoicePaymentStateEnum.OVERDUE }, Ct);
            Assert.Equal(h.SaleA, Assert.Single(Prop<List<SaleJournalRowDto>>(overdue, "SaleJournal")).Id);

            var cancelled = await handler.Handle(new GetSaleJournalQuery { Statuses = new() { SalesStatusEnum.CANCELLED } }, Ct);
            Assert.Equal(h.SaleB, Assert.Single(Prop<List<SaleJournalRowDto>>(cancelled, "SaleJournal")).Id);
        }

        [Fact]
        public async Task PurchaseJournal_TakesTheShortClosedShareOffWhatIsPayable()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var h = await BuildHistoryAsync(scope);

            using var read = db.NewScope();
            var res = await new GetPurchaseJournalQueryHandler(read.Db).Handle(new GetPurchaseJournalQuery { Take = 100 }, Ct);
            var rows = Prop<List<PurchaseJournalRowDto>>(res, "PurchaseJournal");

            var p2 = rows.Single(x => x.Id == h.PurchaseP2);
            Assert.Equal((10_000m, 2_000m, 8_000m, 8_000m, 0m), (p2.TotalAmount, p2.ShortClosedAmount, p2.PayableAmount, p2.PaidAmount, p2.RemainingAmount));
            Assert.Equal(0m, rows.Single(x => x.Id == h.PurchaseP1).RemainingAmount);
            Assert.Equal(10_000m, rows.Single(x => x.Id == h.PurchaseP3).RemainingAmount);

            var open = await new GetPurchaseJournalQueryHandler(read.Db).Handle(new GetPurchaseJournalQuery { PaymentState = InvoicePaymentStateEnum.OPEN }, Ct);
            Assert.Equal(h.PurchaseP3, Assert.Single(Prop<List<PurchaseJournalRowDto>>(open, "PurchaseJournal")).Id);
            Assert.Equal(2_000m, Prop<JournalSummaryDto>(res, "Summary").ShortClosedAmount);
        }

        [Fact]
        public async Task PaymentJournal_CountsMoneyByMethod_AndNeverTheVoidedRow()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var h = await BuildHistoryAsync(scope);

            using var read = db.NewScope();
            var handler = new GetPaymentJournalQueryHandler(read.Db);
            var res = await handler.Handle(new GetPaymentJournalQuery { Take = 100 }, Ct);
            var summary = Prop<PaymentJournalSummaryDto>(res, "Summary");

            // In: 4,000 (A) + 5,000 (B) + 2,000,000 (C's down payment) + 2,000 (P2 refund).
            Assert.Equal(2_011_000m, summary.TotalIn);
            // Out: 5,000 (B refund) + 3,000 + 6,000 (P1) + 10,000 (P2).
            Assert.Equal(24_000m, summary.TotalOut);
            Assert.Equal(summary.TotalIn - summary.TotalOut, summary.Net);
            var transfer = summary.ByType.Single(x => x.Type == PaymentTypeEnum.TRANSFER);
            Assert.Equal((2_000m, 19_000m), (transfer.In, transfer.Out));
            Assert.Equal(summary.Count, Prop<List<PaymentJournalRowDto>>(res, "PaymentJournal").Count);

            var withVoided = await handler.Handle(new GetPaymentJournalQuery { IncludeVoided = true, Take = 100 }, Ct);
            Assert.Equal(summary.Count + 1, Prop<List<PaymentJournalRowDto>>(withVoided, "PaymentJournal").Count);
            Assert.Equal(summary.TotalIn, Prop<PaymentJournalSummaryDto>(withVoided, "Summary").TotalIn);

            var customerA = await handler.Handle(new GetPaymentJournalQuery { CustomerId = h.CustomerA }, Ct);
            var row = Assert.Single(Prop<List<PaymentJournalRowDto>>(customerA, "PaymentJournal"));
            Assert.Equal((AccountingPartyTypeEnum.CUSTOMER, h.CustomerA, h.SaleA), (row.PartyType, row.PartyId, row.SaleId!.Value));
        }

        [Fact]
        public async Task SaleLineJournal_TaxReport_AndBreakdown_ReadTheStoredLineAmounts()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var taxable = Seed.ShippedSale(scope.Context, orderedQuantity: 2, unitPrice: 50_000);
            SetLine(taxable.Item, net: 100_000, tax: 10_000, TaxCategoryEnum.TAXABLE);
            taxable.Sale.TotalAmount = 110_000;
            var exempt = Seed.ShippedSale(scope.Context, orderedQuantity: 1, unitPrice: 40_000);
            SetLine(exempt.Item, net: 40_000, tax: 0, TaxCategoryEnum.EXEMPT);
            var bought = Seed.PendingPurchase(scope.Context, orderedQuantity: 1, unitPrice: 60_000);
            SetLine(bought.Item, net: 60_000, tax: 6_000, TaxCategoryEnum.TAXABLE);
            // A proforma never reaches the tax report.
            var draft = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, unitPrice: 999);
            SetLine(draft.Item, net: 999, tax: 99, TaxCategoryEnum.TAXABLE);
            draft.Sale.Status = SalesStatusEnum.PROFORMA;
            scope.Context.SaveChanges();

            using var read = db.NewScope();
            var tax = await new GetTaxReportQueryHandler(read.Db).Handle(new GetTaxReportQuery(), Ct);
            var totals = Prop<TaxReportPeriodDto>(tax, "Totals");
            Assert.Equal((100_000m, 40_000m, 10_000m), (totals.TaxableSalesNet, totals.ExemptSalesNet, totals.OutputTax));
            Assert.Equal((60_000m, 6_000m, 4_000m), (totals.TaxablePurchasesNet, totals.InputTax, totals.NetTaxPayable));
            Assert.Equal((2, 1), (totals.SaleInvoiceCount, totals.PurchaseInvoiceCount));
            Assert.Equal(totals.OutputTax, Prop<List<TaxReportPeriodDto>>(tax, "Periods").Sum(x => x.OutputTax));

            var lines = await new GetSaleLineJournalQueryHandler(read.Db).Handle(new GetSaleLineJournalQuery { TaxCategory = TaxCategoryEnum.TAXABLE }, Ct);
            var line = Assert.Single(Prop<List<SaleLineJournalRowDto>>(lines, "SaleLineJournal"));
            Assert.Equal((2, 100_000m, 10_000m, 110_000m), (line.Quantity, line.NetAmount, line.TaxAmount, line.TotalAmount));

            var byParty = await new GetTradeBreakdownQueryHandler(read.Db).Handle(new GetTradeBreakdownQuery { GroupBy = TradeBreakdownGroupEnum.PARTY }, Ct);
            var groups = Prop<List<TradeBreakdownRowDto>>(byParty, "TradeBreakdown");
            Assert.Equal(new[] { 100_000m, 40_000m }, groups.Select(x => x.NetAmount));
            Assert.Equal(140_000m, Prop<TradeBreakdownSummaryDto>(byParty, "Summary").NetAmount);
            Assert.Equal(100m, groups.Sum(x => x.NetSharePercent));

            var purchases = await new GetTradeBreakdownQueryHandler(read.Db).Handle(new GetTradeBreakdownQuery { Side = DocumentSideEnum.PURCHASE }, Ct);
            Assert.Equal(bought.Product.Id, Assert.Single(Prop<List<TradeBreakdownRowDto>>(purchases, "TradeBreakdown")).Id);
        }

        private static void SetLine(IInvoiceLine line, ulong net, ulong tax, TaxCategoryEnum category)
        {
            line.GrossAmount = net;
            line.DiscountAmount = 0;
            line.NetAmount = net;
            line.TaxAmount = tax;
            line.TotalAmount = net + tax;
            line.TaxCategory = category;
        }

        [Fact]
        public async Task InventoryValuation_ReadsTheLatestLedgerRow_PlusWhatIsHeldOffPool()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var category = Seed.Category();
            var product = Seed.Product(category, "پیچ", stock: 3);
            scope.Context.Products.Add(product);
            scope.Context.SaveChanges();
            Entry(scope.Context, product.Id, 5, 5_000m, 1_000m, 0m);
            Entry(scope.Context, product.Id, 3, 3_300m, 1_100m, 0m);   // the latest pool state
            Entry(scope.Context, product.Id, 3, 3_300m, 1_100m, 2_000m); // paid-for goods into quarantine
            scope.Context.SaveChanges();

            using var read = db.NewScope();
            var res = await new GetInventoryValuationQueryHandler(read.Db).Handle(new GetInventoryValuationQuery { OnlyWithValue = true }, Ct);
            var row = Assert.Single(Prop<List<InventoryValuationRowDto>>(res, "InventoryValuation"));
            Assert.Equal((3, 1_100m, 3_300m, 2_000m, 5_300m), (row.LedgerQuantity, row.AverageCost, row.PoolValue, row.OffPoolValue, row.TotalValue));
            Assert.Equal(5_300m, Prop<InventoryValuationSummaryDto>(res, "Summary").TotalValue);
        }

        private static void Entry(Infrastructure.Persistence.WMSDbContext context, int productId, int quantity, decimal value, decimal average, decimal offPool) =>
            context.InventoryCostLedgerEntries.Add(new InventoryCostLedgerEntry
            {
                ProductId = productId,
                EventType = InventoryCostEventTypeEnum.MANUAL_ADJUSTMENT_IN,
                OccurredAt = DateTime.Now,
                CreatedAt = DateTime.Now,
                RunningQuantity = quantity,
                RunningInventoryValue = value,
                RunningAverageCost = average,
                OffPoolValueDelta = offPool,
            });

        // ------------------------------------------------------------------ dashboard

        [Fact]
        public async Task Dashboard_AgreesWithTheTablesItDrillsInto()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            await BuildHistoryAsync(scope);

            using var read = db.NewScope();
            var dashboard = Assert.IsType<AccountingDashboardDto>((await new GetAccountingDashboardQueryHandler(read.Db)
                .Handle(new GetAccountingDashboardQuery(), Ct)).Data);

            Assert.Equal(10_006_000m, dashboard.Receivables.Total);
            Assert.Equal(2, dashboard.Receivables.PartyCount);
            Assert.Equal(6_000m, dashboard.Receivables.Aging.Overdue);
            Assert.Equal(9_400m, dashboard.Payables.Total);

            Assert.Equal(2, dashboard.Sales.Count);
            Assert.Equal(10_010_000m, dashboard.Sales.TotalAmount);
            Assert.Equal(2_011_000m, dashboard.Cash.TotalIn);
            Assert.Equal(24_000m, dashboard.Cash.TotalOut);

            Assert.Equal((1, 6_000m), (dashboard.OverdueSales.Count, dashboard.OverdueSales.Amount));
            Assert.Equal((4, 10_000_000m, 0), (dashboard.Installments.OutstandingCount, dashboard.Installments.OutstandingAmount, dashboard.Installments.OverdueCount));
            Assert.Equal(1, dashboard.Installments.ActivePlanCount);

            // The chart buckets add up to the tiles.
            Assert.Equal(dashboard.Sales.TotalAmount, dashboard.Series.Sum(x => x.SalesTotal));
            Assert.Equal(dashboard.Cash.TotalIn, dashboard.Series.Sum(x => x.CashIn));
            Assert.Equal(dashboard.Purchases.TotalAmount, dashboard.Series.Sum(x => x.PurchasesTotal));
        }

        // ------------------------------------------------------------------ exports

        [Fact]
        public async Task EveryAccountingExport_Streams()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            await BuildHistoryAsync(scope);

            using var read = db.NewScope();
            IDataTransferDefinition[] definitions =
            {
                new PartyBalanceDataTransferDefinition(read.Db),
                new PartyLedgerDataTransferDefinition(read.Db),
                new SaleJournalDataTransferDefinition(read.Db),
                new PurchaseJournalDataTransferDefinition(read.Db),
                new SaleLineJournalDataTransferDefinition(read.Db),
                new PaymentJournalDataTransferDefinition(read.Db),
                new InventoryValuationDataTransferDefinition(read.Db),
            };
            foreach (var definition in definitions)
            {
                var export = definition.Export!;
                Assert.Equal(PermissionEnum.AccountingView, export.Permission);
                Assert.Null(definition.Import);
                var filter = Activator.CreateInstance(export.FilterType)!;
                var count = await export.CountAsync(filter, Ct);
                var rows = new List<IReadOnlyList<object?>>();
                await foreach (var row in export.ReadRowsAsync(filter, Ct))
                    rows.Add(row);
                Assert.Equal(count, rows.Count);
                Assert.All(rows, r => Assert.Equal(export.Columns.Count, r.Count));
            }
        }

        // ------------------------------------------------------------------ backfill

        private static async Task<Dictionary<(AccountingPartyTypeEnum, int), decimal>> BalancesAsync(TestDatabase db)
        {
            using var read = db.NewScope();
            return (await PartyBalances.Rows(read.Db).Select(x => new { x.PartyType, x.PartyId, x.Balance }).ToListAsync())
                .ToDictionary(x => (x.PartyType, x.PartyId), x => x.Balance);
        }

        private static async Task RunBackfillAsync(TestDatabase db)
        {
            using var context = db.NewContext();
            foreach (var sql in partyledgerbackfill.UpStatements)
                await context.Database.ExecuteSqlRawAsync(sql);
        }

        /// <summary>
        /// The migration's SQL reproduces, from the documents alone, the balances the live ledger code wrote - and run
        /// against a ledger that is already complete, it writes nothing.
        /// </summary>
        [Fact]
        public async Task Backfill_RebuildsTheLiveBalancesFromTheDocuments_AndIsIdempotent()
        {
            using var db = new TestDatabase();
            using (var scope = db.NewScope())
                await BuildHistoryAsync(scope);

            var live = await BalancesAsync(db);
            int Count() { using var c = db.NewContext(); return c.PartyLedgerEntries.Count(); }
            var liveCount = Count();

            // Complete ledger: nothing to fill.
            await RunBackfillAsync(db);
            Assert.Equal(liveCount, Count());

            // Ledger lost entirely (the pre-ledger state): rebuilt to the same balances.
            using (var context = db.NewContext())
                await context.Database.ExecuteSqlRawAsync("DELETE FROM PartyLedgerEntries");
            await RunBackfillAsync(db);
            Assert.Equal(live, await BalancesAsync(db));

            using (var context = db.NewContext())
                Assert.All(context.PartyLedgerEntries.ToList(), e => Assert.EndsWith("(ثبت تکمیلی)", e.Description));

            // And again: no duplicates.
            var rebuiltCount = Count();
            await RunBackfillAsync(db);
            Assert.Equal(rebuiltCount, Count());
        }

        /// <summary>A document issued before the ledger next to ones handled live: only the gap is filled.</summary>
        [Fact]
        public async Task Backfill_FillsOnlyTheGap_NextToLiveRows()
        {
            using var db = new TestDatabase();
            using (var scope = db.NewScope())
                await BuildHistoryAsync(scope);
            var live = await BalancesAsync(db);

            // Sale A's rows "never existed": its invoice and its standing payment are missing, the rest is live.
            using (var context = db.NewContext())
            {
                var saleA = context.Sales.Where(x => x.PaymentDate != null && x.PaymentDate < DateTime.Now.Date).Select(x => x.Id).Single();
                await context.Database.ExecuteSqlRawAsync(
                    "DELETE r FROM PartyLedgerEntries r WHERE r.SaleId = {0} AND r.ReversalOfEntryId IS NOT NULL; DELETE FROM PartyLedgerEntries WHERE SaleId = {0}", saleA);
            }
            await RunBackfillAsync(db);

            Assert.Equal(live, await BalancesAsync(db));
            using var verify = db.NewContext();
            // Two rows rebuilt for A (invoice, the standing payment) - the voided payment and its reversal net to nothing.
            Assert.Equal(2, verify.PartyLedgerEntries.Count(e => e.Description!.EndsWith("(ثبت تکمیلی)")));
        }
    }
}
