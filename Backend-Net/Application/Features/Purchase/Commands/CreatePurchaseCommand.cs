using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Application.Features.Purchase.Dtos;
using Application.Features.Purchase.Queries;
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
        public PaymentTypeEnum PaymentType { get; set; }

        /// <summary>PROFORMA, PENDING or SHIPPED. Anything past PROFORMA needs the supplier's invoice number and date.</summary>
        public PurchaseStatusEnum Status { get; set; }

        /// <summary>
        /// Payments already made, e.g. a prepayment on a proforma. Optional; always money we paid (OUT). PaidAmount is
        /// their sum - it is not accepted from the client.
        /// </summary>
        public List<PaymentDetailDto> PaymentDetails { get; set; } = new();
        public string InvoiceNumber { get; set; }
        public DateTime? InvoiceDate { get; set; }
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
                item.RuleFor(i => i.Discount).InclusiveBetween(0, 100).WithMessage("تخفیف باید بین ۰ تا ۱۰۰ درصد باشد.");
            });
            RuleFor(x => x.SupplierId).NotEmpty().WithMessage(Validation.RequiredMessage("فروشنده"));
            RuleFor(x => x.Status).Must(DocumentLockRules.IsManualPurchaseStatus)
                .WithMessage("خرید فقط با وضعیت پیش‌فاکتور، در انتظار یا ارسال‌شده ثبت می‌شود.");
            // در مرحله‌ی پیش‌فاکتور، فاکتور رسمیِ تامین‌کننده هنوز نرسیده؛ شماره و تاریخش نباید الزامی باشد.
            RuleFor(x => x.InvoiceNumber).NotEmpty().When(x => x.Status != PurchaseStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("شماره فاکتور"));
            // تاریخ فاکتور فقط در پیش‌فاکتور می‌تواند null بماند؛ در بقیه‌ی وضعیت‌ها الزامی است.
            RuleFor(x => x.InvoiceDate).Must(d => d.HasValue && d.Value != default)
                .When(x => x.Status != PurchaseStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            // مهلت پرداخت اختیاری است (خرید/فروش نقدی مهلتی ندارد)، ولی اگر پر شد نباید قبل از تاریخ فاکتور باشد.
            RuleFor(x => x.PaymentDate).GreaterThanOrEqualTo(x => x.InvoiceDate)
                .When(x => x.PaymentDate.HasValue && x.InvoiceDate.HasValue)
                .WithMessage("مهلت پرداخت نمی‌تواند قبل از تاریخ فاکتور باشد.");
            RuleForEach(x => x.PaymentDetails).SetValidator(new PaymentRowValidator());
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

            // مبالغ هر قلم (با مالیاتِ کالا) و جمع سند را سرور حساب می‌کند؛ جمعی از کلاینت گرفته نمی‌شود.
            var products = await DocumentProducts.LoadAsync(_context, purchase.Items.Select(i => i.ProductId), cancellationToken);
            foreach (var item in purchase.Items)
                InvoiceLineMath.Stamp(item, products[item.ProductId]);
            purchase.TotalAmount = InvoiceLineMath.DocumentTotal(purchase.Items);

            // ردیف‌های پرداخت از راه نگاشت AutoMapper روی گراف خرید ذخیره می‌شوند؛ جهتشان همیشه جهت خود سند است
            // (پولی که ما داده‌ایم) و PaidAmount جمع همین ردیف‌هاست، نه عددی از کلاینت.
            purchase.PaymentDetails ??= new();
            foreach (var payment in purchase.PaymentDetails)
            {
                payment.Direction = DocumentPayments.PurchaseDirection;
                payment.Purpose = PaymentPurposeEnum.NORMAL;
                if (payment.PaidAt == default)
                    payment.PaidAt = DateTime.Now;
            }
            purchase.PaidAmount = DocumentPayments.NetPaid(purchase.PaymentDetails, DocumentPayments.PurchaseDirection);
            foreach (var payment in purchase.PaymentDetails)
                await PartyLedger.PurchasePaymentAsync(_context, purchase, payment, cancellationToken);

            // Created past PROFORMA = the supplier's invoice is already recorded: it goes on the supplier's account.
            if (purchase.Status != PurchaseStatusEnum.PROFORMA)
                await PartyLedger.PurchaseInvoiceRecordedAsync(_context, purchase, purchase.InvoiceDate ?? DateTime.Now, cancellationToken);

            await _purchaseRepository.AddAsync(purchase, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            if (request.Attachments.Count > 0)
            {
                await DocumentAttachmentWriter.AddAsync(_context, _objectStorageService, DocumentKindEnum.PURCHASE, purchase.Id, request.Attachments, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }

            res.Data = await PurchaseDetailReader.ReadAsync(_context, _objectStorageService, purchase.Id, cancellationToken);
            res.Message = "خرید با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
