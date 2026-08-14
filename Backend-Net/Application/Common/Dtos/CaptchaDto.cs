namespace Application.Common.Dtos
{
    public class CaptchaDto
    {
        public string KeyHash { get; set; }
        public byte[] Image { get; set; }

    }
}
