namespace Application.Common.Dtos
{
    public class TokenDto
    {

        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }

        /// <summary>
        /// True after a manager has reset the password: the client must send the user to the
        /// change-password screen. Until then the server refuses every other request with 403.
        /// </summary>
        public bool MustChangePassword { get; set; }

    }
}
