using Domain.Enums;

namespace Application.Features.User.Dto
{
    public class UserListDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Username { get; set; }
        public int PersonelCode { get; set; }
        public int DepartmentId { get; set; }
        public string DepartmentName { get; set; }
        public int? TeamId { get; set; }
        public string? TeamName { get; set; }
        public OrgRoleEnum Role { get; set; }
        public string RoleTitle { get; set; }
        public bool IsActive { get; set; }
    }
}
