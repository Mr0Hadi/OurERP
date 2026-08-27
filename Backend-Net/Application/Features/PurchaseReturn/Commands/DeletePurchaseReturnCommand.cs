using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
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
        private readonly IPurchaseReturnQueryService _purchaseReturnQueryService;
        private readonly IPurchaseReturnRepository _purchaseReturnRepository;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public DeletePurchaseReturnCommandHandler(IWMSDbContext context, IPurchaseReturnQueryService purchaseReturnQueryService, IPurchaseReturnRepository purchaseReturnRepository, IPurchaseReturnCalculationService purchaseReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnQueryService = purchaseReturnQueryService;
            _purchaseReturnRepository = purchaseReturnRepository;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeletePurchaseReturnCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _purchaseReturnQueryService
                .WithReturnGraph(_context.PurchaseReturns.Where(x => x.Id == request.Id))
                .Include(x => x.Purchase)
                    .ThenInclude(x => x.Items)
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (_purchaseReturnCalculationService.IsTerminal(purchaseReturn.Status) || !_purchaseReturnCalculationService.IsUntouched(purchaseReturn))
                throw new ValidationCustomException("فقط مرجوعی‌های دست‌نخورده قابل حذف هستند.");

            var purchase = purchaseReturn.Purchase!;

            _purchaseReturnRepository.Remove(purchaseReturn);

            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase);
            purchase.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "مرجوعی با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
