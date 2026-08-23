using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;

namespace Application.Features.Supplier.Commands
{
    public class DeleteSupplierCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteSupplierCommandHandler : IRequestHandler<DeleteSupplierCommand, ResponseDto>
    {
        private readonly ISupplierRepository _supplierRepository;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteSupplierCommandHandler(ISupplierRepository supplierRepository, IUnitOfWork unitOfWork)
        {
            _supplierRepository = supplierRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteSupplierCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var supplier = await _supplierRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("تامین کننده با اطلاعات مورد نظر یافت نشد.");

            supplier.IsActive = false;

            _supplierRepository.Update(supplier);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "تامین کننده با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
