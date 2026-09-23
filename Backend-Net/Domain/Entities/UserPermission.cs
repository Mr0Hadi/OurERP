using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One permission granted to one user. The key is <c>(UserId, Permission)</c>, so the set of
    /// rows for a user IS their permission list - there is nothing derived, nothing inherited
    /// from their department or team, and no second place to look.
    ///
    /// No <c>IsActive</c>: this is an assignment row like the org-role slots, not an
    /// independently editable entity. Revoking is deleting the row. <c>GrantedAt</c>/
    /// <c>GrantedByUserId</c> are kept because "why does this person have this?" is the first
    /// question anyone asks of a permission system.
    /// </summary>
    public class UserPermission
    {
        public int UserId { get; set; }
        public User User { get; set; }

        public PermissionEnum Permission { get; set; }

        public DateTime GrantedAt { get; set; }

        /// <summary>
        /// Who granted it. Nullable because the first super-user row is inserted directly into the
        /// database by hand - there is nobody signed in to attribute it to.
        /// </summary>
        public int? GrantedByUserId { get; set; }
        public User? GrantedBy { get; set; }
    }
}
