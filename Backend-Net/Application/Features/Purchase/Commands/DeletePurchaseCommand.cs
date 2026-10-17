using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Common.Audit;
using Domain.Enums;

namespace Application.Features.Purchase.Commands
{
    /// <summary>
    /// Soft-deletes a purchase that is still a PROFORMA. An issued invoice is cancelled (ChangePurchaseStatus), never
    /// deleted. A draft that carries a prepayment is refused until those payments are voided - money that moved must
    /// not disappear with the document.
    /// </summary>
    [AuditAction(AuditActionEnum.DeletePurchase)]
    public class DeletePurchaseCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeletePurchaseCommandHandler : IRequestHandler<DeletePurchaseCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public DeletePurchaseCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeletePurchaseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _context.Purchases
                .Include(x => x.PaymentDetails)
                .Include(x => x.PaymentAllocations)
                .FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.Status != Domain.Enums.PurchaseStatusEnum.PROFORMA)
                throw new ValidationCustomException("فقط پیش‌فاکتور حذف می‌شود؛ خرید صادرشده را لغو کنید.");

            // Allocated on-account money just goes back to being unallocated; money paid on the draft itself must be voided first.
            DocumentPayments.ReleaseAllocations(purchase.PaymentAllocations);
            if (DocumentPayments.NetPaid(purchase.PaymentDetails, purchase.PaymentAllocations, DocumentPayments.PurchaseDirection) > 0)
                throw new ValidationCustomException("این پیش‌فاکتور پرداخت ثبت‌شده دارد؛ ابتدا پرداخت‌ها را ابطال کنید.");

            purchase.PaidAmount = 0;
            purchase.IsActive = false;
            purchase.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { purchase.Id };
            res.Message = "خرید با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
