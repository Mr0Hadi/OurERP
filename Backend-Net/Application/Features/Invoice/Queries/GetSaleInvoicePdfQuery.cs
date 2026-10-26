using Application.Common.Contracts.Context;
using Application.Common.Contracts.Documents;
using Application.Common.Dtos;
using Application.Features.Invoice.Documents;
using MediatR;

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

        public GetSaleInvoicePdfQueryHandler(IWMSDbContext context, IPdfDocumentService pdfDocumentService)
        {
            _context = context;
            _pdfDocumentService = pdfDocumentService;
        }

        public async Task<FileResponseDto> Handle(GetSaleInvoicePdfQuery request, CancellationToken cancellationToken)
        {
            var model = await InvoiceDocumentBuilder.SaleInvoiceAsync(_context, request.SaleId, cancellationToken);
            var bytes = await _pdfDocumentService.RenderInvoiceAsync(model, cancellationToken);

            return new FileResponseDto
            {
                Content = bytes,
                FileName = $"invoice-{model.DocumentNumber}.pdf",
                ContentType = "application/pdf",
            };
        }
    }
}
