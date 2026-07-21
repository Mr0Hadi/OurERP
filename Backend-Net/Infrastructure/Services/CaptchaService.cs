using Application.Common.Contracts.Captcha;
using Application.Common.Dtos;
using Common.Extensions;
using SixLaborsCaptcha.Core;


namespace Infrastructure.Services
{
    public class CaptchaService : ICaptchaService
    {
        private readonly ISixLaborsCaptchaModule _sixLaborsCaptcha;

        public CaptchaService(ISixLaborsCaptchaModule sixLaborsCaptcha)
        {
            _sixLaborsCaptcha = sixLaborsCaptcha;
        }

        public CaptchaDto GenerateCaptcha()
        {

            string key = Generator.GetUniqueKey(4);

            var imageStream = _sixLaborsCaptcha.Generate(key);

            return new CaptchaDto
            {
                KeyHash = key.ToLower().ToHashSHA256(),
                Image = imageStream
            };

        }
    }
}
