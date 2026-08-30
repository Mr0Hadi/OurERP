using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Purchase.Commands
{
    public class UpdatePurchaseCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int SupplierId { get; set; }
    }

    public class UpdatePurchaseCommandValidator : AbstractValidator<UpdatePurchaseCommand>
    {
        public UpdatePurchaseCommandValidator()
        {
            RuleFor(x => x.InvoiceNumber).NotEmpty().WithMessage(Validation.RequiredMessage("شماره فاکتور"));
            RuleFor(x => x.InvoiceDate).NotEmpty().WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            RuleFor(x => x.SupplierId).GreaterThan(0).WithMessage(Validation.RequiredMessage("فروشنده"));
            RuleFor(x => x.TotalAmount).Must(p => p > 0).WithMessage("مبلغ کل باید از صفر بیشتر باشد.");
            RuleFor(x => x.PaidAmount).Must(p => p >= 0).WithMessage("مبلغ پرداختی باید بیشتر یا مساوی صفر باشد.");
        }
    }

    public class UpdatePurchaseCommandHandler : IRequestHandler<UpdatePurchaseCommand, ResponseDto>
    {
        private readonly IPurchaseRepository _purchaseRepository;
        private readonly IUnitOfWork _unitOfWork;

        public UpdatePurchaseCommandHandler(IPurchaseRepository purchaseRepository, IUnitOfWork unitOfWork)
        {
            _purchaseRepository = purchaseRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdatePurchaseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _purchaseRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            purchase.InvoiceNumber = request.InvoiceNumber;
            purchase.InvoiceDate = request.InvoiceDate;
            purchase.Status = request.Status;
            purchase.PaymentType = request.PaymentType;
            purchase.TotalAmount = request.TotalAmount;
            purchase.PaidAmount = request.PaidAmount;
            purchase.Description = request.Description;
            purchase.SupplierId = request.SupplierId;
            purchase.UpdatedAt = DateTime.Now;

            _purchaseRepository.Update(purchase);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "خرید با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
