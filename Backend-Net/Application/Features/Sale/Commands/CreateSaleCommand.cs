using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Sales;
using Application.Features.Sale.Dtos;
using AutoMapper;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Net.Mail;

namespace Application.Features.Sale.Commands
{
    public class CreateSaleCommand : IRequest<ResponseDto>
    {
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public List<PaymentDetailDto> PaymentDetails { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public List<CreateSaleItemDto> ProductIds { get; set; }
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
    }

    public class CreateSaleCommandValidator : AbstractValidator<CreateSaleCommand>
    {
        public CreateSaleCommandValidator()
        {
            // تاریخ فاکتور فقط در پیش‌فاکتور می‌تواند null بماند؛ در بقیه‌ی وضعیت‌ها الزامی است.
            RuleFor(x => x.InvoiceDate).Must(d => d.HasValue && d.Value != default)
                .When(x => x.Status != SalesStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            // مهلت پرداخت اختیاری است (خرید/فروش نقدی مهلتی ندارد)، ولی اگر پر شد نباید قبل از تاریخ فاکتور باشد.
            RuleFor(x => x.PaymentDate).GreaterThanOrEqualTo(x => x.InvoiceDate)
                .When(x => x.PaymentDate.HasValue && x.InvoiceDate.HasValue)
                .WithMessage("مهلت پرداخت نمی‌تواند قبل از تاریخ فاکتور باشد.");
            RuleFor(x => x.CustomerId).NotEmpty().WithMessage(Validation.RequiredMessage("مشتری"));
            RuleFor(x => x.TotalAmount).Must(p => p > 0).WithMessage("مبلغ کل باید از صفر بیشتر باشد.");
            RuleFor(x => x.PaidAmount).Must(p => p >= 0).WithMessage("مبلغ پرداختی باید بیشتر یا مساوی صفر باشد.");
            RuleFor(x => x.ProductIds).NotEmpty().WithMessage(Validation.RequiredMessage("محصولات"));
            RuleForEach(x => x.ProductIds).ChildRules(item =>
            {
                item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage(Validation.RequiredMessage("محصول"));
                item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("تعداد هر محصول باید از صفر بیشتر باشد.");
                item.RuleFor(i => i.Discount).GreaterThanOrEqualTo(0).WithMessage("تخفیف باید بیشتر یا مساوی صفر باشد.");
            });
            // اقساطی استثناست: رکورد پرداختش را خود CreateSaleInstallmentPlan/PaySaleInstallment با
            // Purpose درست می‌سازد، پس اینجا چیزی برای فرستادن نیست.
            RuleFor(x => x.PaymentDetails).NotEmpty()
                .When(x => x.PaymentType != PaymentTypeEnum.CASH && x.PaymentType != PaymentTypeEnum.INSTALLMENT)
                .WithMessage("اطلاعات پرداخت باید به طول کامل پر شود.");
            RuleForEach(x => x.Attachments).ChildRules(a =>
            {
                a.RuleFor(i => i.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("کلید فایل ضمیمه"));
            });
        }
    }

    public class CreateSaleCommandHandler : IRequestHandler<CreateSaleCommand, ResponseDto>
    {
        private readonly IMapper _mapper;
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IUserContextService _userContextService;

        public CreateSaleCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork, IMapper mapper, IUserContextService userContextService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _userContextService = userContextService;
        }

        public async Task<ResponseDto> Handle(CreateSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = _mapper.Map<Domain.Entities.Sale>(request);

            sale.InvoiceNumber ??= string.Empty;
            sale.SalesUserId = _userContextService.GetUserId().ToInt();

            // فروش اقساطی در این مرحله هنوز پلن ندارد (پلن بعد از ساخت فروش ثبت می‌شود)، پس
            // عمداً در پیش‌فاکتور می‌ماند؛ نهایی‌سازی‌اش در CreateSaleInstallmentPlanCommand
            // اتفاق می‌افتد. فروش غیر اقساطی رفتار قبلی را عیناً نگه می‌دارد: مشتری همان لحظه‌ی
            // ثبت هم می‌تواند کامل پرداخت کرده باشد، آن‌وقت دیگر پیش‌فاکتور نمی‌ماند.
            if (sale.PaymentType != PaymentTypeEnum.INSTALLMENT
                && sale.Status == SalesStatusEnum.PROFORMA
                && sale.PaidAmount >= sale.TotalAmount)
            {
                await SaleInvoiceFinalizer.FinalizeAsync(_context, sale, cancellationToken);
            }

            await _context.Sales.AddAsync(sale, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            var attachmentsList = request.Attachments.Select(x => new Domain.Entities.DocumentAttachment
            {
                DocumentKind = DocumentKindEnum.SALE,
                DocumentId = sale.Id,
                ObjectKey = _objectStorageService.NormalizeKey(x.ObjectKey) ?? x.ObjectKey,
                FileName = x.FileName,
                Note = x.Note,
                CreatedAt = DateTime.Now,
            });
           
            await _context.DocumentAttachments.AddRangeAsync(attachmentsList, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new CreatedSaleDto { Id = sale.Id, InvoiceNumber = sale.InvoiceNumber, Status = sale.Status };
            res.Message = "فروش با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
