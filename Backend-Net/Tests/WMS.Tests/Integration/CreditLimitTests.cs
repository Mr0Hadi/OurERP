using Application.Common.Credit;
using Application.Common.Settings;
using Application.Features.Customer.Dtos;
using Application.Features.Customer.Queries;
using Application.Features.PartyAccount.Commands;
using Application.Features.Sale.Commands;
using Application.Features.SaleInstallment.Commands;
using Application.Features.Setting.Commands;
using Common.Exceptions;
using Domain.Enums;
using MediatR;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>GAP-06: a customer's credit limit is enforced when a sale is issued, cheques and installments included.</summary>
    public class CreditLimitTests
    {
        private static CancellationToken Ct => TestContext.Current.CancellationToken;

        private static IMediator Mediator(TestScope scope) => ProformaFlow.Mediator(scope, Seed.PersistedUser(scope.Context).Id);

        /// <summary>A proforma through customer and warehouse approval, of <paramref name="total"/>, for a customer with <paramref name="limit"/>.</summary>
        private static SaleScenario Proforma(TestScope scope, ulong total, ulong? limit, PaymentTypeEnum type = PaymentTypeEnum.CREDIT)
        {
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0, unitPrice: total);
            scenario.Sale.Status = SalesStatusEnum.PROFORMA;
            scenario.Sale.ProformaStage = SaleProformaStageEnum.WAREHOUSE_CHECKED;
            scenario.Sale.InvoiceNumber = "";
            scenario.Sale.InvoiceDate = null;
            scenario.Sale.PaidAmount = 0;
            scenario.Sale.TotalAmount = total;
            scenario.Sale.PaymentType = type;
            scenario.Customer.CreditLimit = limit;
            scope.Context.SaveChanges();
            return scenario;
        }

        /// <summary>Another proforma for the same customer.</summary>
        private static SaleScenario NextProforma(TestScope scope, SaleScenario of, ulong total)
        {
            var next = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0, unitPrice: total);
            next.Sale.Customer = scope.Context.Customers.Single(x => x.Id == of.Customer.Id);
            next.Sale.Status = SalesStatusEnum.PROFORMA;
            next.Sale.ProformaStage = SaleProformaStageEnum.WAREHOUSE_CHECKED;
            next.Sale.InvoiceNumber = "";
            next.Sale.InvoiceDate = null;
            next.Sale.PaidAmount = 0;
            next.Sale.TotalAmount = total;
            scope.Context.SaveChanges();
            return next with { Customer = next.Sale.Customer };
        }

        private static Task<Application.Common.Dtos.ResponseDto> Pay(IMediator mediator, int saleId, ulong amount, PaymentTypeEnum type = PaymentTypeEnum.CASH) =>
            mediator.Send(new AddSalePaymentCommand
            {
                SaleId = saleId,
                Type = type,
                Amount = amount,
                CheckNumber = type == PaymentTypeEnum.CHECK ? "123456" : null,
                CheckDueDate = type == PaymentTypeEnum.CHECK ? DateTime.Today.AddDays(30) : null,
            }, Ct);

        private static void AssertNotIssued(TestDatabase db, int saleId)
        {
            using var verify = db.NewContext();
            var sale = verify.Sales.Single(x => x.Id == saleId);
            Assert.Equal(SalesStatusEnum.PROFORMA, sale.Status);
            Assert.Equal(0UL, sale.PaidAmount);
            Assert.False(verify.PartyLedgerEntries.Any(x => x.SaleId == saleId));
            Assert.False(verify.PaymentDetails.Any(x => x.SaleId == saleId));
        }

        [Fact]
        public async Task ACreditSaleOverTheLimit_IsRefused_WithTheNumbers_AndNothingIsSaved()
        {
            using var db = new TestDatabase();
            int saleId;
            using (var scope = db.NewScope())
            {
                var scenario = Proforma(scope, total: 10_000, limit: 5_000);
                saleId = scenario.Sale.Id;

                var error = await Assert.ThrowsAsync<ValidationCustomException>(() => Pay(Mediator(scope), saleId, 2_000));

                Assert.Contains("سقف اعتبار", error.Error);
                var data = Assert.IsType<CreditLimitExceededDto>(error.Data);
                Assert.True(data.CreditLimitExceeded);
                Assert.Equal(5_000UL, data.CreditLimit);
                Assert.Equal(0, data.CurrentExposure);
                Assert.Equal(8_000, data.AddedAmount);
                Assert.Equal(8_000, data.Exposure);
                Assert.Equal(3_000, data.Excess);
            }

            AssertNotIssued(db, saleId);
        }

        [Fact]
        public async Task PayingEnoughUpFront_KeepsTheSaleWithinTheLimit()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Proforma(scope, total: 10_000, limit: 5_000);

            await Pay(Mediator(scope), scenario.Sale.Id, 5_000);

            using var verify = db.NewContext();
            Assert.Equal(SalesStatusEnum.PROCESSING, verify.Sales.Single(x => x.Id == scenario.Sale.Id).Status);
            Assert.Equal(5_000, (await CreditLimitGuard.SavedExposureAsync(verify, scenario.Customer.Id, Ct)).Total);
        }

        [Fact]
        public async Task AnUnclearedCheque_IsNotCash_ItCountsAgainstTheLimit()
        {
            using var db = new TestDatabase();
            int saleId;
            using (var scope = db.NewScope())
            {
                var scenario = Proforma(scope, total: 10_000, limit: 5_000);
                saleId = scenario.Sale.Id;

                var error = await Assert.ThrowsAsync<ValidationCustomException>(() => Pay(Mediator(scope), saleId, 10_000, PaymentTypeEnum.CHECK));
                var data = Assert.IsType<CreditLimitExceededDto>(error.Data);
                Assert.Equal(10_000, data.AddedAmount);
            }
            AssertNotIssued(db, saleId);
        }

        [Fact]
        public async Task ChequesAlreadyHeld_CountInTheExposure_UntilTheyClear()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var first = Proforma(scope, total: 4_000, limit: 5_000);
            await Pay(mediator, first.Sale.Id, 4_000, PaymentTypeEnum.CHECK);

            using (var verify = db.NewContext())
            {
                var exposure = await CreditLimitGuard.SavedExposureAsync(verify, first.Customer.Id, Ct);
                Assert.Equal(0, exposure.LedgerBalance);
                Assert.Equal(4_000, exposure.UnclearedCheques);
            }

            // The list reads the same cheques (GetCustomerList's creditExposure).
            using (var verify = db.NewContext())
            {
                var cheques = await CreditLimitGuard.UnclearedChequesByCustomerAsync(verify, new[] { first.Customer.Id }, Ct);
                Assert.Equal(4_000, cheques[first.Customer.Id]);
            }

            // 2,000 more on credit: 4,000 (cheque) + 2,000 > 5,000.
            var second = NextProforma(scope, first, total: 3_000);
            var error = await Assert.ThrowsAsync<ValidationCustomException>(() => Pay(mediator, second.Sale.Id, 1_000));
            Assert.Equal(4_000, Assert.IsType<CreditLimitExceededDto>(error.Data).CurrentExposure);
        }

        [Fact]
        public async Task ALimitOfZero_IsCashOnly()
        {
            using var db = new TestDatabase();
            using (var scope = db.NewScope())
            {
                var scenario = Proforma(scope, total: 10_000, limit: 0);
                var error = await Assert.ThrowsAsync<ValidationCustomException>(() => Pay(Mediator(scope), scenario.Sale.Id, 9_999));
                Assert.Contains("فقط فروش نقدی", error.Error);
            }
            using (var scope = db.NewScope())
            {
                var scenario = Proforma(scope, total: 10_000, limit: 0);
                await Pay(Mediator(scope), scenario.Sale.Id, 10_000, PaymentTypeEnum.TRANSFER);
                using var verify = db.NewContext();
                Assert.Equal(SalesStatusEnum.PROCESSING, verify.Sales.Single(x => x.Id == scenario.Sale.Id).Status);
            }
        }

        [Fact]
        public async Task NoLimit_OrTheSettingOff_IsNeverChecked()
        {
            using var db = new TestDatabase();
            using (var scope = db.NewScope())
            {
                var scenario = Proforma(scope, total: 10_000_000, limit: null);
                await Pay(Mediator(scope), scenario.Sale.Id, 1);
            }
            using (var scope = db.NewScope())
            {
                var mediator = Mediator(scope);
                await mediator.Send(new UpdateSystemSettingsCommand { Settings = new() { new() { Key = SystemSettingCatalog.SaleCreditLimitEnforced.Key, Value = "false" } } }, Ct);
                var scenario = Proforma(scope, total: 10_000, limit: 5_000);
                await Pay(mediator, scenario.Sale.Id, 1);

                using var verify = db.NewContext();
                Assert.Equal(SalesStatusEnum.PROCESSING, verify.Sales.Single(x => x.Id == scenario.Sale.Id).Status);
            }
        }

        [Fact]
        public async Task ACustomerOverTheLimit_CanStillBuyForCash_ButNotOnCredit()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = Mediator(scope);
            var first = Proforma(scope, total: 10_000, limit: null);
            await Pay(mediator, first.Sale.Id, 1_000);

            // The limit is lowered below what they already owe (9,000).
            var customer = scope.Context.Customers.Single(x => x.Id == first.Customer.Id);
            customer.CreditLimit = 5_000;
            scope.Context.SaveChanges();

            var cash = NextProforma(scope, first, total: 2_000);
            await Pay(mediator, cash.Sale.Id, 2_000);

            var credit = NextProforma(scope, first, total: 2_000);
            await Assert.ThrowsAsync<ValidationCustomException>(() => Pay(mediator, credit.Sale.Id, 1_999));
        }

        [Fact]
        public async Task RaisingTheLimit_LetsTheSameSaleThrough()
        {
            using var db = new TestDatabase();
            int saleId, customerId;
            using (var scope = db.NewScope())
            {
                var scenario = Proforma(scope, total: 10_000, limit: 5_000);
                (saleId, customerId) = (scenario.Sale.Id, scenario.Customer.Id);
                await Assert.ThrowsAsync<ValidationCustomException>(() => Pay(Mediator(scope), saleId, 1));
            }
            using (var scope = db.NewScope())
            {
                scope.Context.Customers.Single(x => x.Id == customerId).CreditLimit = 10_000;
                scope.Context.SaveChanges();
                await Pay(Mediator(scope), saleId, 1);

                var detail = Assert.IsType<CustomerDto>((await new GetCustomerDetailQueryHandler(scope.CustomerRepository, TestMapper.Instance, FakeObjectStorage.Instance, scope.Db).Handle(new GetCustomerDetailQuery { Id = customerId }, Ct)).Data);
                Assert.Equal(10_000UL, detail.CreditLimit);
                Assert.Equal(9_999, detail.CreditExposure);
                Assert.Equal(1, detail.CreditAvailable);
            }
        }

        [Fact]
        public async Task AnInstallmentSale_CountsItsWholeUnpaidSchedule_AndKeepsCountingIt()
        {
            using var db = new TestDatabase();
            // 10,000,000 + 20% charge = 12,000,000, 2,000,000 down: 10,000,000 in future installments.
            CreateSaleInstallmentPlanCommand Plan(int saleId) => new()
            {
                SaleId = saleId,
                MarkupPercentage = 20m,
                DownPaymentAmount = 2_000_000,
                InstallmentCount = 5,
                FirstDueDate = DateTime.Today.AddMonths(1),
                PaymentType = PaymentTypeEnum.CASH,
            };

            int customerId;
            using (var scope = db.NewScope())
            {
                var scenario = Proforma(scope, total: 10_000_000, limit: 9_999_999, type: PaymentTypeEnum.INSTALLMENT);
                customerId = scenario.Customer.Id;
                var error = await Assert.ThrowsAsync<ValidationCustomException>(() => Mediator(scope).Send(Plan(scenario.Sale.Id), Ct));
                Assert.Equal(10_000_000, Assert.IsType<CreditLimitExceededDto>(error.Data).AddedAmount);
            }
            using (var scope = db.NewScope())
            {
                var mediator = Mediator(scope);
                var customer = scope.Context.Customers.Single(x => x.Id == customerId);
                customer.CreditLimit = 10_500_000;
                scope.Context.SaveChanges();
                var sale = scope.Context.Sales.Single(x => x.CustomerId == customerId);
                await mediator.Send(Plan(sale.Id), Ct);

                // The future installments still count: 1,000,000 more on credit is past the limit.
                var next = NextProforma(scope, new SaleScenario(sale, null!, null!, customer), total: 1_000_000);
                await Assert.ThrowsAsync<ValidationCustomException>(() => Pay(mediator, next.Sale.Id, 1));
            }
        }

        [Fact]
        public async Task IssuingThroughAnOnAccountAllocation_IsCheckedToo()
        {
            using var db = new TestDatabase();
            int saleId;
            using (var scope = db.NewScope())
            {
                var scenario = Proforma(scope, total: 10_000, limit: 5_000);
                saleId = scenario.Sale.Id;
                await Assert.ThrowsAsync<ValidationCustomException>(() => Mediator(scope).Send(new AddPartyPaymentCommand
                {
                    CustomerId = scenario.Customer.Id,
                    Type = PaymentTypeEnum.CASH,
                    Amount = 1_000,
                    Allocations = new() { new() { SaleId = saleId, Amount = 1_000 } },
                }, Ct));
            }
            AssertNotIssued(db, saleId);
        }
    
        private static Task<Application.Common.Dtos.ResponseDto> PayAll(IMediator mediator, int saleId, params (ulong Amount, PaymentTypeEnum Type)[] rows) =>
            mediator.Send(new AddSalePaymentsCommand
            {
                SaleId = saleId,
                Payments = rows.Select(row => new SalePaymentRowDto
                {
                    Type = row.Type,
                    Amount = row.Amount,
                    CheckNumber = row.Type == PaymentTypeEnum.CHECK ? "123456" : null,
                    CheckDueDate = row.Type == PaymentTypeEnum.CHECK ? DateTime.Today.AddDays(30) : null,
                }).ToList(),
            }, Ct);

        [Fact]
        public async Task ACashOnlyCustomer_PayingInFullInTwoRows_IsNotRefusedAtTheFirstRow()
        {
            // frontend-requests 31.1: the first row issues the invoice with half unpaid; the limit is checked on the final state.
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var scenario = Proforma(scope, total: 1_000, limit: 0);

            await PayAll(Mediator(scope), scenario.Sale.Id, (500, PaymentTypeEnum.CASH), (500, PaymentTypeEnum.CASH));

            using var verify = db.NewContext();
            var sale = verify.Sales.Single(x => x.Id == scenario.Sale.Id);
            Assert.Equal(SalesStatusEnum.PROCESSING, sale.Status);
            Assert.Equal(1_000UL, sale.PaidAmount);
            Assert.Equal(0, (await CreditLimitGuard.SavedExposureAsync(verify, scenario.Customer.Id, Ct)).Total);
        }

        [Fact]
        public async Task SeveralRows_StillOverTheLimitAtTheEnd_AreRefused_AndNoneIsSaved()
        {
            using var db = new TestDatabase();
            int saleId;
            using (var scope = db.NewScope())
            {
                var scenario = Proforma(scope, total: 1_000, limit: 0);
                saleId = scenario.Sale.Id;

                var error = await Assert.ThrowsAsync<ValidationCustomException>(() =>
                    PayAll(Mediator(scope), saleId, (500, PaymentTypeEnum.CASH), (500, PaymentTypeEnum.CHECK)));
                var data = Assert.IsType<CreditLimitExceededDto>(error.Data);
                Assert.Equal(500, data.Exposure);
            }
            AssertNotIssued(db, saleId);
        }
    }
}
