using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Purchase.Queries;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Commands
{
    /// <summary>
    /// The manual status changes a purchase allows, before or after its invoice is issued:
    /// PROFORMA -> PENDING/SHIPPED (the supplier's invoice number and date must already be on it), PENDING <-> SHIPPED,
    /// and CANCELLED from PROFORMA/PENDING/SHIPPED while nothing has been received. PARTIALLY_RECEIVED/RECEIVED are
    /// computed by receiving and never chosen; CANCELLED is final; nothing returns to PROFORMA.
    /// Payments stay on a cancelled purchase; money the supplier gives back is recorded with AddPurchasePayment (IN).
    /// </summary>
    public class ChangePurchaseStatusCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public PurchaseStatusEnum Status { get; set; }
    }

    public class ChangePurchaseStatusCommandValidator : AbstractValidator<ChangePurchaseStatusCommand>
    {
        public ChangePurchaseStatusCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("خرید نامعتبر است.");
            RuleFor(x => x.Status)
                .Must(s => s is PurchaseStatusEnum.PENDING or PurchaseStatusEnum.SHIPPED or PurchaseStatusEnum.CANCELLED)
                .WithMessage("وضعیت خرید را فقط می‌توان به در انتظار، ارسال‌شده یا لغوشده تغییر داد.");
        }
    }

    public class ChangePurchaseStatusCommandHandler : IRequestHandler<ChangePurchaseStatusCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public ChangePurchaseStatusCommandHandler(IWMSDbContext context, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ChangePurchaseStatusCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.Status == PurchaseStatusEnum.CANCELLED)
                throw new ValidationCustomException("خرید لغوشده قابل تغییر وضعیت نیست.");

            if (purchase.Status is PurchaseStatusEnum.PARTIALLY_RECEIVED or PurchaseStatusEnum.RECEIVED)
                throw new ValidationCustomException("وضعیت خریدی که کالایش دریافت شده از روی دریافت‌ها حساب می‌شود و دستی تغییر نمی‌کند.");

            if (request.Status == PurchaseStatusEnum.CANCELLED)
            {
                if (purchase.Items.Any(i => i.ReceivedQuantity > 0))
                    throw new ValidationCustomException("کالای این خرید دریافت شده و قابل لغو نیست؛ از مسیر مرجوعی یا بستن ردیف اقدام کنید.");
            }
            else if (purchase.Status == PurchaseStatusEnum.PROFORMA
                     && (string.IsNullOrWhiteSpace(purchase.InvoiceNumber) || !purchase.InvoiceDate.HasValue))
            {
                throw new ValidationCustomException("برای خروج از پیش‌فاکتور، ابتدا شماره و تاریخ فاکتور تامین‌کننده را در پیش‌فاکتور ثبت کنید.");
            }

            // The supplier's invoice enters the account when the purchase leaves PROFORMA, and leaves it on cancellation
            // (a draft cancelled before that never reached the account). Payments stay; a supplier refund is a payment row.
            if (request.Status == PurchaseStatusEnum.CANCELLED)
                await PartyLedger.PurchaseCancelledAsync(_context, purchase, DateTime.Now, cancellationToken);
            else if (purchase.Status == PurchaseStatusEnum.PROFORMA)
                await PartyLedger.PurchaseInvoiceRecordedAsync(_context, purchase, purchase.InvoiceDate ?? DateTime.Now, cancellationToken);

            purchase.Status = request.Status;
            purchase.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseDetailReader.ReadAsync(_context, _objectStorageService, purchase.Id, cancellationToken);
            res.Message = "وضعیت خرید با موفقیت تغییر کرد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
