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
	/// <summary>
	/// یک مسئول (دارنده‌ی <c>UserUpdate</c>) رمز عبورِ کارمندی دیگر را که آن
	/// را فراموش کرده بازنشانی می‌کند. برخلاف <see cref="ChangePasswordCommand"/>
	/// روی کاربرِ *جاریِ* توکن کار نمی‌کند و رمز قبلی هم نمی‌خواهد.
	/// </summary>
	public class ResetUserPasswordCommand : IRequest<ResponseDto>
	{
		public int UserId { get; set; }
		public string Password { get; set; }
		public string RePassword { get; set; }
	}

	public class ResetUserPasswordCommandValidator : AbstractValidator<ResetUserPasswordCommand>
	{
		public ResetUserPasswordCommandValidator()
		{
			RuleFor(x => x.UserId)
				.GreaterThan(0).WithMessage(Validation.RequiredMessage("شناسه‌ی کاربر"));

			RuleFor(x => x.Password)
				 .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("رمز عبور جدید"))
				 .Must(Validation.IsValidPassword).WithMessage("رمز عبور جدید باید حداقل 8 کاراکتر باشد و شامل حرف انگلیسی، عدد و یک کاراکتر خاص باشد");

			RuleFor(x => x.RePassword)
				.Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("تکرار رمز عبور جدید"))
				.Equal(x => x.Password).WithMessage("رمز عبور جدید و تکرار آن باید یکسان باشند.");
		}
	}

	public class ResetUserPasswordCommandHandler : IRequestHandler<ResetUserPasswordCommand, ResponseDto>
	{
		private readonly IUserRepository _userRepository;
		private readonly IUnitOfWork _unitOfWork;

		public ResetUserPasswordCommandHandler(IUserRepository userRepository, IUnitOfWork unitOfWork)
		{
			_userRepository = userRepository;
			_unitOfWork = unitOfWork;
		}

		public async Task<ResponseDto> Handle(ResetUserPasswordCommand request, CancellationToken cancellationToken)
		{
			var res = new ResponseDto();

			var user = await _userRepository.GetByIdAsync(request.UserId, cancellationToken);

			if (user == null)
			{
				throw new NotFoundCustomException("کاربر با این شناسه پیدا نشد.");
			}

			user.PasswordHash = request.Password.ToHashSHA256();

			_userRepository.Update(user);

			await _unitOfWork.SaveChangesAsync();

			res.Message = "رمز‌عبور کارمند با موفقیت بازنشانی شد";
			res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();

			return res;
		}
	}
}
