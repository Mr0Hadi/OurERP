using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using FluentValidation;
using MediatR;
using Application.Common.Contracts.Token;
using Common.Exceptions;

namespace Application.Features.Account.Command
{
    public class LogoutUserCommand : IRequest<ResponseDto>
    {
    }


    public class LogoutUserCommandValidator : AbstractValidator<LogoutUserCommand>
    {
        public LogoutUserCommandValidator()
        {

        }
    }

    public class LogoutUserCommandHandler : IRequestHandler<LogoutUserCommand, ResponseDto>
    {
        private readonly IUserSessionService _userSessionService;
        private readonly IUserContextService _userContextService;
        private readonly IUserRepository _userRepository;
        private readonly IUnitOfWork _unitOfWork;
        public LogoutUserCommandHandler(IUserSessionService userSessionService, IUserContextService userContextService, IUserRepository userRepository,
            IUnitOfWork unitOfWork)
        {
            _userSessionService = userSessionService;
            _userContextService = userContextService;
            _userRepository = userRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(LogoutUserCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var userId = Convert.ToInt32(_userContextService.GetUserId());

            var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
                ?? throw new NotFoundCustomException("کاربر با این اطلاعات یافت نشد");

            // Single session, so ending "this" session ends the user's only one.
            _userSessionService.RevokeAll(user);

            _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "کاربر با موفقیت از سامانه خارج شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }

}
