using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// The single role a user holds inside their department. A user is always in exactly one
    /// department; inside it they are either the department's head/deputy, or a member of one of its
    /// teams (optionally that team's head/deputy), or a plain member with no team.
    ///
    /// The roles are mutually exclusive by design - see <c>IOrgRoleService</c>, which is the only
    /// place allowed to move a user or write a Team/Department HeadId/DeputyId.
    /// </summary>
    public enum OrgRoleEnum
    {
        [Description("عضو")]
        MEMBER = 0,

        [Description("مسئول واحد")]
        DEPARTMENT_HEAD = 1,

        [Description("جانشین واحد")]
        DEPARTMENT_DEPUTY = 2,

        [Description("مسئول تیم")]
        TEAM_HEAD = 3,

        [Description("جانشین تیم")]
        TEAM_DEPUTY = 4,
    }
}
