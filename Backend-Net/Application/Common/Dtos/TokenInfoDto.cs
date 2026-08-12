namespace Application.Common.Dtos
{
    public class TokenInfoDto
    {
        public string Id { get; set; }
        public bool IsExpired { get; set; }
        public string Username { get; set; }
    }
}
