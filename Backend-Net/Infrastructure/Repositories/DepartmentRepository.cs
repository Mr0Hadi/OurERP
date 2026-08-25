using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;

namespace Infrastructure.Repositories
{
    public class DepartmentRepository : GenericRepository<Department>, IDepartmentRepository
    {
        private readonly IWMSDbContext _context;
        public DepartmentRepository(IWMSDbContext context) : base(context)
        {
            _context = context;
        }
    }
}
