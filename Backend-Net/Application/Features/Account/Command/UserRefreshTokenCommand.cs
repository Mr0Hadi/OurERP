using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Token;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.Account.Command
{
    public class UserRefreshTokenCommand : IRequest<ResponseDto>
    {
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
    }

    public class UserRefreshTokenCommandValidator : AbstractValidator<UserRefreshTokenCommand>
    {
        public UserRefreshTokenCommandValidator()
        {
            RuleFor(x => x.AccessToken)
               .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("توکن"));

            RuleFor(x => x.RefreshToken)
            .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("رفرش توکن"));
        }
    }

    public class UserRefreshTokenCommandHandler : IRequestHandler<UserRefreshTokenCommand, ResponseDto>
    {
        private readonly ITokenService _tokenService;
        private readonly IUserSessionService _userSessionService;
        private readonly IUserRepository _userRepository;
        private readonly IUnitOfWork _unitOfWork;

        public UserRefreshTokenCommandHandler(ITokenService tokenService, IUserSessionService userSessionService,
            IUserRepository userRepository, IUnitOfWork unitOfWork)
        {
            _tokenService = tokenService;
            _userSessionService = userSessionService;
            _userRepository = userRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UserRefreshTokenCommand request, CancellationToken cancellationToken)
        {

            var res = new ResponseDto();

            var tokenInfo = _tokenService.GetTokenInfo(request.AccessToken);

            if (tokenInfo == null)
            {
                throw new ValidationCustomException("توکن معتبر نیست");
            }

            // "Not expired" alone is not "still usable": CachingMiddleware only accepts the user's
            // current session token, and none is current after every restart. Refusing to refresh
            // such a token deadlocked the client - every request 401s and every refresh 400s. A token
            // the server no longer holds is refreshed like an expired one; the refresh-token check
            // below still stops a logged-out user, since every revocation clears it.
            if (tokenInfo.IsExpired == false && _userSessionService.IsCurrent(tokenInfo.Id.ToInt(), request.AccessToken))
            {
                throw new ValidationCustomException("توکن منقضی نشده است و معتبر است");
            }

            var user = await _userRepository.GetByIdAsync(tokenInfo.Id.ToInt(), cancellationToken);

            if (user == null)
            {
                throw new NotFoundCustomException("کاربر با این اطلاعات یافت نشد");
            }

            if (user.IsActive == false)
            {
                throw new ValidationCustomException("کاربر مورد نظر فعال نمیباشد");
            }

            if (user.RefreshToken == null || user.RefreshToken != request.RefreshToken)
            {
                throw new ValidationCustomException("رفرش توکن نامعتبر است");
            }

            if (user.ExpireRefreshToken < DateTime.Now)
            {
                throw new ValidationCustomException("رفرش توکن منقضی شده است");
            }

            var data = await _userSessionService.IssueAsync(user);

            _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = data;
            res.Message = "توکن جدید با موفقیت ارسال شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();

            return res;

        }
    }
}
