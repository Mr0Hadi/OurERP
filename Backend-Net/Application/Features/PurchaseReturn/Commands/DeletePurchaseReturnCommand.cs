using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Commands
{
    public class DeletePurchaseReturnCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeletePurchaseReturnCommandValidator : AbstractValidator<DeletePurchaseReturnCommand>
    {
        public DeletePurchaseReturnCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
        }
    }

    public class DeletePurchaseReturnCommandHandler : IRequestHandler<DeletePurchaseReturnCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnRepository _purchaseReturnRepository;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public DeletePurchaseReturnCommandHandler(IWMSDbContext context, IPurchaseReturnRepository purchaseReturnRepository, IPurchaseReturnCalculationService purchaseReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnRepository = purchaseReturnRepository;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeletePurchaseReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns.Where(x => x.Id == request.Id)
                .WhereNotDeleted()
                .WithReturnGraph()
                .WithPurchaseItems()
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            // One rule for every lifecycle command, and a reason that names what actually blocks it
            // (the status, moved goods, or recorded money) - see ReturnLifecycleRules.
            if (_purchaseReturnCalculationService.GetLifecycleBlocker(purchaseReturn, ReturnLifecycleActionEnum.DELETE) is { } blocker)
                throw new ValidationCustomException(blocker);

            var now = DateTime.Now;
            var purchase = purchaseReturn.Purchase!;

            // Soft delete: the row and its whole claim graph stay, every read filters IsActive out.
            purchaseReturn.IsActive = false;
            purchaseReturn.UpdatedAt = now;
            _purchaseReturnRepository.Update(purchaseReturn);

            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // A deleted return has no document left to return; the client needs only these two to
            // evict it from its cache and refresh the purchase it belonged to.
            res.Data = new { Id = purchaseReturn.Id, PurchaseId = purchaseReturn.PurchaseId };
            res.Message = "مرجوعی با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
