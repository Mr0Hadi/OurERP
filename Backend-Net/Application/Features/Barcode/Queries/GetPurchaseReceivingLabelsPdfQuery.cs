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
    /// The receiving-dock "print labels for this purchase" button. A supplier's own barcode (if
    /// any) only means something inside the supplier's system, so every unit ReceivePurchaseCommand
    /// mints gets its own project-generated ProductUnit barcode - this endpoint prints that batch so
    /// the warehouse can put a scannable sticker on each physical item before it hits the shelf.
    ///
    /// "Correct" units only: ReceivePurchaseCommand mints a ProductUnit only for the good quantity
    /// of each round (PurchaseIssueTypeEnum lines - shortage/damaged/excess/etc - never mint units),
    /// so filtering ProductUnit by PurchaseItemId already excludes anything reported as a problem.
    /// Spans every receiving round for the purchase, not just the latest one, since ProductUnit
    /// keeps the PurchaseItemId it was minted with regardless of which round that was.
    /// </summary>
    public class GetPurchaseReceivingLabelsPdfQuery : IRequest<FileResponseDto>
    {
        public int PurchaseId { get; set; }

        /// <summary>Narrow to units minted in one receiving round rather than the purchase's whole history.</summary>
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

    public class GetPurchaseReceivingLabelsPdfQueryValidator : AbstractValidator<GetPurchaseReceivingLabelsPdfQuery>
    {
        public GetPurchaseReceivingLabelsPdfQueryValidator()
        {
            RuleFor(x => x.PurchaseId).GreaterThan(0).WithMessage(Validation.RequiredMessage("خرید"));
            RuleFor(x => x.Columns).GreaterThan(0);
            RuleFor(x => x.Rows).GreaterThan(0);
        }
    }

    public class GetPurchaseReceivingLabelsPdfQueryHandler : IRequestHandler<GetPurchaseReceivingLabelsPdfQuery, FileResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPdfDocumentService _pdfDocumentService;

        public GetPurchaseReceivingLabelsPdfQueryHandler(IWMSDbContext context, IPdfDocumentService pdfDocumentService)
        {
            _context = context;
            _pdfDocumentService = pdfDocumentService;
        }

        public async Task<FileResponseDto> Handle(GetPurchaseReceivingLabelsPdfQuery request, CancellationToken cancellationToken)
        {
            var purchase = await _context.Purchases
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId, cancellationToken)
                    ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            var purchaseItemIds = purchase.Items.Select(x => x.Id).ToList();

            var query = _context.ProductUnits
                .Where(x => x.PurchaseItemId != null && purchaseItemIds.Contains(x.PurchaseItemId.Value));

            if (request.FromSerial.HasValue)
                query = query.Where(x => x.SerialNumber >= request.FromSerial);

            if (request.ToSerial.HasValue)
                query = query.Where(x => x.SerialNumber <= request.ToSerial);

            var units = await query
                .Include(x => x.Product)
                .OrderBy(x => x.ProductId)
                    .ThenBy(x => x.SerialNumber)
                .ToListAsync(cancellationToken);

            if (units.Count == 0)
                throw new ValidationCustomException("هیچ قلم صحیح دریافت‌شده‌ای برای این خرید یافت نشد.");

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
                    ProductName = u.Product!.Name,
                    BarcodePayload = u.BarcodePayload,
                    HumanReadable = u.Barcode,
                    Price = request.ShowPrice ? u.Product!.RetailPrice : null,
                }).ToList(),
            };

            var bytes = _pdfDocumentService.RenderBarcodeLabels(model);

            return new FileResponseDto
            {
                Content = bytes,
                FileName = $"labels-purchase-{purchase.InvoiceNumber}.pdf",
                ContentType = "application/pdf",
            };
        }
    }
}
