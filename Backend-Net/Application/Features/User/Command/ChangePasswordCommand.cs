using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.User.Command
{
	public class ChangePasswordCommand : IRequest<ResponseDto>
	{
		public string OldPassword { get; set; }
		public string Password { get; set; }
		public string RePassword { get; set; }
	}

	public class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
	{
		public ChangePasswordCommandValidator()
		{
			RuleFor(x => x.OldPassword)
				 .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("رمز عبور قبلی"))
				 .Must(Validation.IsValidPassword).WithMessage("رمز عبور قبلی باید حداقل 8 کاراکتر باشد و شامل حرف انگلیسی، عدد و یک کاراکتر خاص باشد");

			RuleFor(x => x.Password)
				 .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("رمز عبور جدید"))
				 .Must(Validation.IsValidPassword).WithMessage("رمز عبور جدید باید حداقل 8 کاراکتر باشد و شامل حرف انگلیسی، عدد و یک کاراکتر خاص باشد");

			RuleFor(x => x.RePassword)
				.Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("تکرار رمز عبور جدید"))
				.Equal(x => x.Password).WithMessage("رمز عبور جدید و تکرار آن باید یکسان باشند.");
		}
	}

	public class ChangePasswordCommandHandler : IRequestHandler<ChangePasswordCommand, ResponseDto>
	{
		private readonly IUserRepository _userRepository;
		private readonly IUserContextService _userContextService;
		private readonly IUnitOfWork _unitOfWork;

		public ChangePasswordCommandHandler(IUserRepository userRepository, IUserContextService userContextService, IUnitOfWork unitOfWork)
		{
			_userRepository = userRepository;
			_userContextService = userContextService;
			_unitOfWork = unitOfWork;
		}

		public async Task<ResponseDto> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
		{
			var res = new ResponseDto();

			var userId = _userContextService.GetUserId().ToInt();

			var user = await _userRepository.GetByIdAsync(userId, cancellationToken);

			if (user == null)
			{
				throw new NotFoundCustomException("کاربر با این شناسه پیدا نشد.");
			}

			if (request.OldPassword.ToHashSHA256() != user.PasswordHash)
			{
				throw new ValidationCustomException("رمز عبور قبلی صحیح نمی باشد.");
			}

			user.PasswordHash = request.Password.ToHashSHA256();

			_userRepository.Update(user);

			await _unitOfWork.SaveChangesAsync();

			res.Message = "رمز‌عبور با موفقیت به‌روزرسانی شد";
			res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();

			return res;
		}
	}
}
