using Application.Common.Contracts.Context;
using Application.Common.Contracts.Documents;
using Application.Common.Dtos;
using Application.Features.Invoice.Documents;
using MediatR;

namespace Application.Features.Invoice.Queries
{
    /// <summary>The purchase return sheet (InvoiceDocumentBuilder.PurchaseReturnAsync says what it prints).</summary>
    public class GetPurchaseReturnPdfQuery : IRequest<FileResponseDto>
    {
        public int PurchaseReturnId { get; set; }
    }

    public class GetPurchaseReturnPdfQueryHandler : IRequestHandler<GetPurchaseReturnPdfQuery, FileResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPdfDocumentService _pdfDocumentService;

        public GetPurchaseReturnPdfQueryHandler(IWMSDbContext context, IPdfDocumentService pdfDocumentService)
        {
            _context = context;
            _pdfDocumentService = pdfDocumentService;
        }

        public async Task<FileResponseDto> Handle(GetPurchaseReturnPdfQuery request, CancellationToken cancellationToken)
        {
            var model = await InvoiceDocumentBuilder.PurchaseReturnAsync(_context, request.PurchaseReturnId, cancellationToken);
            var bytes = await _pdfDocumentService.RenderInvoiceAsync(model, cancellationToken);

            return new FileResponseDto
            {
                Content = bytes,
                FileName = $"purchase-return-{model.DocumentNumber}.pdf",
                ContentType = "application/pdf",
            };
        }
    }
}
