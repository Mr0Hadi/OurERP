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
    public class UpdateUserCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Username { get; set; }
        public int RoleId { get; set; }
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

        }
    }

    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, ResponseDto>
    {
        private readonly IUserRepository _userRepository;
        private readonly IRoleRepository _roleService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        public UpdateUserCommandHandler(IUserRepository userRepository, IRoleRepository roleService, IUnitOfWork unitOfWork, IMapper mapper)
        {
            _userRepository = userRepository;
            _roleService = roleService;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
        }

        public async Task<ResponseDto> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var user = await _userRepository.GetByIdAsync(request.Id, cancellationToken);

            if (user == null)
            {
                throw new ValidationCustomException("کاربر با این اطلاعات یافت نشد");
            }

            var role = await _roleService.GetByIdAsync(request.RoleId, cancellationToken);

            if (role == null)
            {
                throw new NotFoundCustomException("نقش انتخاب شده یافت نشد");
            }

            var userByUsername = await _userRepository.GetByUsernameAsync(request.Username, cancellationToken);

            if (userByUsername != null && userByUsername.Id != user.Id)
            {
                throw new ValidationCustomException("کاربر با این شماره موبایل قبلا ثبت شده است");
            }

            user.Username = request.Username;
            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.IsActive = request.IsActive;
            user.RoleId = request.RoleId;

            _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync();

            res.Message = "اطلاعات کاربر با موفقیت بروزرسانی شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Warning.ToString();
            return res;
        }
    }

}
