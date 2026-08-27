namespace Application.Features.Department.Dtos
{
    public class DepartmentListDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? HeadName { get; set; }
        public string? DeputyName { get; set; }
        public int TeamCount { get; set; }
        public int UserCount { get; set; }
    }
}
