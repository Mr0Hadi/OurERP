using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Payments;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Commands
{
    /// <summary>
    /// Soft-deletes a purchase that is still a PROFORMA. An issued invoice is cancelled (ChangePurchaseStatus), never
    /// deleted. A draft that carries a prepayment is refused until those payments are voided - money that moved must
    /// not disappear with the document.
    /// </summary>
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
                .FirstOrDefaultAsync(x => x.Id == request.Id && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            if (purchase.Status != Domain.Enums.PurchaseStatusEnum.PROFORMA)
                throw new ValidationCustomException("فقط پیش‌فاکتور حذف می‌شود؛ خرید صادرشده را لغو کنید.");

            if (DocumentPayments.NetPaid(purchase.PaymentDetails, DocumentPayments.PurchaseDirection) > 0)
                throw new ValidationCustomException("این پیش‌فاکتور پرداخت ثبت‌شده دارد؛ ابتدا پرداخت‌ها را ابطال کنید.");

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
