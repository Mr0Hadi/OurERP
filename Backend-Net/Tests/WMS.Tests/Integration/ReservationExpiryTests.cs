using Application.Common.Sales;
using Application.Common.Settings;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.Setting.Commands;
using Application.Features.Setting.Dtos;
using Application.Features.Setting.Queries;
using Common.Exceptions;
using Domain.Enums;
using MediatR;
using WMS.Tests.Support;

namespace WMS.Tests.Integration
{
    /// <summary>
    /// A proforma's reservation runs out after the Sale.ReservationMinutes setting (default 10): payment is refused from the
    /// deadline, and the sweep puts the units back and sends the proforma back to the warehouse.
    /// </summary>
    public class ReservationExpiryTests
    {
        private static async Task<(IMediator Mediator, SaleScenario Scenario, List<string> Barcodes)> SetupAsync(TestScope scope, int stock = 2)
        {
            var user = Seed.PersistedUser(scope.Context);
            var scenario = Seed.ShippedSale(scope.Context, orderedQuantity: 1, shippedQuantity: 0, stock: 0);
            var barcodes = await ProformaFlow.ScannableStockAsync(scope, scenario.Product, stock);
            return (ProformaFlow.Mediator(scope, user.Id), scenario, barcodes);
        }

        private static async Task ExpireAsync(TestScope scope, int saleId, TimeSpan ago)
        {
            var sale = scope.Context.Sales.Single(x => x.Id == saleId);
            sale.ReservationExpiresAt = DateTime.Now - ago;
            await scope.Context.SaveChangesAsync();
        }

        private static Task<Application.Common.Dtos.ResponseDto> PayAsync(IMediator mediator, int saleId) =>
            mediator.Send(new AddSalePaymentCommand { SaleId = saleId, Type = PaymentTypeEnum.CASH, Amount = 1 });

        [Fact]
        public async Task WarehouseCheck_SetsTheDefaultTenMinuteDeadline()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope);

            var before = DateTime.Now;
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes);

            Assert.NotNull(sale.ReservationExpiresAt);
            Assert.InRange(sale.ReservationExpiresAt!.Value, before.AddMinutes(10).AddSeconds(-1), DateTime.Now.AddMinutes(10).AddSeconds(1));
            Assert.InRange(sale.ReservationSecondsLeft!.Value, 590, 600);
        }

        [Fact]
        public async Task TheSetting_ChangesTheDeadline_AndZeroMeansNever()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 2);

            await mediator.Send(new UpdateSystemSettingsCommand { Settings = new() { new() { Key = SystemSettingCatalog.SaleReservationMinutes.Key, Value = "3" } } }, TestContext.Current.CancellationToken);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(1).ToList());
            Assert.InRange(sale.ReservationSecondsLeft!.Value, 170, 180);

            await mediator.Send(new UpdateSystemSettingsCommand { Settings = new() { new() { Key = SystemSettingCatalog.SaleReservationMinutes.Key, Value = "0" } } }, TestContext.Current.CancellationToken);
            var never = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Skip(1).ToList());
            Assert.Null(never.ReservationExpiresAt);
            Assert.Null(never.ReservationSecondsLeft);
        }

        [Fact]
        public async Task PastTheDeadline_PaymentIsRefused_EvenBeforeTheSweepRuns()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(1).ToList());

            await ExpireAsync(scope, sale.Id, TimeSpan.FromSeconds(5));

            await Assert.ThrowsAsync<ValidationCustomException>(() => PayAsync(mediator, sale.Id));
            // Still inside the grace: the sweep leaves it alone.
            Assert.False((bool)(await mediator.Send(new ReleaseExpiredSaleReservationCommand { SaleId = sale.Id }, TestContext.Current.CancellationToken)).Data!);
            Assert.Equal(1, (await ProformaFlow.DetailAsync(mediator, sale.Id)).Items.Single().ReservedQuantity);
        }

        [Fact]
        public async Task TheSweep_ReleasesTheUnits_AndSendsTheProformaBackToTheWarehouse_WhichCanReserveAgain()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope, stock: 2);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(1).ToList());
            Assert.Equal(1, scope.Context.Products.Single(p => p.Id == scenario.Product.Id).Stock);

            await ExpireAsync(scope, sale.Id, SaleProformaPipeline.ExpirySweepGrace + TimeSpan.FromSeconds(1));
            Assert.True((bool)(await mediator.Send(new ReleaseExpiredSaleReservationCommand { SaleId = sale.Id }, TestContext.Current.CancellationToken)).Data!);

            sale = await ProformaFlow.DetailAsync(mediator, sale.Id);
            Assert.Equal(SaleProformaStageEnum.CUSTOMER_APPROVED, sale.ProformaStage);
            Assert.Null(sale.ReservationExpiresAt);
            Assert.Equal(0, sale.Items.Single().ReservedQuantity);
            Assert.Equal(SaleProformaEventEnum.RESERVATION_EXPIRED, sale.ProformaEvents.Last().Kind);

            using (var verify = db.NewContext())
            {
                Assert.Equal(2, verify.Products.Single(p => p.Id == scenario.Product.Id).Stock);
                Assert.Equal(ProductUnitStatusEnum.IN_STOCK, verify.ProductUnits.Single(u => u.Barcode == barcodes[0]).Status);
            }

            // A second run finds nothing to do.
            Assert.False((bool)(await mediator.Send(new ReleaseExpiredSaleReservationCommand { SaleId = sale.Id }, TestContext.Current.CancellationToken)).Data!);

            // The warehouse checks again (any unit will do), the clock restarts, and the customer can pay.
            sale = await ProformaFlow.CheckAsync(mediator, sale, new() { barcodes[1] });
            Assert.Equal(SaleProformaStageEnum.WAREHOUSE_CHECKED, sale.ProformaStage);
            Assert.NotNull(sale.ReservationExpiresAt);
            sale = Assert.IsType<SaleDto>((await PayAsync(mediator, sale.Id)).Data);
            Assert.Equal(SalesStatusEnum.PROCESSING, sale.Status);
            // Paid: the units now wait for shipping, with no deadline.
            Assert.Null(sale.ReservationExpiresAt);
        }

        [Fact]
        public async Task APaidSale_IsNeverSwept()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var (mediator, scenario, barcodes) = await SetupAsync(scope);
            var sale = await ProformaFlow.ReadyForPaymentAsync(mediator, scenario, barcodes.Take(1).ToList());
            await PayAsync(mediator, sale.Id);

            // Even a stray deadline left on an issued sale is ignored.
            await ExpireAsync(scope, sale.Id, TimeSpan.FromHours(1));
            Assert.False((bool)(await mediator.Send(new ReleaseExpiredSaleReservationCommand { SaleId = sale.Id }, TestContext.Current.CancellationToken)).Data!);
            Assert.Equal(1, (await ProformaFlow.DetailAsync(mediator, sale.Id)).Items.Single().ReservedQuantity);
        }

        [Fact]
        public async Task Settings_AreListedWithTheirDefault_UpdatedWithWhoAndWhen_AndResetByABlankValue()
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var user = Seed.PersistedUser(scope.Context);
            var mediator = ProformaFlow.Mediator(scope, user.Id);
            var key = SystemSettingCatalog.SaleReservationMinutes.Key;

            SystemSettingDto Read(object data) => Assert.Single(Assert.IsType<List<SystemSettingGroupDto>>(data).SelectMany(g => g.Settings), s => s.Key == key);

            var initial = Read((await mediator.Send(new GetSystemSettingsQuery(), TestContext.Current.CancellationToken)).Data!);
            Assert.Equal("10", initial.Value);
            Assert.True(initial.IsDefault);
            Assert.Equal(SystemSettingTypeEnum.INTEGER, initial.Type);

            var updated = Read((await mediator.Send(new UpdateSystemSettingsCommand { Settings = new() { new() { Key = key, Value = " 25 " } } }, TestContext.Current.CancellationToken)).Data!);
            Assert.Equal("25", updated.Value);
            Assert.False(updated.IsDefault);
            Assert.Equal(user.Id, updated.UpdatedByUserId);
            Assert.NotNull(updated.UpdatedAt);
            Assert.Equal(25, await scope.SystemSettings.GetIntegerAsync(SystemSettingCatalog.SaleReservationMinutes, TestContext.Current.CancellationToken));

            var reset = Read((await mediator.Send(new UpdateSystemSettingsCommand { Settings = new() { new() { Key = key, Value = null } } }, TestContext.Current.CancellationToken)).Data!);
            Assert.True(reset.IsDefault);
            Assert.Empty(scope.Context.SystemSettings);
            Assert.Equal(10, await scope.SystemSettings.GetIntegerAsync(SystemSettingCatalog.SaleReservationMinutes, TestContext.Current.CancellationToken));
        }

        [Theory]
        [InlineData("Sale.ReservationMinutes", "-1")]
        [InlineData("Sale.ReservationMinutes", "10081")]
        [InlineData("Sale.ReservationMinutes", "ten")]
        [InlineData("No.Such.Setting", "1")]
        public async Task InvalidSettings_AreRefused(string key, string value)
        {
            using var db = new TestDatabase();
            using var scope = db.NewScope();
            var mediator = ProformaFlow.Mediator(scope);

            await Assert.ThrowsAsync<ValidationCustomException>(() =>
                mediator.Send(new UpdateSystemSettingsCommand { Settings = new() { new() { Key = key, Value = value } } }, TestContext.Current.CancellationToken));
            Assert.Empty(scope.Context.SystemSettings);
        }
    }
}
