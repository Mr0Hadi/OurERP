using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using AutoMapper;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.User.Command
{
    public class CreateUserCommand : IRequest<ResponseDto>
    {
        public string FisrtName { get; set; }
        public string LastName { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
        public string PersonelCode { get; set; }
        public int DepartmentId { get; set; }
        public int? TeamId { get; set; }
    }

    public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
    {
        public CreateUserCommandValidator()
        {

            RuleFor(x => x.FisrtName)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام"))
                .Must(Validation.IsPersianText).WithMessage("نام فقط باید حروف فارسی باشد");

            RuleFor(x => x.LastName)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام خانوادگی"))
                .Must(Validation.IsPersianText).WithMessage("نام خانوادگی فقط باید حروف فارسی باشد");

            RuleFor(x => x.Username)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام کاربری"))
                .Must(Validation.IsEnglishText).WithMessage("نام کاربری وارد شده معتبر نیست");

            RuleFor(x => x.Password)
                 .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("رمز عبور"))
                 .Must(Validation.IsValidPassword).WithMessage("رمز عبور باید حداقل 8 کاراکتر باشد و شامل حرف انگلیسی، عدد و یک کاراکتر خاص باشد");

            RuleFor(x => x.PersonelCode)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("کد پرسنلی"));

            RuleFor(x => x.DepartmentId)
                .GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه واحد"));

            RuleFor(x => x.TeamId)
                .GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه تیم"))
                .When(x => x.TeamId.HasValue);

        }
    }

    public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, ResponseDto>
    {
        private readonly IUserRepository _userRepository;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly ITeamRepository _teamRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        public CreateUserCommandHandler(IUserRepository userRepository, IDepartmentRepository departmentRepository, ITeamRepository teamRepository, IUnitOfWork unitOfWork, IMapper mapper)
        {
            _userRepository = userRepository;
            _departmentRepository = departmentRepository;
            _teamRepository = teamRepository;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<ResponseDto> Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var user = await _userRepository.GetByUsernameAsync(request.Username, cancellationToken);

            if (user != null)
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

            var newUser = _mapper.Map<Domain.Entities.User>(request);

            await _userRepository.AddAsync(newUser, cancellationToken);

            await _unitOfWork.SaveChangesAsync();

            res.Message = "کاربر جدید با موفقیت ثبت شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }

}
