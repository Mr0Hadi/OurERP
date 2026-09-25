using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Purchase.Queries;
using Common.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Commands
{
    /// <summary>
    /// Sets or clears the payment due date, in any status: a deadline agreed with the supplier can move after the
    /// invoice is issued without the invoice itself changing.
    /// </summary>
    public class UpdatePurchasePaymentDateCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public DateTime? PaymentDate { get; set; }
    }

    public class UpdatePurchasePaymentDateCommandValidator : AbstractValidator<UpdatePurchasePaymentDateCommand>
    {
        public UpdatePurchasePaymentDateCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("خرید نامعتبر است.");
        }
    }

    public class UpdatePurchasePaymentDateCommandHandler : IRequestHandler<UpdatePurchasePaymentDateCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdatePurchasePaymentDateCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdatePurchasePaymentDateCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases.FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (request.PaymentDate.HasValue && purchase.InvoiceDate.HasValue && request.PaymentDate.Value < purchase.InvoiceDate.Value)
                throw new ValidationCustomException("مهلت پرداخت نمی‌تواند قبل از تاریخ فاکتور باشد.");

            purchase.PaymentDate = request.PaymentDate;
            purchase.UpdatedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseDetailReader.ReadAsync(_context, _objectStorageService, purchase.Id, cancellationToken);
            res.Message = "مهلت پرداخت خرید با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
