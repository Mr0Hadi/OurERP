using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.SaleInstallment.Commands;
using Application.Features.SaleInstallment.Dtos;
using Application.Features.SaleInstallment.Queries;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    public class SaleInstallmentTests
    {
        /// <summary>
        /// یک فروش اقساطی در حالت پیش‌فاکتور: دقیقاً همان چیزی که CreateSale برای
        /// PaymentType = INSTALLMENT می‌سازد (بدون شماره‌ی فاکتور رسمی).
        /// </summary>
        private static SaleScenario ProformaInstallmentSale(Infrastructure.Persistence.WMSDbContext context, ulong totalAmount /* the invoice total = the plan's cash amount */)
        {
            var scenario = Seed.ShippedSale(context, orderedQuantity: 1, shippedQuantity: 0, stock: 0, unitPrice: totalAmount);
            scenario.Sale.Status = SalesStatusEnum.PROFORMA;
            scenario.Sale.InvoiceNumber = "";
            scenario.Sale.InvoiceDate = null;
            scenario.Sale.PaymentType = PaymentTypeEnum.INSTALLMENT;
            scenario.Sale.TotalAmount = totalAmount;
            scenario.Sale.PaidAmount = 0;
            context.SaveChanges();

            return scenario;
        }

        /// <summary>The plan's principal is the sale's invoice total and its charge/total are computed by the server.</summary>
        private static CreateSaleInstallmentPlanCommand PlanCommand(int saleId, decimal markup, ulong downPayment, int count, DateTime firstDue)
            => new()
            {
                SaleId = saleId,
                MarkupPercentage = markup,
                DownPaymentAmount = downPayment,
                InstallmentCount = count,
                FirstDueDate = firstDue,
                PaymentType = PaymentTypeEnum.CASH,
                PaidAt = new DateTime(2026, 1, 1),
            };

        [Fact]
        public async Task CreatePlan_GeneratesInstallmentsWithMonthlyDueDates()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            // نقدی ۱۰٬۰۰۰٬۰۰۰ با ۲۰٪ افزایش = ۱۲٬۰۰۰٬۰۰۰
            var scenario = ProformaInstallmentSale(scope.Context, 10_000_000);

            var handler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await handler.Handle(PlanCommand(scenario.Sale.Id, 20m, 2_000_000, 5, new DateTime(2026, 2, 1)), CancellationToken.None);

            using var verify = db.NewContext();
            var plan = verify.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.SaleId == scenario.Sale.Id);

            Assert.Equal(SaleInstallmentPlanStatusEnum.ACTIVE, plan.Status);
            Assert.Equal(10_000_000UL, plan.FinancedAmount);
            Assert.Equal(2_000_000UL, plan.InstallmentAmount);
            Assert.Equal(5, plan.Installments.Count);

            var ordered = plan.Installments.OrderBy(i => i.Number).ToList();
            Assert.Equal(new[] { 1, 2, 3, 4, 5 }, ordered.Select(i => i.Number));
            Assert.All(ordered, i => Assert.Equal(SaleInstallmentStatusEnum.PENDING, i.Status));
            Assert.All(ordered, i => Assert.Equal(2_000_000UL, i.Amount));
            Assert.Equal(new DateTime(2026, 2, 1), ordered[0].DueDate);
            Assert.Equal(new DateTime(2026, 3, 1), ordered[1].DueDate);
            Assert.Equal(new DateTime(2026, 6, 1), ordered[4].DueDate);

            // پیش‌پرداخت به‌عنوان یک رکورد مالی واقعی ثبت می‌شود.
            var payment = Assert.Single(verify.PaymentDetails.Where(x => x.SaleId == scenario.Sale.Id));
            Assert.Equal(PaymentPurposeEnum.INSTALLMENT_DOWN_PAYMENT, payment.Purpose);
            Assert.Equal(2_000_000m, payment.Amount);

            Assert.Equal(2_000_000UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
        }

        [Fact]
        public async Task CreatePlan_RoundingRemainder_LandsOnLastInstallment()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            // ۱۰٬۰۰۰ باقیمانده روی ۳ قسط: ۳۳۳۳ / ۳۳۳۳ / ۳۳۳۴
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var handler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await handler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 2, 1)), CancellationToken.None);

            using var verify = db.NewContext();
            var installments = verify.SaleInstallments
                .Where(x => x.Plan.SaleId == scenario.Sale.Id)
                .OrderBy(x => x.Number)
                .ToList();

            Assert.Equal(new[] { 3333UL, 3333UL, 3334UL }, installments.Select(i => i.Amount));
            Assert.Equal(10_000UL, installments.Aggregate(0UL, (sum, i) => sum + i.Amount));
        }

        [Fact]
        public async Task CreatePlan_TakesProformaSaleOutOfProforma()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000_000);

            var handler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await handler.Handle(PlanCommand(scenario.Sale.Id, 20m, 2_000_000, 5, new DateTime(2026, 2, 1)), CancellationToken.None);

            using var verify = db.NewContext();
            var sale = verify.Sales.Single(x => x.Id == scenario.Sale.Id);

            Assert.Equal(SalesStatusEnum.PROCESSING, sale.Status);
            Assert.False(string.IsNullOrEmpty(sale.InvoiceNumber));
            Assert.NotNull(sale.InvoiceDate);
        }

        [Fact]
        public async Task CreatePlan_OnNonInstallmentSale_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000_000);
            scenario.Sale.PaymentType = PaymentTypeEnum.CASH;
            scope.Context.SaveChanges();

            var handler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => handler.Handle(
                PlanCommand(scenario.Sale.Id, 20m, 2_000_000, 5, new DateTime(2026, 2, 1)), CancellationToken.None));
        }

        [Fact]
        public async Task PayingEveryInstallment_SettlesPlanAndKeepsSalePaidAmountInSync()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var createHandler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await createHandler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 2, 1)), CancellationToken.None);

            var payHandler = new PaySaleInstallmentCommandHandler(scope.Db, scope.UnitOfWork);
            var detailHandler = new GetSaleInstallmentPlanDetailQueryHandler(scope.Db);

            var installmentIds = scope.Context.SaleInstallments
                .Where(x => x.Plan.SaleId == scenario.Sale.Id)
                .OrderBy(x => x.Number)
                .Select(x => x.Id)
                .ToList();

            await payHandler.Handle(new PaySaleInstallmentCommand
            {
                SaleInstallmentId = installmentIds[0],
                PaymentType = PaymentTypeEnum.TRANSFER,
                TransferRef = "TRX-1",
                PaidAt = new DateTime(2026, 2, 1),
            }, CancellationToken.None);

            var afterFirst = (SaleInstallmentPlanDto)(await detailHandler.Handle(
                new GetSaleInstallmentPlanDetailQuery { SaleId = scenario.Sale.Id }, CancellationToken.None)).Data!;

            Assert.Equal(1, afterFirst.PaidInstallmentCount);
            Assert.Equal(4_333UL, afterFirst.PaidAmount);
            Assert.Equal(6_667UL, afterFirst.RemainingAmount);
            // سررسید قسط بعدی، نه قسطی که تازه پرداخت شد.
            Assert.Equal(new DateTime(2026, 3, 1), afterFirst.NextDueDate);
            Assert.Equal(new DateTime(2026, 2, 1), afterFirst.LastPaymentDate);
            Assert.Equal(4_333UL, db.NewContext().Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);

            foreach (var id in installmentIds.Skip(1))
            {
                await payHandler.Handle(new PaySaleInstallmentCommand
                {
                    SaleInstallmentId = id,
                    PaymentType = PaymentTypeEnum.CASH,
                    PaidAt = new DateTime(2026, 4, 1),
                }, CancellationToken.None);
            }

            using var verify = db.NewContext();
            var plan = verify.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.SaleId == scenario.Sale.Id);

            Assert.Equal(SaleInstallmentPlanStatusEnum.SETTLED, plan.Status);
            Assert.All(plan.Installments, i => Assert.Equal(SaleInstallmentStatusEnum.PAID, i.Status));
            Assert.Null(plan.NextDueDate);
            Assert.Equal(11_000UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
            // پیش‌پرداخت + سه قسط
            Assert.Equal(4, verify.PaymentDetails.Count(x => x.SaleId == scenario.Sale.Id));
        }

        [Fact]
        public async Task PayingBeforeDueDate_IsAllowed()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var createHandler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await createHandler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 12, 1)), CancellationToken.None);

            var first = scope.Context.SaleInstallments.Where(x => x.Plan.SaleId == scenario.Sale.Id).OrderBy(x => x.Number).First();

            var payHandler = new PaySaleInstallmentCommandHandler(scope.Db, scope.UnitOfWork);
            await payHandler.Handle(new PaySaleInstallmentCommand
            {
                SaleInstallmentId = first.Id,
                PaymentType = PaymentTypeEnum.CASH,
                // ده ماه زودتر از سررسید - هیچ اعتبارسنجی‌ای روی DueDate وجود ندارد.
                PaidAt = new DateTime(2026, 2, 1),
            }, CancellationToken.None);

            using var verify = db.NewContext();
            Assert.Equal(SaleInstallmentStatusEnum.PAID, verify.SaleInstallments.Single(x => x.Id == first.Id).Status);
        }

        [Fact]
        public async Task PayingOutOfOrder_IsAllowed()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var createHandler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await createHandler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 2, 1)), CancellationToken.None);

            var third = scope.Context.SaleInstallments.Single(x => x.Plan.SaleId == scenario.Sale.Id && x.Number == 3);

            var payHandler = new PaySaleInstallmentCommandHandler(scope.Db, scope.UnitOfWork);
            await payHandler.Handle(new PaySaleInstallmentCommand
            {
                SaleInstallmentId = third.Id,
                PaymentType = PaymentTypeEnum.CHECK,
                CheckNumber = "123",
                PaidAt = new DateTime(2026, 2, 5),
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var plan = verify.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.SaleId == scenario.Sale.Id);

            Assert.Equal(SaleInstallmentPlanStatusEnum.ACTIVE, plan.Status);
            Assert.Equal(SaleInstallmentStatusEnum.PAID, plan.Installments.Single(i => i.Number == 3).Status);
            // سررسید بعدی هنوز اولین قسط پرداخت‌نشده است.
            Assert.Equal(new DateTime(2026, 2, 1), plan.NextDueDate);
        }

        [Fact]
        public async Task PayingAnAlreadyPaidInstallment_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var createHandler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await createHandler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 2, 1)), CancellationToken.None);

            var first = scope.Context.SaleInstallments.Where(x => x.Plan.SaleId == scenario.Sale.Id).OrderBy(x => x.Number).First();
            var payHandler = new PaySaleInstallmentCommandHandler(scope.Db, scope.UnitOfWork);
            var command = new PaySaleInstallmentCommand { SaleInstallmentId = first.Id, PaymentType = PaymentTypeEnum.CASH };

            await payHandler.Handle(command, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => payHandler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task PayingOnACancelledPlan_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var createHandler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await createHandler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 2, 1)), CancellationToken.None);

            var planId = scope.Context.SaleInstallmentPlans.Single(x => x.SaleId == scenario.Sale.Id).Id;
            var first = scope.Context.SaleInstallments.Where(x => x.SaleInstallmentPlanId == planId).OrderBy(x => x.Number).First();

            await new DeleteSaleInstallmentPlanCommandHandler(scope.Db, scope.UnitOfWork)
                .Handle(new DeleteSaleInstallmentPlanCommand { Id = planId }, CancellationToken.None);

            var payHandler = new PaySaleInstallmentCommandHandler(scope.Db, scope.UnitOfWork);

            await Assert.ThrowsAsync<ValidationCustomException>(() => payHandler.Handle(
                new PaySaleInstallmentCommand { SaleInstallmentId = first.Id, PaymentType = PaymentTypeEnum.CASH }, CancellationToken.None));
        }

        [Fact]
        public async Task SettlePlan_MarksEveryRemainingInstallmentPaidWithOnePaymentDetail()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var createHandler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await createHandler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 2, 1)), CancellationToken.None);

            var first = scope.Context.SaleInstallments.Where(x => x.Plan.SaleId == scenario.Sale.Id).OrderBy(x => x.Number).First();
            await new PaySaleInstallmentCommandHandler(scope.Db, scope.UnitOfWork).Handle(
                new PaySaleInstallmentCommand { SaleInstallmentId = first.Id, PaymentType = PaymentTypeEnum.CASH, PaidAt = new DateTime(2026, 2, 1) },
                CancellationToken.None);

            await new SettleSaleInstallmentPlanCommandHandler(scope.Db, scope.UnitOfWork).Handle(new SettleSaleInstallmentPlanCommand
            {
                SaleId = scenario.Sale.Id,
                PaymentType = PaymentTypeEnum.TRANSFER,
                TransferRef = "TRX-SETTLE",
                PaidAt = new DateTime(2026, 3, 15),
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var plan = verify.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.SaleId == scenario.Sale.Id);

            Assert.Equal(SaleInstallmentPlanStatusEnum.SETTLED, plan.Status);
            Assert.All(plan.Installments, i => Assert.Equal(SaleInstallmentStatusEnum.PAID, i.Status));
            Assert.Equal(11_000UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);

            // دو قسط باقیمانده با یک PaymentDetail واحد تسویه شده‌اند - بدون تخفیف.
            var settlement = verify.PaymentDetails.Single(x => x.TransferRef == "TRX-SETTLE");
            Assert.Equal(6_667m, settlement.Amount);
            var settledRows = plan.Installments.Where(i => i.PaymentDetailId == settlement.Id).ToList();
            Assert.Equal(2, settledRows.Count);
            Assert.All(settledRows, i => Assert.Equal(new DateTime(2026, 3, 15), i.PaidAt));
        }

        [Fact]
        public async Task UpdatePlan_RegeneratesUnpaidRows_AndLeavesPaidOnesUntouched()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var createHandler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await createHandler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 2, 1)), CancellationToken.None);

            var planId = scope.Context.SaleInstallmentPlans.Single(x => x.SaleId == scenario.Sale.Id).Id;
            var first = scope.Context.SaleInstallments.Where(x => x.SaleInstallmentPlanId == planId).OrderBy(x => x.Number).First();
            await new PaySaleInstallmentCommandHandler(scope.Db, scope.UnitOfWork).Handle(
                new PaySaleInstallmentCommand { SaleInstallmentId = first.Id, PaymentType = PaymentTypeEnum.CASH, PaidAt = new DateTime(2026, 2, 1) },
                CancellationToken.None);

            // ۳ قسط -> ۵ قسط، با سررسید جدید. پرداخت‌شده: ۱٬۰۰۰ پیش‌پرداخت + ۳٬۳۳۳ قسط اول.
            await new UpdateSaleInstallmentPlanCommandHandler(scope.Db, scope.UnitOfWork).Handle(new UpdateSaleInstallmentPlanCommand
            {
                Id = planId,
                MarkupPercentage = 10m,
                InstallmentCount = 5,
                FirstDueDate = new DateTime(2026, 5, 1),
            }, CancellationToken.None);

            using var verify = db.NewContext();
            var plan = verify.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.Id == planId);
            var ordered = plan.Installments.OrderBy(i => i.Number).ToList();

            Assert.Equal(5, ordered.Count);
            // سطر پرداخت‌شده دست‌نخورده مانده است - همان Id، همان مبلغ، همان لینک مالی.
            var paid = ordered.Single(i => i.Status == SaleInstallmentStatusEnum.PAID);
            Assert.Equal(first.Id, paid.Id);
            Assert.Equal(3_333UL, paid.Amount);
            Assert.NotNull(paid.PaymentDetailId);

            // چهار سطر جدید، با ادامه‌ی شماره‌گذاری از آخرین سطر پرداخت‌شده.
            var regenerated = ordered.Where(i => i.Status == SaleInstallmentStatusEnum.PENDING).ToList();
            Assert.Equal(new[] { 2, 3, 4, 5 }, regenerated.Select(i => i.Number));
            Assert.Equal(new DateTime(2026, 5, 1), regenerated[0].DueDate);
            Assert.Equal(new DateTime(2026, 8, 1), regenerated[3].DueDate);
            // ۱۱٬۰۰۰ - ۴٬۳۳۳ = ۶٬۶۶۷ روی چهار سطر: ۱۶۶۶ ×۳ + ۱۶۶۹
            Assert.Equal(new[] { 1_666UL, 1_666UL, 1_666UL, 1_669UL }, regenerated.Select(i => i.Amount));
            Assert.Equal(6_667UL, regenerated.Aggregate(0UL, (sum, i) => sum + i.Amount));
        }

        [Fact]
        public async Task UpdatePlan_FewerInstallmentsThanAlreadyPaid_ThrowsValidation()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var createHandler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await createHandler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 2, 1)), CancellationToken.None);

            var planId = scope.Context.SaleInstallmentPlans.Single(x => x.SaleId == scenario.Sale.Id).Id;
            var payHandler = new PaySaleInstallmentCommandHandler(scope.Db, scope.UnitOfWork);
            foreach (var id in scope.Context.SaleInstallments.Where(x => x.SaleInstallmentPlanId == planId).OrderBy(x => x.Number).Take(2).Select(x => x.Id).ToList())
                await payHandler.Handle(new PaySaleInstallmentCommand { SaleInstallmentId = id, PaymentType = PaymentTypeEnum.CASH }, CancellationToken.None);

            await Assert.ThrowsAsync<ValidationCustomException>(() => new UpdateSaleInstallmentPlanCommandHandler(scope.Db, scope.UnitOfWork)
                .Handle(new UpdateSaleInstallmentPlanCommand
                {
                    Id = planId,
                    MarkupPercentage = 10m,
                    InstallmentCount = 1,
                    FirstDueDate = new DateTime(2026, 5, 1),
                }, CancellationToken.None));
        }

        [Fact]
        public async Task DeletePlan_CancelsOnlyUnpaidRows_AndKeepsPayments()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var createHandler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await createHandler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 2, 1)), CancellationToken.None);

            var planId = scope.Context.SaleInstallmentPlans.Single(x => x.SaleId == scenario.Sale.Id).Id;
            var first = scope.Context.SaleInstallments.Where(x => x.SaleInstallmentPlanId == planId).OrderBy(x => x.Number).First();
            await new PaySaleInstallmentCommandHandler(scope.Db, scope.UnitOfWork).Handle(
                new PaySaleInstallmentCommand { SaleInstallmentId = first.Id, PaymentType = PaymentTypeEnum.CASH }, CancellationToken.None);

            await new DeleteSaleInstallmentPlanCommandHandler(scope.Db, scope.UnitOfWork)
                .Handle(new DeleteSaleInstallmentPlanCommand { Id = planId }, CancellationToken.None);

            using var verify = db.NewContext();
            var plan = verify.SaleInstallmentPlans.Include(x => x.Installments).Single(x => x.Id == planId);

            Assert.False(plan.IsActive);
            Assert.Equal(SaleInstallmentPlanStatusEnum.CANCELLED, plan.Status);
            Assert.Equal(SaleInstallmentStatusEnum.PAID, plan.Installments.Single(i => i.Id == first.Id).Status);
            Assert.All(plan.Installments.Where(i => i.Id != first.Id), i => Assert.Equal(SaleInstallmentStatusEnum.CANCELLED, i.Status));

            // رکوردهای مالی و مبلغ پرداخت‌شده‌ی فروش دست‌نخورده می‌مانند.
            Assert.Equal(2, verify.PaymentDetails.Count(x => x.SaleId == scenario.Sale.Id));
            Assert.Equal(4_333UL, verify.Sales.Single(x => x.Id == scenario.Sale.Id).PaidAmount);
        }

        [Fact]
        public async Task NonInstallmentSale_LeavesProformaOnFirstPayment()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 5_000);
            scenario.Sale.PaymentType = PaymentTypeEnum.CASH;
            scope.Context.SaveChanges();

            // اولین پرداخت، حتی ناقص = نهایی‌سازی خودکار. (خروج دستی دیگر راهی ندارد: UpdateSale وضعیت نمی‌گیرد.)
            await new AddSalePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 1_000 }, CancellationToken.None);

            using var verify = db.NewContext();
            var sale = verify.Sales.Single(x => x.Id == scenario.Sale.Id);
            Assert.Equal(SalesStatusEnum.PROCESSING, sale.Status);
            Assert.False(string.IsNullOrEmpty(sale.InvoiceNumber));
        }

        [Fact]
        public async Task InstallmentSale_CannotLeaveProformaWithoutAPlan()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 5_000);

            // حتی با پرداخت کامل: پول فروش اقساطی فقط از مسیر قرارداد می‌آید، پس بدون قرارداد از پیش‌فاکتور خارج نمی‌شود.
            await Assert.ThrowsAsync<ValidationCustomException>(() => new AddSalePaymentCommandHandler(scope.Db, FakeObjectStorage.Instance, scope.UnitOfWork)
                .Handle(new AddSalePaymentCommand { SaleId = scenario.Sale.Id, Type = PaymentTypeEnum.CASH, Amount = 5_000 }, CancellationToken.None));

            using var verify = db.NewContext();
            Assert.Equal(SalesStatusEnum.PROFORMA, verify.Sales.Single(x => x.Id == scenario.Sale.Id).Status);
        }

        [Fact]
        public async Task PlanAndInstallmentListQueries_ProjectTheRollUpsServerSide()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var createHandler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await createHandler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 2, 1)), CancellationToken.None);

            var first = scope.Context.SaleInstallments.Where(x => x.Plan.SaleId == scenario.Sale.Id).OrderBy(x => x.Number).First();
            await new PaySaleInstallmentCommandHandler(scope.Db, scope.UnitOfWork).Handle(
                new PaySaleInstallmentCommand { SaleInstallmentId = first.Id, PaymentType = PaymentTypeEnum.CASH, PaidAt = new DateTime(2026, 2, 3) },
                CancellationToken.None);

            var planList = await new GetSaleInstallmentPlanListQueryHandler(scope.Db).Handle(
                new GetSaleInstallmentPlanListQuery { CustomerId = scenario.Customer.Id }, CancellationToken.None);
            var planRow = Assert.Single((IEnumerable<SaleInstallmentPlanListDto>)planList.Data!.GetType()
                .GetProperty("SaleInstallmentPlanList")!.GetValue(planList.Data)!);

            Assert.Equal(11_000UL, planRow.TotalAmount);
            Assert.Equal(4_333UL, planRow.PaidAmount);
            Assert.Equal(6_667UL, planRow.RemainingAmount);
            Assert.Equal(1, planRow.PaidInstallmentCount);
            Assert.Equal(new DateTime(2026, 3, 1), planRow.NextDueDate);

            var installmentList = await new GetSaleInstallmentListQueryHandler(scope.Db).Handle(
                new GetSaleInstallmentListQuery { SaleId = scenario.Sale.Id, Status = SaleInstallmentStatusEnum.PENDING }, CancellationToken.None);
            var rows = (IEnumerable<SaleInstallmentListDto>)installmentList.Data!.GetType()
                .GetProperty("SaleInstallmentList")!.GetValue(installmentList.Data)!;

            Assert.Equal(2, rows.Count());
            Assert.All(rows, r => Assert.Equal(scenario.Sale.Id, r.SaleId));
            Assert.All(rows, r => Assert.False(string.IsNullOrEmpty(r.StatusTitle)));
        }

        [Fact]
        public async Task SaleDetailQuery_CarriesTheInstallmentSummary()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = ProformaInstallmentSale(scope.Context, 10_000);

            var createHandler = new CreateSaleInstallmentPlanCommandHandler(scope.Db, scope.SaleInstallmentPlanRepository, scope.UnitOfWork);
            await createHandler.Handle(PlanCommand(scenario.Sale.Id, 10m, 1_000, 3, new DateTime(2026, 2, 1)), CancellationToken.None);

            var response = await new Application.Features.Sale.Queries.GetSaleDetailQueryHandler(scope.Db, FakeObjectStorage.Instance)
                .Handle(new Application.Features.Sale.Queries.GetSaleDetailQuery { Id = scenario.Sale.Id }, CancellationToken.None);

            var sale = (SaleDto)response.Data!;
            var summary = Assert.IsType<SaleInstallmentSummaryDto>(sale.InstallmentSummary);

            Assert.Equal(11_000UL, summary.TotalAmount);
            Assert.Equal(1_000UL, summary.DownPaymentAmount);
            Assert.Equal(3, summary.InstallmentCount);
            Assert.Equal(0, summary.PaidInstallmentCount);
            Assert.Equal(1_000UL, summary.PaidAmount);
            Assert.Equal(10_000UL, summary.RemainingAmount);
            Assert.Equal(new DateTime(2026, 2, 1), summary.NextDueDate);

            // پیش‌پرداخت هم در فهرست پرداخت‌های همان فروش دیده می‌شود.
            var payment = Assert.Single(sale.PaymentDetails);
            Assert.Equal(PaymentPurposeEnum.INSTALLMENT_DOWN_PAYMENT, payment.Purpose);
        }
    }
}
