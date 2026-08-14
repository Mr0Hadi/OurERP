namespace Domain.Entities
{
    public class Department
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public bool IsActive { get; set; }
        public int? HeadId { get; set; }
        public User? Head { get; set; }
        public List<Team> Teams { get; set; }
        public List<User> Users { get; set; }
    }
}
