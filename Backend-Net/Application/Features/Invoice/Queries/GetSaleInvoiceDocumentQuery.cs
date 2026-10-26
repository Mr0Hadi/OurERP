using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Invoice.Documents;
using Application.Features.Invoice.Dtos;
using FluentValidation;
using MediatR;

namespace Application.Features.Invoice.Queries
{
    /// <summary>
    /// The print data of the sale invoice (docs/frontend-requests.fa.md section 27), for the browser print studio: the same
    /// InvoiceDocumentBuilder call GetSaleInvoicePdf renders, in the usual ResponseDto envelope. The PDF stays for download.
    /// </summary>
    public class GetSaleInvoiceDocumentQuery : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }
    }

    public class GetSaleInvoiceDocumentQueryValidator : AbstractValidator<GetSaleInvoiceDocumentQuery>
    {
        public GetSaleInvoiceDocumentQueryValidator()
        {
            RuleFor(x => x.SaleId).GreaterThan(0).WithMessage("فروش نامعتبر است.");
        }
    }

    public class GetSaleInvoiceDocumentQueryHandler : IRequestHandler<GetSaleInvoiceDocumentQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSaleInvoiceDocumentQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSaleInvoiceDocumentQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            res.Data = InvoiceDocumentDto.From(await InvoiceDocumentBuilder.SaleInvoiceAsync(_context, request.SaleId, cancellationToken));
            res.Message = "داده‌ی چاپ فاکتور فروش ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
