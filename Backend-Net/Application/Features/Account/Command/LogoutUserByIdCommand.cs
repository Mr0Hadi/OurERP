using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Application.Common.Contracts.Permissions;
using Application.Common.Contracts.Token;
using Application.Common.Contracts.UserContextService;

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
		private readonly IUserSessionService _userSessionService;
		private readonly IPermissionService _permissionService;
		private readonly IUserContextService _userContextService;
		private readonly IUserRepository _userRepository;
		private readonly IUnitOfWork _unitOfWork;
		public LogoutUserByIdCommandHandler(IUserSessionService userSessionService, IPermissionService permissionService,
			IUserContextService userContextService, IUserRepository userRepository, IUnitOfWork unitOfWork)
		{
			_userSessionService = userSessionService;
			_permissionService = permissionService;
			_userContextService = userContextService;
			_userRepository = userRepository;
			_unitOfWork = unitOfWork;
		}
		public async Task<ResponseDto> Handle(LogoutUserByIdCommand request, CancellationToken cancellationToken)
		{
			var res = new ResponseDto();

			var user = await _userRepository.GetByIdAsync(request.UserId, cancellationToken);
			if (user == null) throw new NotFoundCustomException("کاربر با این شناسه یافت نشد.");

			await _permissionService.EnsureCanManageUserAsync(_userContextService.GetUserId().ToInt(), user.Id, cancellationToken);

			_userSessionService.RevokeAll(user);

			_userRepository.Update(user);
			await _unitOfWork.SaveChangesAsync(cancellationToken);

			res.Message = "کاربر با موفقیت خارج شد.";
			res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
			return res;
		}
	}
}
