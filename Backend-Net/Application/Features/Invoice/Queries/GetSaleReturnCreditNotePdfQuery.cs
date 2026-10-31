using Application.Common.Contracts.Context;
using Application.Common.Contracts.Documents;
using Application.Common.Dtos;
using Application.Features.Invoice.Documents;
using MediatR;

namespace Application.Features.Invoice.Queries
{
    /// <summary>The sale return's credit note (InvoiceDocumentBuilder.SaleReturnCreditNoteAsync says what it covers).</summary>
    public class GetSaleReturnCreditNotePdfQuery : IRequest<FileResponseDto>
    {
        public int SaleReturnId { get; set; }
    }

    public class GetSaleReturnCreditNotePdfQueryHandler : IRequestHandler<GetSaleReturnCreditNotePdfQuery, FileResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPdfDocumentService _pdfDocumentService;

        public GetSaleReturnCreditNotePdfQueryHandler(IWMSDbContext context, IPdfDocumentService pdfDocumentService)
        {
            _context = context;
            _pdfDocumentService = pdfDocumentService;
        }

        public async Task<FileResponseDto> Handle(GetSaleReturnCreditNotePdfQuery request, CancellationToken cancellationToken)
        {
            var model = await InvoiceDocumentBuilder.SaleReturnCreditNoteAsync(_context, request.SaleReturnId, cancellationToken);
            var bytes = await _pdfDocumentService.RenderInvoiceAsync(model, cancellationToken);

            return new FileResponseDto
            {
                Content = bytes,
                FileName = $"credit-note-{model.DocumentNumber}.pdf",
                ContentType = "application/pdf",
            };
        }
    }
}
