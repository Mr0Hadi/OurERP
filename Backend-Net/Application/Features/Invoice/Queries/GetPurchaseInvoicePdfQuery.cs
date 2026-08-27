using Application.Common.Contracts.Context;
using Application.Common.Contracts.Documents;
using Application.Common.Contracts.Invoice;
using Application.Common.Dtos;
using Common.Exceptions;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Invoice.Queries
{
    public class GetPurchaseInvoicePdfQuery : IRequest<FileResponseDto>
    {
        public int PurchaseId { get; set; }
    }

    public class GetPurchaseInvoicePdfQueryHandler : IRequestHandler<GetPurchaseInvoicePdfQuery, FileResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPdfDocumentService _pdfDocumentService;
        private readonly IInvoiceLineCalculationService _invoiceLineCalculationService;
        private readonly IConfiguration _configuration;

        public GetPurchaseInvoicePdfQueryHandler(IWMSDbContext context, IPdfDocumentService pdfDocumentService, IInvoiceLineCalculationService invoiceLineCalculationService, IConfiguration configuration)
        {
            _context = context;
            _pdfDocumentService = pdfDocumentService;
            _invoiceLineCalculationService = invoiceLineCalculationService;
            _configuration = configuration;
        }

        public async Task<FileResponseDto> Handle(GetPurchaseInvoicePdfQuery request, CancellationToken cancellationToken)
        {
            var purchase = await _context.Purchases
                .Include(x => x.Supplier)
                .Include(x => x.Items)
                    .ThenInclude(x => x.Product)
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseId, cancellationToken)
                    ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            var lines = purchase.Items.Select((item, index) => _invoiceLineCalculationService.BuildLine(
                index + 1,
                item.Product.Code,
                item.Product.Name,
                item.Quantity,
                item.UnitPrice,
                item.Discount,
                item.Product.Tax)).ToList();

            var model = new InvoiceDocumentModel
            {
                Title = "فاکتور خرید",
                DocumentNumber = purchase.InvoiceNumber,
                DocumentDate = purchase.InvoiceDate,
                StatusText = purchase.Status.ToString(),
                Description = purchase.Description,
                Company = _configuration.GetSection("Company").Get<CompanyInfo>() ?? new CompanyInfo(),
                CounterpartyLabel = "فروشنده",
                Counterparty = new PartyInfo
                {
                    Name = purchase.Supplier.CompanyName,
                    PhoneNumber = purchase.Supplier.Phone,
                    Address = purchase.Supplier.Address,
                    PostalCode = purchase.Supplier.PostalCode,
                    EconomicCode = purchase.Supplier.EconomicCode,
                    NationalId = purchase.Supplier.NationalId,
                    RegistrationNumber = purchase.Supplier.RegistrationNumber,
                    Province = purchase.Supplier.Province,
                    City = purchase.Supplier.City,
                },
                Lines = lines,
                SubTotal = lines.Aggregate(0UL, (sum, l) => sum + (ulong)l.Quantity * l.UnitPrice),
                TotalDiscount = lines.Aggregate(0UL, (sum, l) => sum + l.DiscountAmount),
                TotalTax = lines.Aggregate(0UL, (sum, l) => sum + l.TaxAmount),
                GrandTotal = lines.Aggregate(0UL, (sum, l) => sum + l.LineTotal),
                PaidAmount = purchase.PaidAmount,
            };
            model.Balance = (long)model.GrandTotal - (long)model.PaidAmount;

            var bytes = await _pdfDocumentService.RenderInvoiceAsync(model, cancellationToken);

            return new FileResponseDto
            {
                Content = bytes,
                FileName = $"purchase-invoice-{purchase.InvoiceNumber}.pdf",
                ContentType = "application/pdf",
            };
        }
    }
}
