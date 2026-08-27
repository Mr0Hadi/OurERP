namespace Domain.Entities
{
    public class Team
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool IsActive { get; set; }
        public int DepartmentId { get; set; }
        public Department Department { get; set; }
        public int? HeadId { get; set; }
        public User? Head { get; set; }
        public int? DeputyId { get; set; }
        public User? Deputy { get; set; }
        public List<User> Users { get; set; }
    }
}
