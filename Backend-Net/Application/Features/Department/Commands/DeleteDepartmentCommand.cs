using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;

namespace Application.Features.Department.Commands
{
    public class DeleteDepartmentCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteDepartmentCommandHandler : IRequestHandler<DeleteDepartmentCommand, ResponseDto>
    {
        private readonly IDepartmentRepository _departmentRepository;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteDepartmentCommandHandler(IDepartmentRepository departmentRepository, IUnitOfWork unitOfWork)
        {
            _departmentRepository = departmentRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteDepartmentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var department = await _departmentRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("دپارتمان مورد نظر یافت نشد.");

            department.IsActive = false;

            _departmentRepository.Update(department);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "دپارتمان با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
