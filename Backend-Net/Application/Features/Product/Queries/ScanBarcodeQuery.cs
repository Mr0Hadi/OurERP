using Application.Common.Contracts.Context;
using Application.Common.Contracts.ProductCode;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Product.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Queries
{
    /// <summary>
    /// The scanner endpoint. Accepts anything the scanner or keyboard produces - a 14-digit
    /// product payload, a 20-digit unit payload, or either of those with the display dashes
    /// still in - and resolves it to the product (plus the unit, when the barcode identified one).
    /// </summary>
    public class ScanBarcodeQuery : IRequest<ResponseDto>
    {
        public string Code { get; set; }
    }

    public class ScanBarcodeQueryValidator : AbstractValidator<ScanBarcodeQuery>
    {
        public ScanBarcodeQueryValidator()
        {
            RuleFor(x => x.Code).NotEmpty().WithMessage(Validation.RequiredMessage("بارکد"));
        }
    }

    public class ScanBarcodeQueryHandler : IRequestHandler<ScanBarcodeQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IProductCodeService _productCodeService;

        public ScanBarcodeQueryHandler(IWMSDbContext context, IProductCodeService productCodeService)
        {
            _context = context;
            _productCodeService = productCodeService;
        }

        public async Task<ResponseDto> Handle(ScanBarcodeQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var reference = _productCodeService.Parse(request.Code);

            if (reference.Kind == BarcodeReferenceKindEnum.UNKNOWN)
                throw new NotFoundCustomException("بارکد وارد شده معتبر نیست.");

            var product = await _context.Products
                .Include(x => x.ProductCategory)
                .FirstOrDefaultAsync(x => x.Id == reference.ProductId, cancellationToken)
                    ?? throw new NotFoundCustomException("محصول متناظر با این بارکد یافت نشد.");

            Domain.Entities.ProductUnit? unit = null;
            if (reference.Kind == BarcodeReferenceKindEnum.UNIT)
            {
                unit = await _context.ProductUnits
                    .FirstOrDefaultAsync(x => x.BarcodePayload == reference.NormalizedPayload, cancellationToken);
            }

            res.Data = new ScanBarcodeResultDto
            {
                Kind = reference.Kind,
                NormalizedPayload = reference.NormalizedPayload,
                CategoryName = product.ProductCategory.Name,
                Product = new ProductDto
                {
                    Id = product.Id,
                    Name = product.Name,
                    Code = product.Code,
                    BarCode = product.BarCode,
                    Brand = product.Brand,
                    Unit = product.Unit,
                    PurchasePrice = product.PurchasePrice,
                    RetailPrice = product.RetailPrice,
                    WholeSalePrice = product.WholeSalePrice,
                    Tax = product.Tax,
                    Stock = product.Stock,
                    LowStockThreshold = product.LowStockThreshold,
                    ImageUrl = product.ImageUrl,
                    ProductCategoryId = product.ProductCategoryId,
                },
                Unit = unit == null ? null : new ProductUnitDto
                {
                    Id = unit.Id,
                    ProductId = unit.ProductId,
                    SerialNumber = unit.SerialNumber,
                    Barcode = unit.Barcode,
                    BarcodePayload = unit.BarcodePayload,
                    Status = unit.Status,
                    PurchaseItemId = unit.PurchaseItemId,
                    SaleItemId = unit.SaleItemId,
                    CreatedAt = unit.CreatedAt,
                    SoldAt = unit.SoldAt,
                },
            };

            res.Message = "اطلاعات بارکد با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
