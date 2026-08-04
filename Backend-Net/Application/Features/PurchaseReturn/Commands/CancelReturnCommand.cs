using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Commands
{
    public class CancelReturnCommand : IRequest<ResponseDto>
    {
        public int ReturnId { get; set; }
    }

    public class CancelReturnCommandValidator : AbstractValidator<CancelReturnCommand>
    {
        public CancelReturnCommandValidator()
        {
            RuleFor(x => x.ReturnId).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
        }
    }

    public class CancelReturnCommandHandler : IRequestHandler<CancelReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public CancelReturnCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CancelReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns
                .Include(x => x.Items)
                .ThenInclude(x => x.Decisions)
                .Include(x => x.Purchase)
                .ThenInclude(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.ReturnId) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (purchaseReturn.Status != Domain.Enums.PurchaseReturnStatusEnum.PENDING)
                throw new ValidationCustomException("فقط مرجوعی‌های بدون تصمیم ثبت‌شده قابل لغو کردن هستند.");

            purchaseReturn.Status = Domain.Enums.PurchaseReturnStatusEnum.CANCELLED;
            purchaseReturn.UpdatedAt = DateTime.Now;

            purchaseReturn.Purchase.Status = PurchaseReturnStatusUpdater.RecomputePurchaseStatus(purchaseReturn.Purchase, purchaseReturn);
            purchaseReturn.Purchase.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            res.Message = "مرجوعی با موفقیت لغو شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
