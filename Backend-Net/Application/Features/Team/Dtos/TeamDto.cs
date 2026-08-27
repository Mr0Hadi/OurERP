namespace Application.Features.Team.Dtos
{
    public class TeamDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public int DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public int? HeadId { get; set; }
        public string? HeadName { get; set; }
        public int? DeputyId { get; set; }
        public string? DeputyName { get; set; }
    }
}
