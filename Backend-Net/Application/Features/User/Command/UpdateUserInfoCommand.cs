using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.User.Command
{
    public class UpdateUserInfoCommand : IRequest<ResponseDto>
    {

        public string FirstName { get; set; }
        public string LastName { get; set; }

    }

    public class UpdateUserInfoCommandValidator : AbstractValidator<UpdateUserInfoCommand>
    {
        public UpdateUserInfoCommandValidator()
        {

            RuleFor(x => x.FirstName)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام"))
                .Must(Validation.IsPersianText).WithMessage("نام فقط باید حروف فارسی باشد");
            RuleFor(x => x.LastName)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام خانوادگی"))
                .Must(Validation.IsPersianText).WithMessage("نام خانوادگی فقط باید حروف فارسی باشد");

        }
    }

    public class UpdateUserInfoCommandHandler : IRequestHandler<UpdateUserInfoCommand, ResponseDto>
    {
        private readonly IUserRepository _userRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IUserContextService _userContextService;
        public UpdateUserInfoCommandHandler(IUserRepository userRepository, IUnitOfWork unitOfWork, IUserContextService userContextService)
        {
            _userRepository = userRepository;
            _unitOfWork = unitOfWork;
            _userContextService = userContextService;
        }

        public async Task<ResponseDto> Handle(UpdateUserInfoCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var userId = _userContextService.GetUserId().ToInt();

            var user = await _userRepository.GetByIdAsync(userId);

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;

            _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync();

            res.Message = "اطلاعات کاربر با موفقیت بروزرسانی شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Warning.ToString();
            return res;
        }
    }

}
