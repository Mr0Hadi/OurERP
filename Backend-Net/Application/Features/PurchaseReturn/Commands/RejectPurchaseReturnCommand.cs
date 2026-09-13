using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.PurchaseReturn.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Commands
{
    public class RejectPurchaseReturnCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class RejectPurchaseReturnCommandValidator : AbstractValidator<RejectPurchaseReturnCommand>
    {
        public RejectPurchaseReturnCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
        }
    }

    public class RejectPurchaseReturnCommandHandler : IRequestHandler<RejectPurchaseReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public RejectPurchaseReturnCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService purchaseReturnCalculationService, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RejectPurchaseReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns.Where(x => x.Id == request.Id)
                .WhereNotDeleted()
                .WithReturnGraph()
                .WithPurchaseItems()
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            // One rule for every lifecycle command, and a reason that names what actually blocks it
            // (the status, moved goods, or recorded money) - see ReturnLifecycleRules.
            if (_purchaseReturnCalculationService.GetLifecycleBlocker(purchaseReturn, ReturnLifecycleActionEnum.REJECT) is { } blocker)
                throw new ValidationCustomException(blocker);

            var now = DateTime.Now;
            purchaseReturn.Status = ReturnStatusEnum.REJECTED;
            purchaseReturn.UpdatedAt = now;

            var purchase = purchaseReturn.Purchase!;
            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseReturnDetailReader.ReadAsync(_context, _purchaseReturnCalculationService, _objectStorageService, purchaseReturn.Id, cancellationToken);
            res.Message = "مرجوعی به‌عنوان رد‌شده ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
