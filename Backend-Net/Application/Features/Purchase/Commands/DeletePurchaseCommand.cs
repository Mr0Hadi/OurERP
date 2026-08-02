using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;

namespace Application.Features.Purchase.Commands
{
    public class DeletePurchaseCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeletePurchaseCommandHandler : IRequestHandler<DeletePurchaseCommand, ResponseDto>
    {
        private readonly IPurchaseRepository _purchaseRepository;
        private readonly IUnitOfWork _unitOfWork;

        public DeletePurchaseCommandHandler(IPurchaseRepository purchaseRepository, IUnitOfWork unitOfWork)
        {
            _purchaseRepository = purchaseRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeletePurchaseCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchase = await _purchaseRepository.GetByIdAsync(request.Id) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            purchase.IsActive = false;

            _purchaseRepository.Update(purchase);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "خرید با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
