using Application.Common.Dtos;

namespace Application.Common.Contracts.Token
{
    /// <summary>
    /// One session per user: the access token issued last is the only one accepted. Logging in
    /// again (on another device or browser) replaces it, so the previous session is answered 401
    /// on its next request. Held in memory, like the permission cache - after a restart no token
    /// is current, and the client gets back in through RefreshToken.
    /// </summary>
    public interface IUserSessionService
    {
        /// <summary>
        /// Issues a new access/refresh token pair for the user, makes it their only session and
        /// stages the refresh token on the entity. The caller saves.
        /// </summary>
        Task<TokenDto> IssueAsync(Domain.Entities.User user);

        /// <summary>Whether this access token is the user's current session.</summary>
        bool IsCurrent(int userId, string accessToken);

        /// <summary>
        /// Ends every session of the user: the current access token stops working at once and the
        /// stored refresh token is cleared (staged on the entity - the caller saves). Used by logout,
        /// password change/reset and deactivation.
        /// </summary>
        void RevokeAll(Domain.Entities.User user);
    }
}
