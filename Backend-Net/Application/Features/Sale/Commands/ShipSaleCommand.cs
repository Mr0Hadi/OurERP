using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.ProductUnit;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    // Prerequisite for SaleReturn: multi-round shipping to the customer, mirroring
    // ReceivePurchaseCommand's shape but for the outbound side (stock goes DOWN, not up), and
    // without an "issues" concept - problems with what shipped are only ever reported later by
    // the customer, through SaleReturn. Excess sent by mistake is recorded here as a warehouse fact
    // (ExcessQuantity), so the units the customer holds are no longer counted on our shelf.
    public class ShipSaleCommand : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }
        public DateTime? ShippedDate { get; set; }
        public string? ShippingNote { get; set; }
        public string? DriverFullName { get; set; }
        public string? DriverPhoneNumber { get; set; }
        public string? VehiclePlate { get; set; }
        public List<ShipSaleItemDto> Items { get; set; } = new();
    }

    public class ShipSaleCommandValidator : AbstractValidator<ShipSaleCommand>
    {
        public ShipSaleCommandValidator()
        {
            RuleFor(x => x.SaleId).NotNull().WithMessage(Validation.RequiredMessage("فروش"));
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("لیست اقلام ارسالی"));
            RuleFor(x => x.Items).Must(items => items.Select(i => i.SaleItemId).Distinct().Count() == items.Count)
                .WithMessage("هر آیتم فروش فقط یک‌بار می‌تواند در یک درخواست ارسال ظاهر شود.");
            RuleForEach(x => x.Items).ChildRules(item =>
            {
                item.RuleFor(i => i.SaleItemId).NotNull().WithMessage(Validation.RequiredMessage("آیتم فروش"));
                item.RuleFor(i => i.ShippedQuantity).GreaterThanOrEqualTo(0).WithMessage("مقدار ارسالی نمی‌تواند منفی باشد.");
                item.RuleFor(i => i.ExcessQuantity).GreaterThanOrEqualTo(0).WithMessage("مقدار مازاد نمی‌تواند منفی باشد.");
                item.RuleFor(i => i).Must(i => i.ShippedQuantity + i.ExcessQuantity > 0).WithMessage("مقدار ارسالی باید از صفر بیشتر باشد.");
            });
            RuleFor(x => x.DriverPhoneNumber).Must(Validation.IsMobileNumber)
                .When(x => !string.IsNullOrWhiteSpace(x.DriverPhoneNumber))
                .WithMessage("شماره تماس راننده وارد شده صحیح نمی باشد.");
        }
    }

    public class ShipSaleCommandHandler : IRequestHandler<ShipSaleCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductUnitService _productUnitService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IUnitOfWork _unitOfWork;

        public ShipSaleCommandHandler(IWMSDbContext context, IProductUnitService productUnitService, IInventoryCostingService inventoryCostingService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _productUnitService = productUnitService;
            _inventoryCostingService = inventoryCostingService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ShipSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales
                .Include(x => x.Items)
                    .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == request.SaleId, cancellationToken) ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (sale.Status == SalesStatusEnum.CANCELLED)
                throw new ValidationCustomException("فروش لغو شده قابل ارسال نیست.");

            // A proforma is still an editable draft that nobody has paid a rial towards: goods never leave against it.
            if (sale.Status == SalesStatusEnum.PROFORMA)
                throw new ValidationCustomException("پیش‌فاکتور قابل ارسال نیست؛ فروش با ثبت اولین پرداخت از پیش‌فاکتور خارج می‌شود.");

            var saleItems = sale.Items.ToDictionary(x => x.Id);

            foreach (var reqItem in request.Items)
            {
                if (!saleItems.TryGetValue(reqItem.SaleItemId, out var saleItem))
                    throw new NotFoundCustomException("آیتم فروش مورد نظر یافت نشد.");

                // Excess is by definition beyond the order, so only the ordered shipment is capped by what the line still owes.
                var remaining = saleItem.Quantity - saleItem.ShippedQuantity;
                if (reqItem.ShippedQuantity > remaining)
                    throw new ValidationCustomException($"مقدار وارد شده برای «{saleItem.Product.Name}» از باقیمانده قابل ارسال این قلم بیشتر است.");

                if (reqItem.ShippedQuantity + reqItem.ExcessQuantity > saleItem.Product.Stock)
                    throw new ValidationCustomException($"موجودی «{saleItem.Product.Name}» برای ارسال این مقدار کافی نیست.");

                if (saleItem.Product.RequiresUnitTracking
                    && ((reqItem.ShippedQuantity > 0 && (reqItem.ProductUnitBarcodes?.Count ?? 0) == 0)
                        || (reqItem.ExcessQuantity > 0 && (reqItem.ExcessProductUnitBarcodes?.Count ?? 0) == 0)))
                    throw new ValidationCustomException($"کالای «{saleItem.Product.Name}» ردیابی دانه‌ای دارد؛ بارکد دانه‌های خروجی باید اسکن شود.");
            }

            var now = DateTime.Now;
            var shippedAt = request.ShippedDate ?? now;

            foreach (var reqItem in request.Items)
            {
                var saleItem = saleItems[reqItem.SaleItemId];

                if (reqItem.ShippedQuantity > 0)
                {
                    saleItem.ShippedQuantity += reqItem.ShippedQuantity;
                    saleItem.Product.Stock -= reqItem.ShippedQuantity;
                    await _productUnitService.ConsumeAsync(saleItem.Product, reqItem.ShippedQuantity, saleItem.Id, UnitCustodyReasonEnum.ON_ORDER, reqItem.ProductUnitBarcodes,
                        new UnitMovementContext(ProductUnitMovementReasonEnum.SALE_SHIPPED, shippedAt, DocumentKindEnum.SALE, sale.Id, CustomerId: sale.CustomerId, Note: request.ShippingNote),
                        cancellationToken);
                    await _inventoryCostingService.RecordSaleShipmentAsync(saleItem.Product, reqItem.ShippedQuantity, saleItem.UnitPrice, saleItem.Discount, saleItem.Id, now, cancellationToken);
                }

                if (reqItem.ExcessQuantity > 0)
                {
                    saleItem.Product.Stock -= reqItem.ExcessQuantity;
                    await _productUnitService.ConsumeAsync(saleItem.Product, reqItem.ExcessQuantity, saleItem.Id, UnitCustodyReasonEnum.EXCESS, reqItem.ExcessProductUnitBarcodes,
                        new UnitMovementContext(ProductUnitMovementReasonEnum.SALE_SHIPPED_EXCESS, shippedAt, DocumentKindEnum.SALE, sale.Id, CustomerId: sale.CustomerId, Note: request.ShippingNote),
                        cancellationToken);
                    await _inventoryCostingService.RecordSaleShippedExcessAsync(saleItem.Product, reqItem.ExcessQuantity, saleItem.Id, now, cancellationToken);
                }
            }

            if (!string.IsNullOrWhiteSpace(request.DriverFullName) || !string.IsNullOrWhiteSpace(request.DriverPhoneNumber) || !string.IsNullOrWhiteSpace(request.VehiclePlate))
            {
                await _context.SaleDrivers.AddAsync(new SaleDriver
                {
                    SaleId = sale.Id,
                    // All three are optional and independent, but the columns are NOT NULL: filling
                    // only the name used to fail the insert, so the UI effectively demanded all three.
                    DriverFullName = request.DriverFullName ?? string.Empty,
                    DriverPhoneNumber = request.DriverPhoneNumber ?? string.Empty,
                    VehiclePlate = request.VehiclePlate ?? string.Empty,
                    CreatedAt = now,
                }, cancellationToken);
            }

            if (!string.IsNullOrWhiteSpace(request.ShippingNote))
            {
                await _context.SaleShippingNotes.AddAsync(new SaleShippingNote
                {
                    SaleId = sale.Id,
                    Note = request.ShippingNote,
                    CreatedAt = now,
                }, cancellationToken);
            }

            var fullyShipped = sale.Items.All(i => i.ShippedQuantity >= i.Quantity);
            var anyShipped = sale.Items.Any(i => i.ShippedQuantity > 0);

            sale.Status = fullyShipped
                ? SalesStatusEnum.SHIPPED
                : anyShipped
                    ? SalesStatusEnum.PARTIALLY_DELIVERED
                    : sale.Status;

            sale.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { SaleId = sale.Id, SaleStatus = sale.Status };
            res.Message = "ارسال با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
