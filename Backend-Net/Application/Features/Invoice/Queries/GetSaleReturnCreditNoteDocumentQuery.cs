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
    /// The print data of a sale return's credit note (docs/frontend-requests.fa.md section 27): the same InvoiceDocumentBuilder
    /// call GetSaleReturnCreditNotePdf renders - including its 400 for a return with no money owed back.
    /// </summary>
    public class GetSaleReturnCreditNoteDocumentQuery : IRequest<ResponseDto>
    {
        public int SaleReturnId { get; set; }
    }

    public class GetSaleReturnCreditNoteDocumentQueryValidator : AbstractValidator<GetSaleReturnCreditNoteDocumentQuery>
    {
        public GetSaleReturnCreditNoteDocumentQueryValidator()
        {
            RuleFor(x => x.SaleReturnId).GreaterThan(0).WithMessage("مرجوعی نامعتبر است.");
        }
    }

    public class GetSaleReturnCreditNoteDocumentQueryHandler : IRequestHandler<GetSaleReturnCreditNoteDocumentQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSaleReturnCreditNoteDocumentQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSaleReturnCreditNoteDocumentQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            res.Data = InvoiceDocumentDto.From(await InvoiceDocumentBuilder.SaleReturnCreditNoteAsync(_context, request.SaleReturnId, cancellationToken));
            res.Message = "داده‌ی چاپ برگه اعتباری مرجوعی ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
