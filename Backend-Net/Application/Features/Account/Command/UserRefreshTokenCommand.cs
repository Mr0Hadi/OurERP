using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Token;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.User.Dto;
using AutoMapper;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

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
        private readonly IConfiguration _configuration;
        private readonly ITokenService _tokenService;
        private readonly IUserRepository _userRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly IMemoryCache _memoryCache;

        public UserRefreshTokenCommandHandler(IConfiguration configuration, ITokenService tokenService, IUserRepository userRepository,
            IUnitOfWork unitOfWork, IMapper mapper, IMemoryCache memoryCache)
        {
            _configuration = configuration;
            _tokenService = tokenService;
            _userRepository = userRepository;
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _memoryCache = memoryCache;
        }

        public async Task<ResponseDto> Handle(UserRefreshTokenCommand request, CancellationToken cancellationToken)
        {

            var res = new ResponseDto();

            var tokenInfo = _tokenService.GetTokenInfo(request.AccessToken);

            if (tokenInfo == null)
            {
                throw new ValidationCustomException("توکن معتبر نیست");
            }

            if (tokenInfo.IsExpired == false)
            {
                throw new ValidationCustomException("توکن منقضی نشده است و معتبر است");
            }

            var user = await _userRepository.GetByIdAsync(tokenInfo.Id.ToInt());

            if (user == null)
            {
                throw new NotFoundCustomException("کاربر با این اطلاعات یافت نشد");
            }

            if (user.IsActive == false)
            {
                throw new ValidationCustomException("کاربر مورد نظر فعال نمیباشد");
            }

            if (user.RefreshToken != request.RefreshToken)
            {
                throw new ValidationCustomException("رفرش توکن نامعتبر است");
            }

            if (user.ExpireRefreshToken < DateTime.Now)
            {
                throw new ValidationCustomException("رفرش توکن منقضی شده است");
            }

            var userInfo = _mapper.Map<TokenUserInfoDto>(user);

            var data = await _tokenService.SetToken(userInfo);

            var cacheKey = $"UserTokens:{userInfo.Id}";
            var userTokens = _memoryCache.GetOrCreate(cacheKey, entry => new HashSet<string>());

            userTokens.Remove(request.AccessToken);

            userTokens.Add(data.AccessToken);

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(Convert.ToInt32(_configuration["JwtSettings:RefreshTokenDurationInMinutes"])));

            _memoryCache.Set(cacheKey, userTokens, cacheOptions);

            user.RefreshToken = data.RefreshToken;
            user.ExpireRefreshToken = DateTime.Now.AddMinutes(Convert.ToInt32(_configuration["JwtSettings:RefreshTokenDurationInMinutes"]));

            _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync();

            res.Data = data;
            res.Message = "توکن جدید با موفقیت ارسال شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();

            return res;

        }
    }
}
