//using Application.Common.Contracts.Repositories;
//using Application.Common.Contracts.UnitOfWork;
//using Application.Common.Dtos;
//using Application.Common.Enums;
//using Common.Exceptions;
//using Common.Extensions;
//using FluentValidation;
//using MediatR;
//using Microsoft.Extensions.Configuration;

//namespace Application.Features.Account.Command
//{
//    public class SendOtpSmsCommand : IRequest<ResponseDto>
//    {
//        public string Mobile { get; set; }
//    }

//    public class SendOtpSmsCommandValidator : AbstractValidator<SendOtpSmsCommand>
//    {
//        public SendOtpSmsCommandValidator()
//        {
//            RuleFor(x => x.Mobile)
//                .Must(Validation.IsNotNullOrEmpty).WithMessage(Validation.RequiredMessage("شماره موبایل"))
//                .Must(Validation.IsMobileNumber).WithMessage("شماره موبایل وارد شده معتبر نیست");
//        }
//    }

//    public class SendOtpSmsCommandHandler : IRequestHandler<SendOtpSmsCommand, ResponseDto>
//    {
//        private readonly IUserRepository _userRepository;
//        private readonly IConfiguration _configuration;
//        private readonly ISmsService _smsService;
//        private readonly IUnitOfWork _unitOfWork;

//        public SendOtpSmsCommandHandler(IUserRepository userRepository, IConfiguration configuration, ISmsService smsService, IUnitOfWork unitOfWork)
//        {
//            _userRepository = userRepository;
//            _configuration = configuration;
//            _smsService = smsService;
//            _unitOfWork = unitOfWork;
//        }

//        public async Task<ResponseDto> Handle(SendOtpSmsCommand request, CancellationToken cancellationToken)
//        {
//            var res = new ResponseDto();

//            var user = await _userRepository.GetByMobileAsync(request.Mobile);

//            if (user == null)
//            {
//                throw new NotFoundCustomException("کاربری با این شماره موبایل یافت نشد.");
//            }

//            if (user.ExpireOtp != null && user.ExpireOtp > DateTime.Now)
//            {
//                throw new ValidationCustomException("کد فعال سازی قبلی هنوز منقضی نشده است. لطفا لحظات دیگر تلاش کنید.", new {RemainingTime = Convert.ToInt32((user.ExpireOtp.Value - DateTime.Now).TotalSeconds)});
//            }

//            //TODO: check how many times
//            if (user.SendOtpCount >= Convert.ToInt32(_configuration["OTPSettings:MaxAttempts"]))
//            {
//                throw new ValidationCustomException("تعداد درخواست ارسال پیامک بیش از حد مجاز میباشد");
//            }

//            var otpCode = Generator.GenerateRandomNumber(Convert.ToInt32(_configuration["OTPSettings:Length"]));

//            await _smsService.SendSms(_configuration["OTPSettings:SmsHubSenderApplicationId"].ToInt(), request.Mobile, otpCode, true);

//            user.OtpCode = otpCode;
//            user.SendOtpCount += 1;
//            user.ExpireOtp = DateTime.Now.AddSeconds(Convert.ToInt32(_configuration["OTPSettings:ExpireSecond"]));

//            _userRepository.Update(user);
//            await _unitOfWork.SaveChangesAsync(cancellationToken);

//            res.Data = new { RemainingTime = Convert.ToInt32((user.ExpireOtp.Value - DateTime.Now).TotalSeconds)};
//            res.Message = "کد فعال سازی با موفقیت ارسال شد.";
//            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
//            return res;
//        }
//    }
//}
