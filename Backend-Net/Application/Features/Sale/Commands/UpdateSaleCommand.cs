using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Contracts.Repositories;
using Application.Common.Enums;
using Application.Common.Sales;
using Application.Features.Sale.Dtos;
using AutoMapper;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Commands
{
    public class UpdateSaleCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }
        public SalesStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public List<PaymentDetailDto> PaymentDetails { get; set; }
        public UInt64 TotalAmount { get; set; }
        public UInt64 PaidAmount { get; set; }
        public string? Description { get; set; }
        public int CustomerId { get; set; }
        public List<UpdateSaleItemDto> Items { get; set; }
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
    }

    public class UpdateSaleCommandValidator : AbstractValidator<UpdateSaleCommand>
    {
        public UpdateSaleCommandValidator()
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
            RuleFor(x => x.Items).NotEmpty().WithMessage(Validation.RequiredMessage("محصولات"));
            RuleForEach(x => x.Items).ChildRules(item =>
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

    public class UpdateSaleCommandHandler : IRequestHandler<UpdateSaleCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly ISaleInstallmentPlanRepository _installmentPlanRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;

        public UpdateSaleCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, ISaleInstallmentPlanRepository installmentPlanRepository, IUnitOfWork unitOfWork, IMapper mapper)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _installmentPlanRepository = installmentPlanRepository;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<ResponseDto> Handle(UpdateSaleCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.Include(x => x.Items).Where(x => x.Id == request.Id).FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            var hasUnknownItems = request.Items.Where(x => x.Id != 0).Select(x => x.Id).Except(sale.Items.Select(x => x.Id)).Any();
            if (hasUnknownItems)
                throw new NotFoundCustomException("ردیف کالای مورد نظر در این فروش یافت نشد.");

            // قرارداد اقساطی فعالِ این فروش - هم شرط خروج از پیش‌فاکتور به آن وابسته است و هم
            // مبلغ پرداخت‌شده، که در فروش اقساطی همیشه از پلن می‌آید نه از ورودی کاربر.
            var installmentPlan = request.PaymentType == PaymentTypeEnum.INSTALLMENT
                ? await _installmentPlanRepository.GetActiveBySaleIdAsync(sale.Id, cancellationToken)
                : null;

            // مبلغ کل یک فروش اقساطی فقط از مسیر UpdateSaleInstallmentPlan عوض می‌شود، وگرنه
            // پلن و فروش از هم جدا می‌افتند.
            if (installmentPlan != null && request.TotalAmount != installmentPlan.TotalAmount)
                throw new ValidationCustomException("مبلغ کل فروش اقساطی باید از مسیر ویرایش قرارداد اقساطی تغییر کند.");

            // خروج از «پیش‌فاکتور» دو شاخه دارد.
            var wasProforma = sale.Status == SalesStatusEnum.PROFORMA;
            var canLeaveProforma = false;
            if (wasProforma)
            {
                if (request.PaymentType == PaymentTypeEnum.INSTALLMENT)
                {
                    // فروش اقساطی: شرط، «پرداخت کامل» نیست - وجود یک قرارداد اقساطی فعال با
                    // پیش‌پرداخت ثبت‌شده است. (معمولاً خودِ CreateSaleInstallmentPlanCommand
                    // فروش را نهایی می‌کند؛ این مسیر برای وقتی است که ویرایش فروش بعد از ثبت
                    // پلن انجام شود.)
                    canLeaveProforma = installmentPlan != null && installmentPlan.DownPaymentAmount > 0;

                    if (!canLeaveProforma && request.Status != SalesStatusEnum.PROFORMA)
                        throw new ValidationCustomException("تا قرارداد اقساطی و پیش‌پرداخت ثبت نشود، فروش از حالت پیش‌فاکتور خارج نمی‌شود.");
                }
                else
                {
                    canLeaveProforma = request.PaidAmount >= request.TotalAmount;

                    if (!canLeaveProforma && request.Status != SalesStatusEnum.PROFORMA)
                        throw new ValidationCustomException("تا پرداخت کامل نشود، فروش از حالت پیش‌فاکتور خارج نمی‌شود.");
                }

            }

            sale.InvoiceDate = request.InvoiceDate;
            sale.PaymentDate = request.PaymentDate;
            sale.Status = request.Status;
            sale.PaymentType = request.PaymentType;
            sale.TotalAmount = request.TotalAmount;
            // در فروش اقساطی، مبلغ پرداخت‌شده همیشه از پلن می‌آید (بخش ۴ راهنمای اقساط).
            sale.PaidAmount = installmentPlan?.PaidAmount ?? request.PaidAmount;
            sale.Description = request.Description;
            sale.CustomerId = request.CustomerId;
            sale.UpdatedAt = DateTime.Now;

            // شماره‌ی فاکتور رسمی را سرور تولید می‌کند (روی خودِ موجودیت، نه از ورودی کاربر) و
            // وضعیت را از پیش‌فاکتور بیرون می‌برد - همان مسیری که CreateSale هم می‌رود.
            if (canLeaveProforma)
                await SaleInvoiceFinalizer.FinalizeAsync(_context, sale, cancellationToken);

            foreach (var existing in sale.Items.ToList())
            {
                var incoming = request.Items.FirstOrDefault(x => x.Id == existing.Id);
                if (incoming == null)
                {
                    sale.Items.Remove(existing);
                    continue;
                }

                existing.ProductId = incoming.ProductId;
                existing.Quantity = incoming.Quantity;
                existing.UnitPrice = incoming.UnitPrice;
                existing.Discount = incoming.Discount;
            }

            foreach (var incoming in request.Items.Where(x => x.Id == 0))
                sale.Items.Add(_mapper.Map<Domain.Entities.SaleItem>(incoming));

            // رکوردهای پرداخت: CreateSale آن‌ها را از راه نگاشت AutoMapper روی گراف فروش ذخیره
            // می‌کند، ولی این handler فیلدها را تک‌تک می‌نشاند و تا امروز اصلاً به آن‌ها دست
            // نمی‌زد - یعنی ویرایش فروش، پرداخت‌های تازه را بی‌صدا دور می‌ریخت.
            //
            // فروش اقساطی استثناست و کاملاً نادیده گرفته می‌شود: رکوردهای پرداختش (پیش‌پرداخت و
            // اقساط، با Purpose خودشان) مالِ فیچر اقساط‌اند و فقط از مسیر همان دستورها عوض
            // می‌شوند - دقیقاً به همان دلیلی که PaidAmount هم از پلن خوانده می‌شود، نه از ورودی.
            if (installmentPlan == null && request.PaymentType != PaymentTypeEnum.INSTALLMENT)
            {
                // مثل ضمیمه‌ها جایگزینی کامل است، نه افزودنی - فرانت همیشه فهرست نهایی را می‌فرستد.
                var existingPayments = await _context.PaymentDetails
                    .Where(x => x.SaleId == sale.Id)
                    .ToListAsync(cancellationToken);
                _context.PaymentDetails.RemoveRange(existingPayments);

                foreach (var payment in request.PaymentDetails ?? new List<PaymentDetailDto>())
                {
                    var entity = _mapper.Map<Domain.Entities.PaymentDetail>(payment);
                    entity.SaleId = sale.Id;
                    // Purpose از ورودی خوانده نمی‌شود: از این مسیر فقط پرداخت عادی ثبت می‌شود.
                    entity.Purpose = PaymentPurposeEnum.NORMAL;
                    await _context.PaymentDetails.AddAsync(entity, cancellationToken);
                }
            }

            _context.Sales.Update(sale);

            // ضمیمه‌ها به‌طور کامل جایگزین می‌شوند، نه اضافه - فرانت همیشه فهرست نهایی را می‌فرستد.
            var existingAttachments = await _context.DocumentAttachments
                .Where(a => a.DocumentKind == DocumentKindEnum.SALE && a.DocumentId == sale.Id)
                .ToListAsync(cancellationToken);
            _context.DocumentAttachments.RemoveRange(existingAttachments);

            foreach (var attachment in request.Attachments)
            {
                await _context.DocumentAttachments.AddAsync(new Domain.Entities.DocumentAttachment
                {
                    DocumentKind = DocumentKindEnum.SALE,
                    DocumentId = sale.Id,
                    // Stored as the bare bucket key, so an image URL echoed back by the
                    // frontend is stripped down rather than persisted verbatim - same rule
                    // every other write path here follows.
                    ObjectKey = _objectStorageService.NormalizeKey(attachment.ObjectKey) ?? attachment.ObjectKey,
                    FileName = attachment.FileName,
                    Note = attachment.Note,
                    CreatedAt = DateTime.Now,
                }, cancellationToken);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "فروش با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
