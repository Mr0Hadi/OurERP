namespace Application.Common.Contracts.OrgStructure
{
    /// <summary>
    /// The one place that knows how a user's head/deputy roles are held and released.
    ///
    /// Team and Department each carry a HeadId and a DeputyId, but only ChangeUserTeamCommand ever
    /// maintained them, and only Team.HeadId at that - so Team.DeputyId and both Department roles
    /// were never released when a user moved or was deleted. Nothing cleared them, so
    /// GetTeamDetailQuery/GetTeamListQuery went on rendering HeadName/DeputyName from a FK pointing
    /// at someone who had left ("stale names"), and because no rule stopped a user from being head
    /// of several teams at once, which name showed up where looked arbitrary.
    /// </summary>
    public interface IOrgRoleService
    {
        /// <summary>
        /// Releases every headship and deputyship this user holds on any team or department.
        /// Call before assigning a new role, and whenever the user leaves or is deactivated.
        /// Stages the changes on the change tracker; the caller still owns SaveChangesAsync.
        /// </summary>
        Task ReleaseAllRolesAsync(int userId, CancellationToken cancellationToken = default);
    }
}
