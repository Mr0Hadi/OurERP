namespace Application.Features.Department.Dtos
{
    public class DepartmentDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int? HeadId { get; set; }
        public string? HeadName { get; set; }
        public int? DeputyId { get; set; }
        public string? DeputyName { get; set; }
    }
}
