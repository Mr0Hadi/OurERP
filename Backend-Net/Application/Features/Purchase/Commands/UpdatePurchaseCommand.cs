using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Commands
{
    public class UpdatePurchaseCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public PurchaseStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int SupplierId { get; set; }
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
    }

    public class UpdatePurchaseCommandValidator : AbstractValidator<UpdatePurchaseCommand>
    {
        public UpdatePurchaseCommandValidator()
        {
            // در مرحله‌ی پیش‌فاکتور، فاکتور رسمیِ تامین‌کننده هنوز نرسیده؛ شماره و تاریخش نباید الزامی باشد.
            RuleFor(x => x.InvoiceNumber).NotEmpty().When(x => x.Status != PurchaseStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("شماره فاکتور"));
            RuleFor(x => x.InvoiceDate).NotEmpty().When(x => x.Status != PurchaseStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            // مهلت پرداخت اختیاری است (خرید/فروش نقدی مهلتی ندارد)، ولی اگر پر شد نباید قبل از تاریخ فاکتور باشد.
            RuleFor(x => x.PaymentDate).GreaterThanOrEqualTo(x => x.InvoiceDate)
                .When(x => x.PaymentDate.HasValue && x.InvoiceDate != default)
                .WithMessage("مهلت پرداخت نمی‌تواند قبل از تاریخ فاکتور باشد.");
            RuleFor(x => x.SupplierId).GreaterThan(0).WithMessage(Validation.RequiredMessage("فروشنده"));
            RuleFor(x => x.TotalAmount).Must(p => p > 0).WithMessage("مبلغ کل باید از صفر بیشتر باشد.");
            RuleFor(x => x.PaidAmount).Must(p => p >= 0).WithMessage("مبلغ پرداختی باید بیشتر یا مساوی صفر باشد.");
            RuleForEach(x => x.Attachments).ChildRules(a =>
            {
                a.RuleFor(i => i.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("کلید فایل ضمیمه"));
            });
        }
    }

    public class UpdatePurchaseCommandHandler : IRequestHandler<UpdatePurchaseCommand, ResponseDto>
    {
        private readonly IPurchaseRepository _purchaseRepository;
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdatePurchaseCommandHandler(
            IPurchaseRepository purchaseRepository,
            IWMSDbContext context,
            IObjectStorageService objectStorageService,
            IUnitOfWork unitOfWork)
        {
            _purchaseRepository = purchaseRepository;
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdatePurchaseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _purchaseRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            // خروج از «پیش‌فاکتور» یعنی فاکتور رسمیِ تامین‌کننده رسیده؛ باید شماره‌اش ثبت شده باشد.
            if (purchase.Status == PurchaseStatusEnum.PROFORMA
                && request.Status != PurchaseStatusEnum.PROFORMA
                && string.IsNullOrWhiteSpace(request.InvoiceNumber))
                throw new ValidationCustomException("برای خروج از پیش‌فاکتور، شماره فاکتور تامین‌کننده را وارد کنید.");

            purchase.InvoiceNumber = request.InvoiceNumber ?? string.Empty;
            purchase.InvoiceDate = request.InvoiceDate;
            purchase.PaymentDate = request.PaymentDate;
            purchase.Status = request.Status;
            purchase.PaymentType = request.PaymentType;
            purchase.TotalAmount = request.TotalAmount;
            purchase.PaidAmount = request.PaidAmount;
            purchase.Description = request.Description;
            purchase.SupplierId = request.SupplierId;
            purchase.UpdatedAt = DateTime.Now;

            _purchaseRepository.Update(purchase);

            // ضمیمه‌ها به‌طور کامل جایگزین می‌شوند، نه اضافه - فرانت همیشه فهرست نهایی را می‌فرستد.
            var existingAttachments = await _context.DocumentAttachments
                .Where(a => a.DocumentKind == DocumentKindEnum.PURCHASE && a.DocumentId == purchase.Id)
                .ToListAsync(cancellationToken);
            _context.DocumentAttachments.RemoveRange(existingAttachments);

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

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "خرید با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
