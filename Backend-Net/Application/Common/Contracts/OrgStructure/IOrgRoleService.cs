using Domain.Entities;
using Domain.Enums;

namespace Application.Common.Contracts.OrgStructure
{
    /// <summary>
    /// The one place that knows where a user sits in the org chart and which role they hold there.
    ///
    /// The placement lives in two disagreeing shapes: <c>User.DepartmentId</c>/<c>User.TeamId</c> on
    /// one side, and <c>Team.HeadId</c>/<c>Team.DeputyId</c>/<c>Department.HeadId</c>/
    /// <c>Department.DeputyId</c> on the other. Every handler that wrote one half and forgot the
    /// other left the two out of sync - a user moved on the user page kept their old team's headship,
    /// so the team list/detail pages went on rendering a head who had left.
    ///
    /// Both halves are now written together, here, and nowhere else. The invariants:
    /// <list type="bullet">
    /// <item>a user is in exactly one department;</item>
    /// <item>a user holds at most one role - being a department head and a team member at the same
    /// time is not representable;</item>
    /// <item>a department head/deputy has no team (<c>TeamId == null</c>);</item>
    /// <item>a team head/deputy is a member of that team, in that team's department - so assigning a
    /// role transfers the user if they were somewhere else, in one call.</item>
    /// </list>
    /// </summary>
    public interface IOrgRoleService
    {
        /// <summary>
        /// Releases every headship and deputyship this user holds on any team or department.
        /// Call whenever the user leaves or is deactivated. <see cref="AssignAsync"/> already does it.
        /// Stages the changes on the change tracker; the caller still owns SaveChangesAsync.
        /// </summary>
        Task ReleaseAllRolesAsync(int userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Places <paramref name="user"/> in <paramref name="departmentId"/> (and
        /// <paramref name="teamId"/>, when given) with <paramref name="role"/>, releasing whatever
        /// role they held before - moving between departments in a single call.
        ///
        /// <paramref name="role"/> <c>null</c> means "leave the role alone": the user keeps their
        /// head/deputy slot when the destination is the very team/department that slot belongs to,
        /// and becomes a plain member otherwise. Pass an explicit role to set or clear one.
        ///
        /// Throws when the destination is impossible (unknown department/team, a team outside the
        /// department, a team role with no team, or a department role for someone put in a team).
        /// Stages the changes on the change tracker; the caller still owns SaveChangesAsync.
        /// </summary>
        Task AssignAsync(User user, int departmentId, int? teamId, OrgRoleEnum? role, CancellationToken cancellationToken = default);

        /// <summary>
        /// The role this user currently holds, read back from the Team/Department side.
        /// Returns <see cref="OrgRoleEnum.MEMBER"/> when they hold none.
        /// </summary>
        Task<OrgRoleEnum> GetRoleAsync(int userId, CancellationToken cancellationToken = default);
    }
}
