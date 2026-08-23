using Application.Common.Contracts.Barcode;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Documents;
using Application.Common.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Barcode.Queries
{
    /// <summary>
    /// The warehouse "print labels" screen: renders one Code128 label per physical ProductUnit
    /// so each printed sticker matches an actual in-stock item, not an arbitrary quantity - see
    /// docs/product-code-barcode-invoice-design.fa.md 2. Defaults to IN_STOCK units only; a serial
    /// range narrows to a specific receiving batch (units mint with consecutive serials per
    /// product, so "the batch just received" is a contiguous range).
    /// </summary>
    public class GetProductLabelsPdfQuery : IRequest<FileResponseDto>
    {
        public int ProductId { get; set; }
        public ProductUnitStatusEnum? Status { get; set; } = ProductUnitStatusEnum.IN_STOCK;
        public int? FromSerial { get; set; }
        public int? ToSerial { get; set; }

        public BarcodeLabelLayoutMode Mode { get; set; } = BarcodeLabelLayoutMode.SHEET;
        public int Columns { get; set; } = 3;
        public int Rows { get; set; } = 10;
        public decimal LabelWidthMm { get; set; } = 48;
        public decimal LabelHeightMm { get; set; } = 25;
        public bool ShowProductName { get; set; } = true;
        public bool ShowPrice { get; set; }
    }

    public class GetProductLabelsPdfQueryValidator : AbstractValidator<GetProductLabelsPdfQuery>
    {
        public GetProductLabelsPdfQueryValidator()
        {
            RuleFor(x => x.ProductId).GreaterThan(0).WithMessage(Validation.RequiredMessage("محصول"));
            RuleFor(x => x.Columns).GreaterThan(0);
            RuleFor(x => x.Rows).GreaterThan(0);
        }
    }

    public class GetProductLabelsPdfQueryHandler : IRequestHandler<GetProductLabelsPdfQuery, FileResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPdfDocumentService _pdfDocumentService;

        public GetProductLabelsPdfQueryHandler(IWMSDbContext context, IPdfDocumentService pdfDocumentService)
        {
            _context = context;
            _pdfDocumentService = pdfDocumentService;
        }

        public async Task<FileResponseDto> Handle(GetProductLabelsPdfQuery request, CancellationToken cancellationToken)
        {
            var product = await _context.Products.FirstOrDefaultAsync(x => x.Id == request.ProductId, cancellationToken)
                ?? throw new NotFoundCustomException("محصول مورد نظر یافت نشد.");

            var query = _context.ProductUnits.Where(x => x.ProductId == request.ProductId);

            if (request.Status.HasValue)
                query = query.Where(x => x.Status == request.Status);

            if (request.FromSerial.HasValue)
                query = query.Where(x => x.SerialNumber >= request.FromSerial);

            if (request.ToSerial.HasValue)
                query = query.Where(x => x.SerialNumber <= request.ToSerial);

            var units = await query.OrderBy(x => x.SerialNumber).ToListAsync(cancellationToken);

            if (units.Count == 0)
                throw new ValidationCustomException("هیچ دانه‌ای مطابق با فیلترهای وارد شده یافت نشد.");

            var model = new BarcodeLabelSheetModel
            {
                Mode = request.Mode,
                Columns = request.Columns,
                Rows = request.Rows,
                LabelWidthMm = request.LabelWidthMm,
                LabelHeightMm = request.LabelHeightMm,
                ShowProductName = request.ShowProductName,
                ShowPrice = request.ShowPrice,
                Labels = units.Select(u => new BarcodeLabelModel
                {
                    ProductName = product.Name,
                    BarcodePayload = u.BarcodePayload,
                    HumanReadable = u.Barcode,
                    Price = request.ShowPrice ? product.RetailPrice : null,
                }).ToList(),
            };

            var bytes = _pdfDocumentService.RenderBarcodeLabels(model);

            return new FileResponseDto
            {
                Content = bytes,
                FileName = $"labels-{product.Code}.pdf",
                ContentType = "application/pdf",
            };
        }
    }
}
