using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Application.Common.Sales;
using Application.Features.Sale.Queries;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    /// <summary>
    /// Records money moving on a sale. Direction defaults to IN (the customer pays); OUT is money given back to the
    /// customer. The first IN on a PROFORMA issues the invoice (SaleInvoiceFinalizer) - a proforma is a sale nobody has
    /// paid a rial towards. PaidAmount is recomputed from the rows.
    /// </summary>
    public class AddSalePaymentCommand : PaymentInput, IRequest<ResponseDto>
    {
        public int SaleId { get; set; }

        /// <summary>IN (default) = the customer pays us; OUT = we refund the customer.</summary>
        public PaymentDirectionEnum? Direction { get; set; }
    }

    public class AddSalePaymentCommandValidator : AbstractValidator<AddSalePaymentCommand>
    {
        public AddSalePaymentCommandValidator()
        {
            Include(new PaymentInputValidator());
            RuleFor(x => x.SaleId).GreaterThan(0).WithMessage("فروش نامعتبر است.");
            RuleFor(x => x.Direction).IsInEnum().When(x => x.Direction.HasValue).WithMessage("جهت پرداخت نامعتبر است.");
        }
    }

    public class AddSalePaymentCommandHandler : IRequestHandler<AddSalePaymentCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public AddSalePaymentCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(AddSalePaymentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales
                .Include(x => x.PaymentDetails)
                .FirstOrDefaultAsync(x => x.Id == request.SaleId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            await SalePaymentRules.EnsureNotUnderInstallmentPlanAsync(_context, sale, cancellationToken);

            var direction = request.Direction ?? DocumentPayments.SaleDirection;
            if (sale.Status == SalesStatusEnum.CANCELLED && direction == DocumentPayments.SaleDirection)
                throw new ValidationCustomException("فروش لغوشده پرداخت تازه نمی‌پذیرد؛ فقط پول برگشتی به مشتری ثبت می‌شود.");

            var payment = PaymentWriter.NewRow(request, direction);
            sale.PaymentDetails.Add(payment);
            await PartyLedger.SalePaymentAsync(_context, sale, payment, cancellationToken);
            sale.PaidAmount = DocumentPayments.NetPaid(sale.PaymentDetails, DocumentPayments.SaleDirection);
            sale.UpdatedAt = DateTime.Now;

            if (sale.Status == SalesStatusEnum.PROFORMA && sale.PaidAmount > 0)
                await SaleInvoiceFinalizer.FinalizeAsync(_context, sale, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleDetailReader.ReadAsync(_context, _objectStorageService, sale.Id, cancellationToken);
            res.Message = "پرداخت فروش با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
