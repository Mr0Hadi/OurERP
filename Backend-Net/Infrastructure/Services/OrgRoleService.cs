using Application.Common.Contracts.Context;
using Application.Common.Contracts.OrgStructure;
using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public class OrgRoleService : IOrgRoleService
    {
        private readonly IWMSDbContext _context;

        public OrgRoleService(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task ReleaseAllRolesAsync(int userId, CancellationToken cancellationToken = default)
        {
            var teams = await _context.Teams
                .Where(x => x.HeadId == userId || x.DeputyId == userId)
                .ToListAsync(cancellationToken);

            foreach (var team in teams)
            {
                if (team.HeadId == userId) team.HeadId = null;
                if (team.DeputyId == userId) team.DeputyId = null;
            }

            var departments = await _context.Departments
                .Where(x => x.HeadId == userId || x.DeputyId == userId)
                .ToListAsync(cancellationToken);

            foreach (var department in departments)
            {
                if (department.HeadId == userId) department.HeadId = null;
                if (department.DeputyId == userId) department.DeputyId = null;
            }
        }

        public async Task AssignAsync(User user, int departmentId, int? teamId, OrgRoleEnum? role, CancellationToken cancellationToken = default)
        {
            var department = await _context.Departments.FirstOrDefaultAsync(x => x.Id == departmentId, cancellationToken)
                ?? throw new NotFoundCustomException("واحد انتخاب شده یافت نشد");

            Team? team = null;

            if (teamId.HasValue)
            {
                team = await _context.Teams.FirstOrDefaultAsync(x => x.Id == teamId.Value, cancellationToken)
                    ?? throw new NotFoundCustomException("تیم انتخاب شده یافت نشد");

                if (team.DepartmentId != departmentId)
                {
                    throw new ValidationCustomException("تیم انتخاب شده متعلق به این واحد نیست");
                }
            }

            // role == null is "don't touch the role": keep the slot only when the destination is the
            // very team/department that slot belongs to. A head moved to another team keeps nothing -
            // that stale slot is exactly the bug this service exists to prevent.
            var effectiveRole = role ?? CurrentRoleAt(user.Id, department, team);

            if ((effectiveRole == OrgRoleEnum.TEAM_HEAD || effectiveRole == OrgRoleEnum.TEAM_DEPUTY) && team == null)
            {
                throw new ValidationCustomException("برای تعیین مسئول یا جانشین تیم، انتخاب تیم الزامی است");
            }

            if ((effectiveRole == OrgRoleEnum.DEPARTMENT_HEAD || effectiveRole == OrgRoleEnum.DEPARTMENT_DEPUTY) && team != null)
            {
                throw new ValidationCustomException("مسئول یا جانشین واحد نمی‌تواند هم‌زمان عضو یک تیم باشد");
            }

            // Release first, assign second - one user, one role, and no slot left pointing at someone
            // who has moved on.
            await ReleaseAllRolesAsync(user.Id, cancellationToken);

            user.DepartmentId = departmentId;
            user.TeamId = teamId;

            switch (effectiveRole)
            {
                case OrgRoleEnum.DEPARTMENT_HEAD:
                    department.HeadId = user.Id;
                    break;
                case OrgRoleEnum.DEPARTMENT_DEPUTY:
                    department.DeputyId = user.Id;
                    break;
                case OrgRoleEnum.TEAM_HEAD:
                    team!.HeadId = user.Id;
                    break;
                case OrgRoleEnum.TEAM_DEPUTY:
                    team!.DeputyId = user.Id;
                    break;
            }
        }

        public async Task<OrgRoleEnum> GetRoleAsync(int userId, CancellationToken cancellationToken = default)
        {
            var team = await _context.Teams
                .FirstOrDefaultAsync(x => x.HeadId == userId || x.DeputyId == userId, cancellationToken);

            if (team != null)
            {
                return team.HeadId == userId ? OrgRoleEnum.TEAM_HEAD : OrgRoleEnum.TEAM_DEPUTY;
            }

            var department = await _context.Departments
                .FirstOrDefaultAsync(x => x.HeadId == userId || x.DeputyId == userId, cancellationToken);

            if (department != null)
            {
                return department.HeadId == userId ? OrgRoleEnum.DEPARTMENT_HEAD : OrgRoleEnum.DEPARTMENT_DEPUTY;
            }

            return OrgRoleEnum.MEMBER;
        }

        private static OrgRoleEnum CurrentRoleAt(int userId, Department department, Team? team)
        {
            if (team != null)
            {
                if (team.HeadId == userId) return OrgRoleEnum.TEAM_HEAD;
                if (team.DeputyId == userId) return OrgRoleEnum.TEAM_DEPUTY;
                return OrgRoleEnum.MEMBER;
            }

            if (department.HeadId == userId) return OrgRoleEnum.DEPARTMENT_HEAD;
            if (department.DeputyId == userId) return OrgRoleEnum.DEPARTMENT_DEPUTY;
            return OrgRoleEnum.MEMBER;
        }
    }
}
