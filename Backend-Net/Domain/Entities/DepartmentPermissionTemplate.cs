using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One permission in a department's suggested set. The key is <c>(DepartmentId, Permission)</c>,
    /// so a department's rows ARE its template.
    ///
    /// A template grants nothing. <see cref="UserPermission"/> stays the only thing the permission
    /// check reads - a user never inherits from their department. The template exists only so the
    /// admin editing a user (or moving one to another department) can be shown "what people in
    /// this department usually get" and apply it in one click; what they then save is still the
    /// user's own explicit list. Editing a template therefore changes nobody's access.
    /// </summary>
    public class DepartmentPermissionTemplate
    {
        public int DepartmentId { get; set; }
        public Department Department { get; set; }

        public PermissionEnum Permission { get; set; }
    }
}
