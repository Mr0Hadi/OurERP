using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Username { get; set; }
        public string PasswordHash { get; set; }
        public int PersonelCode { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int DepartmentId { get; set; }
        public Department Department { get; set; }
        public int? TeamId { get; set; }
        public Team? Team { get; set; }
        public List<UserPermission> Permissions { get; set; } = new();
        public string? RefreshToken { get; set; }

        /// <summary>
        /// The dashboard layout the frontend saved for this user (which widgets, in what order): opaque JSON owned by the
        /// frontend, never interpreted here. Null = the frontend's default (frontend-requests 6.3).
        /// </summary>
        public string? DashboardLayout { get; set; }
        public DateTime? ExpireRefreshToken { get; set; }

        /// <summary>
        /// Set when a manager resets the password: until the user picks their own, every request but
        /// changing it (and logging out) is refused. Cleared by ChangePasswordCommand.
        /// </summary>
        public bool MustChangePassword { get; set; }

        /// <summary>Wrong passwords since the last successful login or lockout; reset to 0 by either.</summary>
        public int FailedLoginCount { get; set; }

        /// <summary>While in the future, login is refused even with the right password.</summary>
        public DateTime? LockoutEnd { get; set; }
    }
}
