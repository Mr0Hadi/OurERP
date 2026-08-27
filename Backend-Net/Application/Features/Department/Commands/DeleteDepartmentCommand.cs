using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Department.Commands
{
    public class DeleteDepartmentCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteDepartmentCommandHandler : IRequestHandler<DeleteDepartmentCommand, ResponseDto>
    {
        private readonly IDepartmentRepository _departmentRepository;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteDepartmentCommandHandler(IDepartmentRepository departmentRepository, IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _departmentRepository = departmentRepository;
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteDepartmentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var department = await _departmentRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("دپارتمان مورد نظر یافت نشد.");

            var hasActiveTeams = await _context.Teams.AnyAsync(x => x.DepartmentId == request.Id && x.IsActive, cancellationToken);
            if (hasActiveTeams)
            {
                throw new ValidationCustomException("این واحد دارای تیم فعال است و قابل حذف نیست.");
            }

            var hasActiveUsers = await _context.Users.AnyAsync(x => x.DepartmentId == request.Id && x.IsActive, cancellationToken);
            if (hasActiveUsers)
            {
                throw new ValidationCustomException("این واحد دارای کارمند فعال است و قابل حذف نیست.");
            }

            department.IsActive = false;

            _departmentRepository.Update(department);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "دپارتمان با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
