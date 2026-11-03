using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Application.Common.Sales;
using Application.Features.Sale.Queries;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// Several IN payment rows on one sale, all or nothing - the proforma's payment step, where a customer pays part in cash
    /// and part by card. Each row is an AddSalePaymentCommand sent through IMediator (its validator and rules run) inside one
    /// IUnitOfWork transaction, so the credit limit is checked once on the final state: a sale paid in full in two cash rows
    /// is not refused at the first row (frontend-requests 31.1). The first row of a proforma issues the invoice.
    /// </summary>
    [AuditAction(AuditActionEnum.AddSalePayments)]
    public class AddSalePaymentsCommand : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }

        public List<SalePaymentRowDto> Payments { get; set; } = new();

        /// <summary>As on AddSalePayment: read only when a row issues the invoice; not after today.</summary>
        public DateTime? InvoiceDate { get; set; }
    }

    public class SalePaymentRowDto : PaymentInput
    {
    }

    public class AddSalePaymentsCommandValidator : AbstractValidator<AddSalePaymentsCommand>
    {
        public AddSalePaymentsCommandValidator()
        {
            RuleFor(x => x.SaleId).GreaterThan(0).WithMessage("فروش نامعتبر است.");
            RuleFor(x => x.Payments).NotEmpty().WithMessage("دست‌کم یک ردیف پرداخت لازم است.");
            RuleForEach(x => x.Payments).SetValidator(new PaymentInputValidator());
            RuleFor(x => x.InvoiceDate).Must(SaleInvoiceFinalizer.IsValidInvoiceDate).WithMessage(SaleInvoiceFinalizer.InvoiceDateMessage);
        }
    }

    public class AddSalePaymentsCommandHandler : IRequestHandler<AddSalePaymentsCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IMediator _mediator;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IObjectStorageService _objectStorageService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;

        public AddSalePaymentsCommandHandler(IWMSDbContext context, IMediator mediator, IUnitOfWork unitOfWork,
            IObjectStorageService objectStorageService, ISaleReturnCalculationService saleReturnCalculationService)
        {
            _context = context;
            _mediator = mediator;
            _unitOfWork = unitOfWork;
            _objectStorageService = objectStorageService;
            _saleReturnCalculationService = saleReturnCalculationService;
        }

        public async Task<ResponseDto> Handle(AddSalePaymentsCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            await _unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                foreach (var row in request.Payments)
                    await _mediator.Send(AddSalePaymentCommand.For(request.SaleId, row, request.InvoiceDate), ct);
                return true;
            }, cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, _saleReturnCalculationService, request.SaleId, cancellationToken);
            res.Message = "دریافت‌ها با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
