namespace Application.Features.Team.Dtos
{
    public class TeamListDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? DepartmentName { get; set; }
        public string? HeadName { get; set; }
        public int UserCount { get; set; }
    }
}
