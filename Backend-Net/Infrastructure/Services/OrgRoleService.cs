using Application.Common.Contracts.Context;
using Application.Common.Contracts.OrgStructure;
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
    }
}
