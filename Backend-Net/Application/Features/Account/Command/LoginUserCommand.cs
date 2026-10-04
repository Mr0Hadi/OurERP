using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.Token;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Account.Command
{
    public class LoginUserCommand : IRequest<ResponseDto>
    {
        public string Username { get; set; }
        public string Password { get; set; }
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
        }
    }

    public class LoginUserCommandHandler : IRequestHandler<LoginUserCommand, ResponseDto>
    {
        public const int DefaultMaxFailedAttempts = 10;
        public const int DefaultLockoutMinutes = 5;

        // Below this many attempts left the user is warned. It tells an attacker the username
        // exists, but so does the lockout message itself, and for staff who simply forgot their
        // password the warning is what stops them locking themselves out.
        private const int WarnWhenAttemptsLeft = 3;

        private const string WrongCredentialsMessage = "نام کاربری یا رمز عبور اشتباه است.";

        private readonly IUserRepository _userRepository;
        private readonly IUserSessionService _userSessionService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IConfiguration _configuration;

        public LoginUserCommandHandler(IUserRepository userRepository, IUserSessionService userSessionService, IUnitOfWork unitOfWork, IConfiguration configuration)
        {
            _userRepository = userRepository;
            _userSessionService = userSessionService;
            _unitOfWork = unitOfWork;
            _configuration = configuration;
        }

        public async Task<ResponseDto> Handle(LoginUserCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var maxFailedAttempts = ReadSetting("LoginSecurity:MaxFailedAttempts", DefaultMaxFailedAttempts);
            var lockoutMinutes = ReadSetting("LoginSecurity:LockoutMinutes", DefaultLockoutMinutes);

            var user = await _userRepository.GetByUsernameAsync(request.Username, cancellationToken);

            if (user == null)
            {
                throw new NotFoundCustomException(WrongCredentialsMessage);
            }

            // Checked before the password: while locked, even the right password is refused, or
            // the lock would not slow down guessing at all.
            if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.Now)
            {
                throw LockedOut(user.LockoutEnd.Value, maxFailedAttempts);
            }

            if (user.PasswordHash != request.Password.ToHashSHA256())
            {
                user.FailedLoginCount++;

                if (user.FailedLoginCount >= maxFailedAttempts)
                {
                    user.FailedLoginCount = 0;
                    user.LockoutEnd = DateTime.Now.AddMinutes(lockoutMinutes);
                    _userRepository.Update(user);
                    await _unitOfWork.SaveChangesAsync(cancellationToken);

                    throw LockedOut(user.LockoutEnd.Value, maxFailedAttempts);
                }

                _userRepository.Update(user);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                var attemptsLeft = maxFailedAttempts - user.FailedLoginCount;
                if (attemptsLeft <= WarnWhenAttemptsLeft)
                {
                    throw new NotFoundCustomException(
                        $"{WrongCredentialsMessage} تنها {attemptsLeft} بار دیگر می‌توانید تلاش کنید؛ پس از آن حساب شما به مدت {lockoutMinutes} دقیقه قفل می‌شود.");
                }

                throw new NotFoundCustomException(WrongCredentialsMessage);
            }

            if (user.IsActive == false)
            {
                throw new ValidationCustomException("کاربر مورد نظر فعال نمی باشد");
            }

            user.FailedLoginCount = 0;
            user.LockoutEnd = null;

            // Replaces any session the user already had: a second login logs the first one out.
            var data = await _userSessionService.IssueAsync(user);

            _userRepository.Update(user);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = data;
            res.Message = user.MustChangePassword
                ? "رمز عبور شما توسط مدیر بازنشانی شده است؛ لطفاً پیش از ادامه، رمز عبور جدیدی برای خود انتخاب کنید."
                : "کاربر با موفقیت وارد سایت شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }

        private static TooManyRequestsCustomException LockedOut(DateTime lockoutEnd, int maxFailedAttempts)
        {
            var remaining = lockoutEnd - DateTime.Now;
            var minutes = Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes));

            return new TooManyRequestsCustomException(
                $"به دلیل {maxFailedAttempts} بار ورود ناموفق، حساب کاربری شما موقتاً قفل شده است. لطفاً {minutes} دقیقه دیگر دوباره تلاش کنید یا برای بازنشانی رمز عبور با مدیر خود تماس بگیرید.",
                new { RemainingSeconds = Math.Max(0, (int)Math.Ceiling(remaining.TotalSeconds)) });
        }

        private int ReadSetting(string key, int fallback)
        {
            return int.TryParse(_configuration[key], out var value) && value > 0 ? value : fallback;
        }
    }

}
