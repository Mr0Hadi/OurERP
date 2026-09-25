using Application.Common.Contracts.Context;
using Application.Common.Contracts.Documents;
using Application.Common.Dtos;
using Common.Exceptions;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Invoice.Queries
{
    public class GetSaleInvoicePdfQuery : IRequest<FileResponseDto>
    {
        public int SaleId { get; set; }
    }

    public class GetSaleInvoicePdfQueryHandler : IRequestHandler<GetSaleInvoicePdfQuery, FileResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPdfDocumentService _pdfDocumentService;
        private readonly IConfiguration _configuration;

        public GetSaleInvoicePdfQueryHandler(IWMSDbContext context, IPdfDocumentService pdfDocumentService, IConfiguration configuration)
        {
            _context = context;
            _pdfDocumentService = pdfDocumentService;
            _configuration = configuration;
        }

        public async Task<FileResponseDto> Handle(GetSaleInvoicePdfQuery request, CancellationToken cancellationToken)
        {
            var sale = await _context.Sales
                .Include(x => x.Customer)
                .Include(x => x.Items)
                    .ThenInclude(x => x.Product)
                .Include(x => x.InstallmentPlan)
                .FirstOrDefaultAsync(x => x.Id == request.SaleId, cancellationToken)
                    ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            // The document prints what is stored on each line (InvoiceLineMath) - it computes nothing of its own, so the
            // PDF, the API and Sale.TotalAmount can never disagree.
            var lines = sale.Items.OrderBy(i => i.Id).Select((item, index) => new InvoiceLineModel
            {
                RowNumber = index + 1,
                ProductCode = item.Product.Code,
                ProductName = item.Product.Name,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                DiscountAmount = item.DiscountAmount,
                TaxAmount = item.TaxAmount,
                LineTotal = item.TotalAmount,
            }).ToList();

            var plan = sale.InstallmentPlan is { IsActive: true } ? sale.InstallmentPlan : null;

            var model = new InvoiceDocumentModel
            {
                Title = "فاکتور فروش",
                DocumentNumber = sale.InvoiceNumber,
                // پیش‌فاکتور هنوز تاریخ فاکتور رسمی ندارد؛ تاریخ ثبت سند چاپ می‌شود.
                DocumentDate = sale.InvoiceDate ?? sale.CreatedAt,
                PaymentDueDate = sale.PaymentDate,
                StatusText = sale.Status.ToString(),
                Description = sale.Description,
                Company = _configuration.GetSection("Company").Get<CompanyInfo>() ?? new CompanyInfo(),
                CounterpartyLabel = "خریدار",
                Counterparty = new PartyInfo
                {
                    Name = $"{sale.Customer.FirstName} {sale.Customer.LastName}",
                    PhoneNumber = sale.Customer.PhoneNumber,
                    Address = sale.Customer.Address,
                    PostalCode = sale.Customer.PostalCode,
                    EconomicCode = sale.Customer.EconomicCode,
                    NationalId = sale.Customer.NationalId,
                    RegistrationNumber = sale.Customer.RegistrationNumber,
                    Province = sale.Customer.Province,
                    City = sale.Customer.City,
                },
                Lines = lines,
                SubTotal = sale.Items.Aggregate(0UL, (sum, l) => sum + l.GrossAmount),
                TotalDiscount = sale.Items.Aggregate(0UL, (sum, l) => sum + l.DiscountAmount),
                TotalTax = sale.Items.Aggregate(0UL, (sum, l) => sum + l.TaxAmount),
                GrandTotal = sale.TotalAmount,
                InstallmentChargeAmount = plan?.InstallmentChargeAmount,
                PayableAmount = plan?.TotalAmount,
                PaidAmount = sale.PaidAmount,
            };
            model.Balance = (long)(model.PayableAmount ?? model.GrandTotal) - (long)model.PaidAmount;

            var bytes = await _pdfDocumentService.RenderInvoiceAsync(model, cancellationToken);

            return new FileResponseDto
            {
                Content = bytes,
                FileName = $"invoice-{sale.InvoiceNumber}.pdf",
                ContentType = "application/pdf",
            };
        }
    }
}
