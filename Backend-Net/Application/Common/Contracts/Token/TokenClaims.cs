namespace Application.Common.Contracts.Token
{
    /// <summary>Claim names this API writes into its own access tokens.</summary>
    public static class TokenClaims
    {
        /// <summary>
        /// Present (value "true") only on a token issued while the user still has to change a
        /// password a manager reset. Safe to trust from the token: resetting a password ends every
        /// session, and changing it issues a new token without the claim.
        /// </summary>
        public const string MustChangePassword = "MustChangePassword";
    }
}
