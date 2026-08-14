using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.Account.Command
{
	public class ForgetPasswordCommand : IRequest<ResponseDto>
	{
		public string Password { get; set; }
		public string RePassword { get; set; }
		public string Username { get; set; }
		//public string Otp { get; set; }
	}

	public class ForgetPasswordCommandValidator : AbstractValidator<ForgetPasswordCommand>
	{
		public ForgetPasswordCommandValidator()
		{
			RuleFor(x => x.Username)
				 .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام کاربری"))
				 .Must(Validation.IsEnglishText).WithMessage("نام کاربری وارد شده معتبر نیست");

			RuleFor(x => x.Password)
				 .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("رمز عبور"))
				 .Must(Validation.IsValidPassword).WithMessage("رمز عبور باید حداقل 8 کاراکتر باشد و شامل حرف انگلیسی، عدد و یک کاراکتر خاص باشد");

			RuleFor(x => x.RePassword)
				.Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("تکرار رمز عبور"))
				.Equal(x => x.Password).WithMessage("رمز عبور و تکرار آن باید یکسان باشند.");

			//RuleFor(x => x.Otp)
			//	.Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("کد تایید"));
		}
	}

	public class ForgetPasswordCommandHandler : IRequestHandler<ForgetPasswordCommand, ResponseDto>
	{
		private readonly IUserRepository _userRepository;
		private readonly IUnitOfWork _unitOfWork;

		public ForgetPasswordCommandHandler(IUserRepository userRepository, IUnitOfWork unitOfWork)
		{
			_userRepository = userRepository;
			_unitOfWork = unitOfWork;
		}

		public async Task<ResponseDto> Handle(ForgetPasswordCommand request, CancellationToken cancellationToken)
		{
			var res = new ResponseDto();

			var user = await _userRepository.GetByUsernameAsync(request.Username);

			if (user == null)
			{
				throw new NotFoundCustomException("کاربر با این شماره موبایل یافت نشد.");
			}

			//if (user.ExpireOtp != null && user.ExpireOtp < DateTime.Now)
			//{
			//	throw new ValidationCustomException("کد تایید منقضی شده است. لطفا مجددا درخواست ارسال کد تایید را ارسال کنید.");
			//}

			//if (user.OtpCode != request.Otp)
			//{
			//	throw new ValidationCustomException("کد تایید وارد شده معتبر نیست.");
			//}

			user.PasswordHash = request.Password.ToHashSHA256();

			_userRepository.Update(user);
			await _unitOfWork.SaveChangesAsync();

			res.Message = "رمز عبور با موفقیت تغییر کرد.";
			res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
			return res;
		}
	}
}
