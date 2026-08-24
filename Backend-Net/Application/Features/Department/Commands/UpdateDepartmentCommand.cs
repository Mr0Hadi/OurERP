using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.Department.Commands
{
    public class UpdateDepartmentCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int? HeadId { get; set; }
    }

    public class UpdateDepartmentCommandValidator : AbstractValidator<UpdateDepartmentCommand>
    {
        public UpdateDepartmentCommandValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage(Validation.RequiredMessage("نام دپارتمان"));
            RuleFor(x => x.HeadId).GreaterThan(0).When(x => x.HeadId.HasValue)
                .WithMessage(Validation.RequiredMessage("شناسه سرپرست"));
        }
    }

    public class UpdateDepartmentCommandHandler : IRequestHandler<UpdateDepartmentCommand, ResponseDto>
    {
        private readonly IDepartmentRepository _departmentRepository;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateDepartmentCommandHandler(IDepartmentRepository departmentRepository, IUnitOfWork unitOfWork)
        {
            _departmentRepository = departmentRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateDepartmentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var department = await _departmentRepository.GetByIdAsync(request.Id, cancellationToken) ?? throw new NotFoundCustomException("دپارتمان مورد نظر یافت نشد.");

            department.Name = request.Name;
            department.HeadId = request.HeadId;

            _departmentRepository.Update(department);
            await _unitOfWork.SaveChangesAsync();

            res.Message = "اطلاعات دپارتمان با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
