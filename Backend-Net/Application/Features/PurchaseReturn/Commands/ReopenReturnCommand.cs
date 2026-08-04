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
    public class ReopenReturnCommand : IRequest<ResponseDto>
    {
        public int ReturnId { get; set; }
    }

    public class ReopenReturnCommandValidator : AbstractValidator<ReopenReturnCommand>
    {
        public ReopenReturnCommandValidator()
        {
            RuleFor(x => x.ReturnId).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
        }
    }

    public class ReopenReturnCommandHandler : IRequestHandler<ReopenReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public ReopenReturnCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ReopenReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns
                .Include(x => x.Items)
                .ThenInclude(x => x.Decisions)
                .Include(x => x.Purchase)
                .ThenInclude(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.ReturnId) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (purchaseReturn.Status != Domain.Enums.PurchaseReturnStatusEnum.REJECTED)
                throw new ValidationCustomException("فقط مرجوعی‌های ردشده قابل بازگشایی هستند.");

            purchaseReturn.Status = PurchaseReturnStatusUpdater.RecomputeReturnStatus(purchaseReturn);
            purchaseReturn.UpdatedAt = DateTime.Now;

            purchaseReturn.Purchase.Status = PurchaseReturnStatusUpdater.RecomputePurchaseStatus(purchaseReturn.Purchase, purchaseReturn);
            purchaseReturn.Purchase.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            res.Message = "مرجوعی دوباره برای هماهنگی باز شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
