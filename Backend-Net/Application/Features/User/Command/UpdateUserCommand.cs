using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.User.Command
{
    public class UpdateUserCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Username { get; set; }
        public int DepartmentId { get; set; }
        public int? TeamId { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdateUserCommandValidator : AbstractValidator<UpdateUserCommand>
    {
        public UpdateUserCommandValidator()
        {

            RuleFor(x => x.FirstName)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام"))
                .Must(Validation.IsPersianText).WithMessage("نام فقط باید حروف فارسی باشد");

            RuleFor(x => x.LastName)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام خانوادگی"))
                .Must(Validation.IsPersianText).WithMessage("نام خانوادگی فقط باید حروف فارسی باشد");

            RuleFor(x => x.Username)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام کاربری"))
                .Must(Validation.IsEnglishText).WithMessage("نام کاربری وارد شده معتبر نیست");

            RuleFor(x => x.DepartmentId)
                .GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه واحد"));

            RuleFor(x => x.TeamId)
                .GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه تیم"))
                .When(x => x.TeamId.HasValue);

        }
    }

    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, ResponseDto>
    {
        private readonly IUserRepository _userRepository;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly ITeamRepository _teamRepository;
        private readonly IUnitOfWork _unitOfWork;
        public UpdateUserCommandHandler(IUserRepository userRepository, IDepartmentRepository departmentRepository, ITeamRepository teamRepository, IUnitOfWork unitOfWork)
        {
            _userRepository = userRepository;
            _departmentRepository = departmentRepository;
            _teamRepository = teamRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var user = await _userRepository.GetByIdAsync(request.Id, cancellationToken);

            if (user == null)
            {
                throw new ValidationCustomException("کاربر با این اطلاعات یافت نشد");
            }

            var userByUsername = await _userRepository.GetByUsernameAsync(request.Username, cancellationToken);

            if (userByUsername != null && userByUsername.Id != user.Id)
            {
                throw new ValidationCustomException("کاربر با این شماره موبایل قبلا ثبت شده است");
            }

            var department = await _departmentRepository.GetByIdAsync(request.DepartmentId, cancellationToken);

            if (department == null)
            {
                throw new NotFoundCustomException("واحد انتخاب شده یافت نشد");
            }

            if (request.TeamId.HasValue)
            {
                var team = await _teamRepository.GetByIdAsync(request.TeamId.Value, cancellationToken);

                if (team == null)
                {
                    throw new NotFoundCustomException("تیم انتخاب شده یافت نشد");
                }

                if (team.DepartmentId != request.DepartmentId)
                {
                    throw new ValidationCustomException("تیم انتخاب شده متعلق به این واحد نیست");
                }
            }

            user.Username = request.Username;
            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.IsActive = request.IsActive;
            user.DepartmentId = request.DepartmentId;
            user.TeamId = request.TeamId;
            user.UpdatedAt = DateTime.Now;

            _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync();

            res.Message = "اطلاعات کاربر با موفقیت بروزرسانی شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Warning.ToString();
            return res;
        }
    }

}
