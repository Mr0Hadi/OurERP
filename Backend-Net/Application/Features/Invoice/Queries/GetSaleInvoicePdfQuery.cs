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
                .FirstOrDefaultAsync(x => x.Id == request.SaleId, cancellationToken)
                    ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            var lines = sale.Items.Select((item, index) => InvoiceLineCalculator.Build(
                index + 1,
                item.Product.Code,
                item.Product.Name,
                item.Quantity,
                item.UnitPrice,
                item.Discount,
                item.Product.Tax)).ToList();

            var model = new InvoiceDocumentModel
            {
                Title = "فاکتور فروش",
                DocumentNumber = sale.InvoiceNumber,
                DocumentDate = sale.InvoiceDate,
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
                },
                Lines = lines,
                SubTotal = lines.Aggregate(0UL, (sum, l) => sum + (ulong)l.Quantity * l.UnitPrice),
                TotalDiscount = lines.Aggregate(0UL, (sum, l) => sum + l.DiscountAmount),
                TotalTax = lines.Aggregate(0UL, (sum, l) => sum + l.TaxAmount),
                GrandTotal = lines.Aggregate(0UL, (sum, l) => sum + l.LineTotal),
                PaidAmount = sale.PaidAmount,
            };
            model.Balance = (long)model.GrandTotal - (long)model.PaidAmount;

            var bytes = _pdfDocumentService.RenderInvoice(model);

            return new FileResponseDto
            {
                Content = bytes,
                FileName = $"invoice-{sale.InvoiceNumber}.pdf",
                ContentType = "application/pdf",
            };
        }
    }
}
