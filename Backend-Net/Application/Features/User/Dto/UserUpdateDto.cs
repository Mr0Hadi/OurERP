using Application.Common.Dtos;
using Domain.Enums;

namespace Application.Features.User.Dto
{
	public class UserUpdateDto
	{
		public int Id { get; set; }
		public string Username { get; set; }
		public string FirstName { get; set; }
		public string LastName { get; set; }
        public string PersonelCode { get; set; }
        public int? TeamId { get; set; }
		public int DepartmentId { get; set; }
		public OrgRoleEnum Role { get; set; }
		public string RoleTitle { get; set; }
		public bool IsActive { get; set; }
	}
}
