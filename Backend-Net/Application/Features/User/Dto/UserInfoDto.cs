using Application.Common.Dtos;

namespace Application.Features.User.Dto
{
    public class UserInfoDto
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public int? TeamId { get; set; }
        public int DepartmentId { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
		public List<UserPermissionDto> Permissions { get; set; }
	}
}
