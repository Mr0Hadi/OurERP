using Application.Common.Installments;
using Application.Common.Ledger;
using Application.Common.Settings;
using Application.Features.Cheque.Commands;
using Application.Features.SaleInstallment.Commands;
using Application.Features.SaleInstallment.Dtos;
using Application.Features.Setting.Commands;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// GAP-26: overdue marking, late penalty (and its waiver), early-settlement discount, and a sale return's on-account refund
    /// shortening the plan.
    /// </summary>
    public class InstallmentCompletionTests
    {
        private static IMediator Mediator(TestScope scope) => ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);

        /// <summary>
        /// An issued installment sale of 10,000,000 cash with a 20% charge (2,000,000), 2,000,000 down and 5 installments of
        /// 2,000,000, the first due on <paramref name="firstDue"/>.
        /// </summary>
        private static async Task<(SaleScenario Scenario, SaleInstallmentPlanDto Plan)> PlanAsync(IMediator mediator, TestScope scope, DateTime firstDue, decimal? latePenalty = null)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0, unitPrice: 10_000_000);
            scenario.Sale.Status = SalesStatusEnum.PROFORMA;
            scenario.Sale.ProformaStage = SaleProformaStageEnum.WAREHOUSE_CHECKED;
            scenario.Sale.InvoiceNumber = "";
            scenario.Sale.InvoiceDate = null;
            scenario.Sale.PaymentType = PaymentTypeEnum.INSTALLMENT;
            scenario.Sale.TotalAmount = 10_000_000;
            scope.Context.SaveChanges();

            var plan = Assert.IsType<SaleInstallmentPlanDto>((await mediator.Send(new CreateSaleInstallmentPlanCommand
            {
                SaleId = scenario.Sale.Id,
                MarkupPercentage = 20m,
                DownPaymentAmount = 2_000_000,
                InstallmentCount = 5,
                FirstDueDate = firstDue,
                LatePenaltyPercentage = latePenalty,
                PaymentType = PaymentTypeEnum.CASH,
                // A contract signed back then: the first due date cannot precede the down payment.
                PaidAt = firstDue < DateTime.Today ? firstDue : null,
            })).Data);
            return (scenario, plan);
        }

        private static Task SettingAsync(IMediator mediator, SystemSettingDefinition setting, string value) =>
            mediator.Send(new UpdateSystemSettingsCommand { Settings = new() { new() { Key = setting.Key, Value = value } } });

        [Fact]
        public async Task OverdueMarking_FlagsUnpaidRowsPastDueDatePlusGrace_Only()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            // Monthly from 70 days ago: rows due ~70, ~40 and ~10 days ago, then two in the future.
            var (scenario, plan) = await PlanAsync(mediator, scope, DateTime.Today.AddDays(-70));
            var dues = plan.Installments.OrderBy(i => i.Number).Select(i => i.DueDate).ToList();
            await SettingAsync(mediator, SystemSettingCatalog.InstallmentOverdueGraceDays, ((DateTime.Today - dues[2]).Days + 1).ToString());

            var marked = (int)(await mediator.Send(new MarkOverdueSaleInstallmentsCommand(), TestContext.Current.CancellationToken)).Data!;

            Assert.Equal(2, marked);
            using var verify = db.NewContext();
            var statuses = verify.SaleInstallments.Where(x => x.Plan.SaleId == scenario.Sale.Id).OrderBy(x => x.Number).Select(x => x.Status).ToList();
            Assert.Equal(new[] { SaleInstallmentStatusEnum.OVERDUE, SaleInstallmentStatusEnum.OVERDUE, SaleInstallmentStatusEnum.PENDING,
                SaleInstallmentStatusEnum.PENDING, SaleInstallmentStatusEnum.PENDING }, statuses);
            // A second run finds nothing new.
            Assert.Equal(0, (int)(await mediator.Send(new MarkOverdueSaleInstallmentsCommand(), TestContext.Current.CancellationToken)).Data!);
        }

        [Fact]
        public async Task PayingALateInstallment_ChargesThePenalty_InTheSamePayment_AndOnTheAccount_WaiverIncluded()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            // 3% a month on a 2,000,000 installment, 30 days late = 60,000.
            var (scenario, plan) = await PlanAsync(mediator, scope, DateTime.Today.AddDays(-30), latePenalty: 3m);
            var first = plan.Installments.OrderBy(i => i.Number).First();
            Assert.Equal(30, first.DaysLate);
            Assert.Equal(60_000UL, first.PenaltyDue);

            await Assert.ThrowsAsync<ValidationCustomException>(() => mediator.Send(new WaiveSaleInstallmentPenaltyCommand { SaleInstallmentId = first.Id, Amount = 10_000 }, TestContext.Current.CancellationToken));
            plan = Assert.IsType<SaleInstallmentPlanDto>((await mediator.Send(new WaiveSaleInstallmentPenaltyCommand { SaleInstallmentId = first.Id, Amount = 10_000, Reason = "مشتری قدیمی" }, TestContext.Current.CancellationToken)).Data);
            Assert.Equal(50_000UL, plan.Installments.Single(i => i.Id == first.Id).PenaltyDue);

            plan = Assert.IsType<SaleInstallmentPlanDto>((await mediator.Send(new PaySaleInstallmentCommand { SaleInstallmentId = first.Id, PaymentType = PaymentTypeEnum.CASH }, TestContext.Current.CancellationToken)).Data);

            var paid = plan.Installments.Single(i => i.Id == first.Id);
            Assert.Equal(50_000UL, paid.PenaltyAmount);
            Assert.Equal(50_000UL, plan.PenaltyPaidAmount);
            // The penalty is outside the contract: paid = down payment + the installment.
            Assert.Equal(4_000_000UL, plan.PaidAmount);

            using var verify = db.NewContext();
            Assert.Equal(2_050_000m, verify.PaymentDetails.Single(x => x.Id == paid.PaymentDetailId).Amount);
            Assert.Equal(4_000_000UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
            var penaltyRow = verify.PartyLedgerEntries.Single(x => x.EntryType == PartyLedgerEntryTypeEnum.LATE_PENALTY);
            Assert.Equal(50_000UL, penaltyRow.Amount);
            Assert.Equal(PartyLedgerDirectionEnum.DEBIT, penaltyRow.Direction);
        }

        [Fact]
        public async Task EarlySettlement_ForgivesTheChargeOfRowsNotYetDue_ByTheSettingsPercentage()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            await SettingAsync(mediator, SystemSettingCatalog.InstallmentEarlySettlementDiscountPercentage, "50");
            var (scenario, plan) = await PlanAsync(mediator, scope, DateTime.Today.AddMonths(1));

            // Every row is in the future: each carries 2,000,000 x 2,000,000 / 10,000,000 = 400,000 of the charge; half is forgiven.
            plan = Assert.IsType<SaleInstallmentPlanDto>((await mediator.Send(new SettleSaleInstallmentPlanCommand { PlanId = plan.Id, PaymentType = PaymentTypeEnum.CASH }, TestContext.Current.CancellationToken)).Data);

            Assert.Equal(SaleInstallmentPlanStatusEnum.SETTLED, plan.Status);
            Assert.Equal(1_000_000UL, plan.EarlySettlementDiscountAmount);
            Assert.Equal(1_000_000UL, plan.InstallmentChargeAmount);
            Assert.Equal(11_000_000UL, plan.TotalAmount);
            Assert.Equal(11_000_000UL, plan.PaidAmount);
            Assert.All(plan.Installments, i => Assert.Equal(200_000UL, i.EarlySettlementDiscountAmount));

            using var verify = db.NewContext();
            Assert.Equal(11_000_000UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
            // The customer's account: invoice 10M + charge now 1M, paid 2M + 9M = settled.
            Assert.Equal(0, await PartyLedger.BalanceAsync(scope.Context, scenario.Customer.Id, null, CancellationToken.None));
        }

        [Fact]
        public async Task ABouncedSettlementCheque_PutsTheInstallmentsAndTheDiscountBack()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (scenario, plan) = await PlanAsync(mediator, scope, DateTime.Today.AddMonths(1));

            plan = Assert.IsType<SaleInstallmentPlanDto>((await mediator.Send(new SettleSaleInstallmentPlanCommand
            {
                PlanId = plan.Id,
                PaymentType = PaymentTypeEnum.CHECK,
                CheckNumber = "123456",
                CheckDueDate = DateTime.Today.AddDays(10),
            }, TestContext.Current.CancellationToken)).Data);
            Assert.Equal(2_000_000UL, plan.EarlySettlementDiscountAmount);
            var chequeId = plan.Installments.First().PaymentDetailId!.Value;

            await mediator.Send(new BounceCheckCommand { PaymentDetailId = chequeId, Note = "کسری موجودی" }, TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            var reloaded = verify.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.Id == plan.Id);
            Assert.Equal(SaleInstallmentPlanStatusEnum.ACTIVE, reloaded.Status);
            Assert.All(reloaded.Installments, i => Assert.Equal(SaleInstallmentStatusEnum.PENDING, i.Status));
            Assert.All(reloaded.Installments, i => Assert.Equal(2_000_000UL, i.Amount));
            Assert.Equal(0UL, reloaded.EarlySettlementDiscountAmount);
            Assert.Equal(12_000_000UL, reloaded.TotalAmount);
            Assert.Equal(2_000_000UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
            // Back to owing everything but the down payment.
            Assert.Equal(10_000_000, await PartyLedger.BalanceAsync(scope.Context, scenario.Customer.Id, null, CancellationToken.None));
        }

        [Fact]
        public async Task AReturnRefundLeftOnAccount_ShortensThePlanFromTheEnd_AndRemovingItPutsItBack()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (scenario, plan) = await PlanAsync(mediator, scope, DateTime.Today.AddMonths(1));
            var sale = scope.Context.Sales.Single(x => x.Id == scenario.Sale.Id);
            var refund = new SaleReturnEffect { Direction = ReturnEffectDirectionEnum.MONEY_OUT, Method = ReturnPaymentMethodEnum.ON_ACCOUNT, Amount = 3_000_000 };

            await SaleReturnMoney.RecordAsync(scope.Context, sale, "R-1", claimId: 77, refund, reversal: false, DateTime.Now, CancellationToken.None);
            await scope.Context.SaveChangesAsync(TestContext.Current.CancellationToken);

            using (var verify = db.NewContext())
            {
                var shortened = verify.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.Id == plan.Id);
                Assert.Equal(3_000_000UL, shortened.ReturnCreditAmount);
                var rows = shortened.Installments.OrderBy(i => i.Number).ToList();
                Assert.Equal(new[] { 2_000_000UL, 2_000_000UL, 2_000_000UL, 1_000_000UL, 0UL }, rows.Select(i => i.Amount));
                Assert.Equal(SaleInstallmentStatusEnum.CANCELLED, rows[4].Status);
                Assert.Equal(5_000_000UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
                Assert.Equal(7_000_000UL, shortened.RemainingAmount);
            }

            await SaleReturnMoney.RecordAsync(scope.Context, sale, "R-1", claimId: 77, refund, reversal: true, DateTime.Now, CancellationToken.None);
            await scope.Context.SaveChangesAsync(TestContext.Current.CancellationToken);

            using var after = db.NewContext();
            var restored = after.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.Id == plan.Id);
            Assert.Equal(0UL, restored.ReturnCreditAmount);
            Assert.Equal(10_000_000UL, restored.RemainingAmount);
            Assert.Equal(2_000_000UL, after.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
            Assert.Equal(10_000_000UL, restored.Installments.Where(i => i.Status == SaleInstallmentStatusEnum.PENDING).Aggregate(0UL, (s, i) => s + i.Amount));
        }

        [Fact]
        public async Task ACashRefund_LeavesThePlanAlone()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (scenario, plan) = await PlanAsync(mediator, scope, DateTime.Today.AddMonths(1));
            var sale = scope.Context.Sales.Single(x => x.Id == scenario.Sale.Id);

            await SaleReturnMoney.RecordAsync(scope.Context, sale, "R-2", claimId: 78,
                new SaleReturnEffect { Direction = ReturnEffectDirectionEnum.MONEY_OUT, Method = ReturnPaymentMethodEnum.CASH, Amount = 3_000_000 },
                reversal: false, DateTime.Now, CancellationToken.None);
            await scope.Context.SaveChangesAsync(TestContext.Current.CancellationToken);

            using var verify = db.NewContext();
            Assert.Equal(0UL, verify.SaleInstallmentPlans.Single(x => x.Id == plan.Id).ReturnCreditAmount);
        }

        // ── docs/frontend-requests.fa.md section 25 ─────────────────────────────────────────────────────────────────

        [Fact]
        public async Task InstallmentList_FiltersSeveralStatuses_AndCarriesThePenaltyOnTheRow()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var (_, plan) = await PlanAsync(mediator, scope, DateTime.Today.AddDays(-30), latePenalty: 3m);
            await mediator.Send(new MarkOverdueSaleInstallmentsCommand(), TestContext.Current.CancellationToken);

            async Task<List<SaleInstallmentListDto>> ListAsync(Application.Features.SaleInstallment.Queries.GetSaleInstallmentListQuery query)
            {
                query.PlanId = plan.Id;
                query.Take = 50;
                var data = (await mediator.Send(query, TestContext.Current.CancellationToken)).Data!;
                return (List<SaleInstallmentListDto>)data.GetType().GetProperty("SaleInstallmentList")!.GetValue(data)!;
            }

            var unpaid = await ListAsync(new() { Statuses = new() { SaleInstallmentStatusEnum.PENDING, SaleInstallmentStatusEnum.OVERDUE } });
            Assert.Equal(5, unpaid.Count);
            Assert.Equal(5, (await ListAsync(new() { UnpaidOnly = true })).Count);
            Assert.Single(await ListAsync(new() { Statuses = new() { SaleInstallmentStatusEnum.OVERDUE } }));
            Assert.Empty(await ListAsync(new() { Statuses = new() { SaleInstallmentStatusEnum.PAID } }));

            // 3% a month on 2,000,000, 30 days late - the same numbers the plan detail shows.
            var first = unpaid.OrderBy(i => i.Number).First();
            Assert.Equal(30, first.DaysLate);
            Assert.Equal(60_000UL, first.PenaltyDue);
            Assert.Equal(3m, first.LatePenaltyPercentage);
        }

        [Fact]
        public async Task SettlementPreview_IsExactlyWhatTheSettlementCharges()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            // One row late (with a penalty), four not yet due (discounted at 50%).
            var (_, plan) = await PlanAsync(mediator, scope, DateTime.Today.AddDays(-30), latePenalty: 3m);
            await SettingAsync(mediator, SystemSettingCatalog.InstallmentEarlySettlementDiscountPercentage, "50");

            var detail = Assert.IsType<SaleInstallmentPlanDto>((await mediator.Send(
                new Application.Features.SaleInstallment.Queries.GetSaleInstallmentPlanDetailQuery { PlanId = plan.Id }, TestContext.Current.CancellationToken)).Data);
            Assert.NotNull(detail.SettlementAmountToday);
            Assert.True(detail.EarlySettlementDiscountPreview > 0);
            Assert.Equal(detail.RemainingAmount - detail.EarlySettlementDiscountPreview!.Value + detail.PenaltyDueAmount, detail.SettlementAmountToday);

            var settled = Assert.IsType<SaleInstallmentPlanDto>((await mediator.Send(new SettleSaleInstallmentPlanCommand { PlanId = plan.Id, PaymentType = PaymentTypeEnum.CASH }, TestContext.Current.CancellationToken)).Data);

            Assert.Equal(detail.EarlySettlementDiscountPreview, settled.EarlySettlementDiscountAmount);
            Assert.Equal((decimal)detail.SettlementAmountToday!.Value, settled.PaymentDetails.Single(p => p.Purpose == PaymentPurposeEnum.INSTALLMENT).Amount);
            Assert.Null(settled.SettlementAmountToday);
        }
    }
}
