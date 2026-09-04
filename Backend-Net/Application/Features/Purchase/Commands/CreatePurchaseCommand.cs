using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Purchase.Dtos;
using AutoMapper;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.Purchase.Commands
{
    public class CreatePurchaseCommand : IRequest<ResponseDto>
    {
        public List<CreatePurchaseItemDto> ProductItemList { get; set; }
        public int SupplierId { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public List<PaymentDetailDto> PaymentDetails { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string? Description { get; set; }
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
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
            RuleFor(x => x.TotalAmount).Must(p => p > 0).WithMessage("مبلغ کل باید از صفر بیشتر باشد.");
            RuleFor(x => x.PaidAmount).Must(p => p >= 0).WithMessage("مبلغ پرداختی باید بیشتر یا مساوی صفر باشد.");
            // در مرحله‌ی پیش‌فاکتور، فاکتور رسمیِ تامین‌کننده هنوز نرسیده؛ شماره و تاریخش نباید الزامی باشد.
            RuleFor(x => x.InvoiceNumber).NotEmpty().When(x => x.Status != PurchaseStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("شماره فاکتور"));
            RuleFor(x => x.InvoiceDate).NotEmpty().When(x => x.Status != PurchaseStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            // مهلت پرداخت اختیاری است (خرید/فروش نقدی مهلتی ندارد)، ولی اگر پر شد نباید قبل از تاریخ فاکتور باشد.
            RuleFor(x => x.PaymentDate).GreaterThanOrEqualTo(x => x.InvoiceDate)
                .When(x => x.PaymentDate.HasValue && x.InvoiceDate != default)
                .WithMessage("مهلت پرداخت نمی‌تواند قبل از تاریخ فاکتور باشد.");
            RuleFor(x => x.PaymentDetails).NotEmpty().When(x => x.PaymentType != PaymentTypeEnum.CASH)
                .WithMessage("اطلاعات پرداخت باید به طول کامل پر شود.");
            RuleForEach(x => x.Attachments).ChildRules(a =>
            {
                a.RuleFor(i => i.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("کلید فایل ضمیمه"));
            });
        }
    }

    public class CreatePurchaseCommandHandler : IRequestHandler<CreatePurchaseCommand, ResponseDto>
    {
        private readonly IPurchaseRepository _purchaseRepository;
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IMapper _mapper;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IUserContextService _userContextService;

        public CreatePurchaseCommandHandler(
            IPurchaseRepository purchaseRepository,
            IWMSDbContext context,
            IObjectStorageService objectStorageService,
            IMapper mapper,
            IUnitOfWork unitOfWork,
            IUserContextService userContextService)
        {
            _purchaseRepository = purchaseRepository;
            _context = context;
            _objectStorageService = objectStorageService;
            _mapper = mapper;
            _unitOfWork = unitOfWork;
            _userContextService = userContextService;
        }

        public async Task<ResponseDto> Handle(CreatePurchaseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = _mapper.Map<Domain.Entities.Purchase>(request);
            // شماره فاکتور در مرحله‌ی پیش‌فاکتور می‌تواند خالی باشد، ولی ستون NOT NULL است.
            purchase.InvoiceNumber ??= string.Empty;
            purchase.PurchasingUserId = _userContextService.GetUserId().ToInt();

            await _purchaseRepository.AddAsync(purchase, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            foreach (var attachment in request.Attachments)
            {
                await _context.DocumentAttachments.AddAsync(new Domain.Entities.DocumentAttachment
                {
                    DocumentKind = DocumentKindEnum.PURCHASE,
                    DocumentId = purchase.Id,
                    ObjectKey = _objectStorageService.NormalizeKey(attachment.ObjectKey) ?? attachment.ObjectKey,
                    FileName = attachment.FileName,
                    Note = attachment.Note,
                    CreatedAt = DateTime.Now,
                }, cancellationToken);
            }

            if (request.Attachments.Count > 0)
                await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "خرید با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}