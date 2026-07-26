using Application.Common.Contracts.Environment;
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
    public class LoginUserCommand : IRequest<ResponseDto>
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public string CaptchaKeyHash { get; set; }
        public string CaptchaCode { get; set; }
    }


    public class LoginUserCommandValidator : AbstractValidator<LoginUserCommand>
    {
        public LoginUserCommandValidator()
        {

            RuleFor(x => x.Username)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("نام کاربری"))
                .Must(Validation.IsEnglishText).WithMessage("نام کاربری باید فقط شامل کاراکتر های انگلیسی باشد.");

            RuleFor(x => x.Password)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("رمز عبور"));


            RuleFor(x => x.CaptchaCode)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("کد امنیتی"));

            RuleFor(x => x.CaptchaKeyHash)
                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("هش کد امنیتی"));
        }
    }

    public class LoginUserCommandHandler : IRequestHandler<LoginUserCommand, ResponseDto>
    {
        private readonly IUserRepository _userRepository;
        private readonly ITokenService _tokenService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _memoryCache;
        private readonly IMapper _mapper;
        private readonly IEnvironmentService _environmentService;
        public LoginUserCommandHandler(IUserRepository userRepository, ITokenService tokenService, IUnitOfWork unitOfWork, IConfiguration configuration, IMemoryCache memoryCache, IMapper mapper, IEnvironmentService environmentService)
        {
            _userRepository = userRepository;
            _tokenService = tokenService;
            _unitOfWork = unitOfWork;
            _configuration = configuration;
            _memoryCache = memoryCache;
            _mapper = mapper;
            _environmentService = environmentService;
        }

        public async Task<ResponseDto> Handle(LoginUserCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            if (_environmentService.IsDevelopment() == false)
            {
                if (request.CaptchaCode.ToLower().ToHashSHA256() != request.CaptchaKeyHash)
                {
                    throw new ValidationCustomException("کد امنیتی وارد شده صحیح نمی باشد");
                }
            }

            var user = await _userRepository.GetByUsernameAsync(request.Username);

            if (user == null)
            {
                throw new NotFoundCustomException("کاربر با این اطلاعات یافت نشد");
            }

            if (user.PasswordHash != request.Password.ToHashSHA256())
            {
                throw new NotFoundCustomException("کاربر با این اطلاعات یافت نشد");
            }

            if (user.IsActive == false)
            {
                throw new ValidationCustomException("کاربر مورد نظر فعال نمی باشد");
            }

            var userInfo = _mapper.Map<TokenUserInfoDto>(user);

            var data = await _tokenService.SetToken(userInfo);

            var cacheKey = $"UserTokens:{userInfo.Id}";
            var userTokens = _memoryCache.GetOrCreate(cacheKey, entry => new HashSet<string>());
            userTokens.Add(data.AccessToken);

            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(Convert.ToInt32(_configuration["JwtSettings:RefreshTokenDurationInMinutes"])));

            _memoryCache.Set(cacheKey, userTokens, cacheOptions);

            user.RefreshToken = data.RefreshToken;
            user.ExpireRefreshToken = DateTime.Now.AddMinutes(Convert.ToInt32(_configuration["JwtSettings:RefreshTokenDurationInMinutes"]));

            _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync();

            res.Data = data;
            res.Message = "کاربر با موفقیت وارد سایت شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }

}
