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
        public string PersonelCode { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastModifiedAt { get; set; }
        public int DepartmentId { get; set; }
        public Department Department { get; set; }
        public int TeamId { get; set; }
        public Team Team { get; set; }
        public int RoleId { get; set; }
        public Role Role { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime? ExpireRefreshToken { get; set; }
    }
}
