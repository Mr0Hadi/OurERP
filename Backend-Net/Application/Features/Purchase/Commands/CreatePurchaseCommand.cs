using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Purchase.Dtos;
using AutoMapper;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Purchase.Commands
{
    public class CreatePurchaseCommand : IRequest<ResponseDto>
    {
        public List<CreatePurchaseItemDto> ProductItemList { get; set; }
        public int SupplierId { get; set; }
        public UInt64 TotalPrice { get; set; }
        public UInt64 PaidPrice { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public List<PaymentDetailDto> PaymentDetails { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public string? Description { get; set; }
    }

    public class CreatePurchaseValidator : AbstractValidator<CreatePurchaseCommand>
    {
        public CreatePurchaseValidator()
        {
            RuleFor(x => x.ProductItemList).NotEmpty().WithMessage(Validation.RequiredMessage("لیست محصولات"));
            RuleForEach(x => x.ProductItemList).ChildRules(item =>
            {
                item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage(Validation.RequiredMessage("محصول"));
                item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("تعداد هر محصول باید از صفر بیشتر باشد.");
                item.RuleFor(i => i.Discount).GreaterThanOrEqualTo(0).WithMessage("تخفیف باید بیشتر یا مساوی صفر باشد.");
            });
            RuleFor(x => x.SupplierId).NotEmpty().WithMessage(Validation.RequiredMessage("فروشنده"));
            RuleFor(x => x.Status).IsInEnum().WithMessage("وضعیت نامعتبر است.");
            RuleFor(x => x.TotalPrice).Must(p => p > 0).WithMessage("مبلغ کل باید از صفر بیشتر باشد.");
            RuleFor(x => x.PaidPrice).Must(p => p >= 0).WithMessage("مبلغ پرداختی باید بیشتر یا مساوی صفر باشد.");
            RuleFor(x => x.InvoiceNumber).NotEmpty().WithMessage(Validation.RequiredMessage("شماره فاکتور"));
            RuleFor(x => x.InvoiceDate).NotEmpty().WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            RuleFor(x => x.PaymentDetails).NotEmpty().When(x => x.PaymentType != PaymentTypeEnum.CASH)
                .WithMessage("اطلاعات پرداخت باید به طول کامل پر شود.");
        }
    }

    public class CreatePurchaseCommandHandler : IRequestHandler<CreatePurchaseCommand, ResponseDto>
    {
        private readonly IPurchaseRepository _purchaseRepository;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;

        public CreatePurchaseCommandHandler(IPurchaseRepository purchaseRepository, IMapper mapper, IUnitOfWork unitOfWork)
        {
            _purchaseRepository = purchaseRepository;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreatePurchaseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = _mapper.Map<Domain.Entities.Purchase>(request);

            await _purchaseRepository.AddAsync(purchase);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "خرید با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}