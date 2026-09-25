using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Purchase.Dtos;
using Application.Features.Purchase.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Commands
{
    /// <summary>
    /// Edits a purchase that is still a PROFORMA - every field and the line items. Refused once the purchase has left
    /// PROFORMA (DocumentLockRules). Payments, status, attachments and the due date have their own commands, which stay
    /// open after the invoice is issued.
    /// </summary>
    public class UpdatePurchaseCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime? InvoiceDate { get; set; }
        public DateTime? PaymentDate { get; set; }

        /// <summary>PROFORMA, or PENDING/SHIPPED to leave it (needs the supplier's invoice number and date). One-way.</summary>
        public PurchaseStatusEnum Status { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public string? Description { get; set; }
        public int SupplierId { get; set; }

        /// <summary>The final list of lines, replacing the current one: Id set = that line updated, Id null = new line,
        /// a current line not in the list = deleted.</summary>
        public List<UpdatePurchaseItemDto> ProductItemList { get; set; } = new();
        public List<DocumentAttachmentInputDto> Attachments { get; set; } = new();
    }

    public class UpdatePurchaseCommandValidator : AbstractValidator<UpdatePurchaseCommand>
    {
        public UpdatePurchaseCommandValidator()
        {
            RuleFor(x => x.Status).Must(DocumentLockRules.IsManualPurchaseStatus)
                .WithMessage("وضعیت خرید فقط می‌تواند پیش‌فاکتور، در انتظار یا ارسال‌شده باشد.");
            // در مرحله‌ی پیش‌فاکتور، فاکتور رسمیِ تامین‌کننده هنوز نرسیده؛ شماره و تاریخش نباید الزامی باشد.
            RuleFor(x => x.InvoiceNumber).NotEmpty().When(x => x.Status != PurchaseStatusEnum.PROFORMA)
                .WithMessage("برای خروج از پیش‌فاکتور، شماره فاکتور تامین‌کننده را وارد کنید.");
            // تاریخ فاکتور فقط در پیش‌فاکتور می‌تواند null بماند؛ در بقیه‌ی وضعیت‌ها الزامی است.
            RuleFor(x => x.InvoiceDate).Must(d => d.HasValue && d.Value != default)
                .When(x => x.Status != PurchaseStatusEnum.PROFORMA)
                .WithMessage(Validation.RequiredMessage("تاریخ فاکتور"));
            // مهلت پرداخت اختیاری است (خرید/فروش نقدی مهلتی ندارد)، ولی اگر پر شد نباید قبل از تاریخ فاکتور باشد.
            RuleFor(x => x.PaymentDate).GreaterThanOrEqualTo(x => x.InvoiceDate)
                .When(x => x.PaymentDate.HasValue && x.InvoiceDate.HasValue)
                .WithMessage("مهلت پرداخت نمی‌تواند قبل از تاریخ فاکتور باشد.");
            RuleFor(x => x.SupplierId).GreaterThan(0).WithMessage(Validation.RequiredMessage("فروشنده"));
            RuleFor(x => x.ProductItemList).NotEmpty().WithMessage(Validation.RequiredMessage("لیست محصولات"));
            RuleForEach(x => x.ProductItemList).ChildRules(item =>
            {
                item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage(Validation.RequiredMessage("محصول"));
                item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("تعداد هر محصول باید از صفر بیشتر باشد.");
                item.RuleFor(i => i.Discount).InclusiveBetween(0, 100).WithMessage("تخفیف باید بین ۰ تا ۱۰۰ درصد باشد.");
            });
            RuleFor(x => x.ProductItemList)
                .Must(items => items == null || items.Where(i => i.Id.HasValue).Select(i => i.Id).Distinct().Count() == items.Count(i => i.Id.HasValue))
                .WithMessage("هر ردیف خرید فقط یک‌بار می‌تواند در فهرست بیاید.");
            RuleForEach(x => x.Attachments).ChildRules(a =>
            {
                a.RuleFor(i => i.ObjectKey).NotEmpty().WithMessage(Validation.RequiredMessage("کلید فایل ضمیمه"));
            });
        }
    }

    public class UpdatePurchaseCommandHandler : IRequestHandler<UpdatePurchaseCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public UpdatePurchaseCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdatePurchaseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            DocumentLockRules.EnsureDraft(purchase.Status);

            var lines = purchase.Items.ToDictionary(x => x.Id);
            if (request.ProductItemList.Any(i => i.Id.HasValue && !lines.ContainsKey(i.Id.Value)))
                throw new NotFoundCustomException("ردیف کالای مورد نظر در این خرید یافت نشد.");

            // ReceivePurchase refuses a proforma, so a draft has nothing received on it. Data from before that rule could:
            // such a line is referenced by units, cost rows and return claims and must not be rewritten.
            if (purchase.Items.Any(i => i.ReceivedQuantity > 0 || i.ShortClosedQuantity > 0))
                throw new ValidationCustomException("روی این پیش‌فاکتور کالا دریافت شده و اقلامش قابل ویرایش نیست.");

            var products = await DocumentProducts.LoadAsync(_context, request.ProductItemList.Select(i => i.ProductId), cancellationToken);

            purchase.InvoiceNumber = request.InvoiceNumber ?? string.Empty;
            purchase.InvoiceDate = request.InvoiceDate;
            purchase.PaymentDate = request.PaymentDate;
            purchase.Status = request.Status;
            purchase.PaymentType = request.PaymentType;
            purchase.Description = request.Description;
            purchase.SupplierId = request.SupplierId;
            purchase.UpdatedAt = DateTime.Now;

            var kept = request.ProductItemList.Where(i => i.Id.HasValue).Select(i => i.Id!.Value).ToHashSet();
            foreach (var removed in purchase.Items.Where(i => !kept.Contains(i.Id)).ToList())
                purchase.Items.Remove(removed);

            foreach (var incoming in request.ProductItemList)
            {
                var line = incoming.Id.HasValue ? lines[incoming.Id.Value] : new Domain.Entities.PurchaseItem();
                line.ProductId = incoming.ProductId;
                line.Quantity = incoming.Quantity;
                line.UnitPrice = incoming.UnitPrice;
                line.Discount = incoming.Discount;
                if (!incoming.Id.HasValue)
                    purchase.Items.Add(line);
            }

            // A draft is recalculated on every save, the tax re-read from the product; once issued the snapshot is fixed.
            foreach (var line in purchase.Items)
                InvoiceLineMath.Stamp(line, products[line.ProductId]);
            purchase.TotalAmount = InvoiceLineMath.DocumentTotal(purchase.Items);

            // Leaving PROFORMA here records the supplier's invoice, at its final total.
            if (purchase.Status != PurchaseStatusEnum.PROFORMA)
                await PartyLedger.PurchaseInvoiceRecordedAsync(_context, purchase, purchase.InvoiceDate ?? DateTime.Now, cancellationToken);

            await DocumentAttachmentWriter.ReplaceAsync(_context, _objectStorageService, DocumentKindEnum.PURCHASE, purchase.Id, request.Attachments, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseDetailReader.ReadAsync(_context, _objectStorageService, purchase.Id, cancellationToken);
            res.Message = "خرید با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
