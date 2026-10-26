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
    /// The print data of the purchase return sheet (docs/frontend-requests.fa.md section 27): the same InvoiceDocumentBuilder
    /// call GetPurchaseReturnPdf renders.
    /// </summary>
    public class GetPurchaseReturnDocumentQuery : IRequest<ResponseDto>
    {
        public int PurchaseReturnId { get; set; }
    }

    public class GetPurchaseReturnDocumentQueryValidator : AbstractValidator<GetPurchaseReturnDocumentQuery>
    {
        public GetPurchaseReturnDocumentQueryValidator()
        {
            RuleFor(x => x.PurchaseReturnId).GreaterThan(0).WithMessage("مرجوعی نامعتبر است.");
        }
    }

    public class GetPurchaseReturnDocumentQueryHandler : IRequestHandler<GetPurchaseReturnDocumentQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPurchaseReturnDocumentQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetPurchaseReturnDocumentQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            res.Data = InvoiceDocumentDto.From(await InvoiceDocumentBuilder.PurchaseReturnAsync(_context, request.PurchaseReturnId, cancellationToken));
            res.Message = "داده‌ی چاپ برگه مرجوعی خرید ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
