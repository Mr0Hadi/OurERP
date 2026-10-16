using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.Storage;
using Application.Features.Sale.Commands;
using Application.Features.Sale.Dtos;
using Application.Features.Sale.Queries;
using Application.Ioc;
using Domain.Entities;
using Domain.Enums;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace WMS.Tests.Support
{
    /// <summary>
    /// Drives a sale through the proforma approval pipeline (docs/proforma-approval-pipeline.md) with the real MediatR pipeline
    /// on the scope's context - validators included, the same way ShipmentTests do it.
    /// </summary>
    internal static class ProformaFlow
    {
        public static IMediator Mediator(TestScope scope, int userId = 1)
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddApplicationServices();
            services.AddSingleton<IWMSDbContext>(scope.Context);
            services.AddSingleton(scope.AuditScope);
            services.AddSingleton(scope.UnitOfWork);
            services.AddSingleton(scope.PurchaseReturnCalculation);
            services.AddSingleton(scope.SaleReturnCalculation);
            services.AddSingleton(scope.PurchaseReturnRepository);
            services.AddSingleton(scope.SaleReturnRepository);
            services.AddSingleton(scope.SaleInstallmentPlanRepository);
            services.AddSingleton(scope.ProductUnitService);
            services.AddSingleton(scope.InventoryCostingService);
            services.AddSingleton(scope.ProductCodeService);
            services.AddSingleton<IObjectStorageService>(FakeObjectStorage.Instance);
            services.AddSingleton(FakeUserContext.WithUserId(userId));
            services.AddSingleton(scope.PosPaymentGuard);
            return services.BuildServiceProvider().GetRequiredService<IMediator>();
        }

        /// <summary>
        /// Adds <paramref name="count"/> scannable IN_STOCK units to <paramref name="product"/> (minted by the real service, so
        /// their barcodes parse) and raises its Stock to match. Returns their barcodes in serial order.
        /// </summary>
        public static async Task<List<string>> ScannableStockAsync(TestScope scope, Product product, int count)
        {
            var units = await scope.ProductUnitService.MintAsync(product, count, UnitOrigin.None, Movements.Test, CancellationToken.None);
            product.Stock += count;
            await scope.Context.SaveChangesAsync();
            return units.Select(u => u.Barcode).ToList();
        }

        public static async Task<SaleDto> CreateAsync(IMediator mediator, SaleScenario scenario, int quantity, ulong unitPrice = 1_000, PaymentTypeEnum paymentType = PaymentTypeEnum.CASH)
        {
            var created = Assert.IsType<CreatedSaleDto>((await mediator.Send(new CreateSaleCommand
            {
                CustomerId = scenario.Customer.Id,
                PaymentType = paymentType,
                ProductIds = new() { new CreateSaleItemDto { ProductId = scenario.Product.Id, Quantity = quantity, UnitPrice = unitPrice } },
            })).Data);
            return await DetailAsync(mediator, created.Id);
        }

        public static async Task<SaleDto> DetailAsync(IMediator mediator, int saleId) =>
            Assert.IsType<SaleDto>((await mediator.Send(new GetSaleDetailQuery { Id = saleId })).Data);

        public static async Task<SaleDto> ApproveAsync(IMediator mediator, SaleDto sale) =>
            Assert.IsType<SaleDto>((await mediator.Send(new ApproveSaleProformaCommand { SaleId = sale.Id, Revision = sale.Revision })).Data);

        public static async Task<SaleDto> CheckAsync(IMediator mediator, SaleDto sale, List<string> barcodes, List<SaleWarehouseIssueInputDto>? issues = null) =>
            Assert.IsType<SaleDto>((await mediator.Send(new CheckSaleWarehouseCommand
            {
                SaleId = sale.Id,
                Revision = sale.Revision,
                Lines = barcodes.Count == 0 ? new() : new() { new CheckSaleWarehouseLineDto { SaleItemId = sale.Items.Single().Id, ProductUnitBarcodes = barcodes } },
                Issues = issues ?? new(),
            })).Data);

        /// <summary>Create, approve and warehouse-check in one go: a single-line proforma ready for payment.</summary>
        public static async Task<SaleDto> ReadyForPaymentAsync(IMediator mediator, SaleScenario scenario, List<string> barcodes, ulong unitPrice = 1_000, PaymentTypeEnum paymentType = PaymentTypeEnum.CASH)
        {
            var sale = await CreateAsync(mediator, scenario, barcodes.Count, unitPrice, paymentType);
            sale = await ApproveAsync(mediator, sale);
            return await CheckAsync(mediator, sale, barcodes);
        }
    }
}
