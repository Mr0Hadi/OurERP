using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Caching.Memory;

namespace Application.Features.Account.Command
{
	public class LogoutUserByIdCommand : IRequest<ResponseDto>
	{
		public int UserId { get; set; }
	}

	public class LogoutUserByIdCommandValidator : AbstractValidator<LogoutUserByIdCommand>
	{
		public LogoutUserByIdCommandValidator()
		{
			RuleFor(x => x.UserId)
				.NotEmpty()
				.WithMessage(Validation.RequiredMessage("شناسه کاربر"));
		}
	}

	public class LogoutUserByIdCommandHandler : IRequestHandler<LogoutUserByIdCommand, ResponseDto>
	{
		private readonly IMemoryCache _memoryCache;
		private readonly IUserRepository _userRepository;
		private readonly IUnitOfWork _unitOfWork;
		public LogoutUserByIdCommandHandler(IMemoryCache memoryCache, IUserRepository userRepository, IUnitOfWork unitOfWork)
		{
			_memoryCache = memoryCache;
			_userRepository = userRepository;
			_unitOfWork = unitOfWork;
		}
		public async Task<ResponseDto> Handle(LogoutUserByIdCommand request, CancellationToken cancellationToken)
		{
			var res = new ResponseDto();

			var user = await _userRepository.GetByIdAsync(request.UserId);
			if (user == null) throw new NotFoundCustomException("کاربر با این شناسه یافت نشد.");

			var cacheKey = $"UserTokens:{request.UserId}";
			_memoryCache.Remove(cacheKey);

			user.RefreshToken = null;
			user.ExpireRefreshToken = null;

			_userRepository.Update(user);
			await _unitOfWork.SaveChangesAsync(cancellationToken);

			res.Message = "کاربر با موفقیت خارج شد.";
			res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
			return res;
		}
	}
}
