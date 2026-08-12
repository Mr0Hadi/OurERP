using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Contracts.UserContextService;
using Application.Common.Dtos;
using Application.Common.Enums;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Caching.Memory;

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
        private readonly IMemoryCache _memoryCache;
        private readonly IUserContextService _userContextService;
        private readonly IUserRepository _userRepository;
        private readonly IUnitOfWork _unitOfWork;
        public LogoutUserCommandHandler(IMemoryCache memoryCache, IUserContextService userContextService, IUserRepository userRepository,
            IUnitOfWork unitOfWork)
        {
            _memoryCache = memoryCache;
            _userContextService = userContextService;
            _userRepository = userRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(LogoutUserCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var accessToken = _userContextService.GetAccessToken();

            var userId = Convert.ToInt32(_userContextService.GetUserId());

            var user = await _userRepository.GetByIdAsync(userId);

            var cacheKey = $"UserTokens:{userId}";

            if (_memoryCache.TryGetValue(cacheKey, out var userData))
            {
                var userTokens = userData as HashSet<string>;
                userTokens?.Remove(accessToken);

                if (userTokens != null && userTokens.Count > 0)
                    _memoryCache.Set(cacheKey, userTokens);
                else
                    _memoryCache.Remove(cacheKey);
            }

            user.RefreshToken = null;
            user.ExpireRefreshToken = null;

            _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync();

            res.Message = "کاربر با موفقیت از سامانه خارج شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }

}
