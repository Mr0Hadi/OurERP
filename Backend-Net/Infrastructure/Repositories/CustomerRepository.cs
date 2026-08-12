using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;

namespace Infrastructure.Repositories
{
    public class CustomerRepository : GenericRepository<Customer>, ICustomerRepository
    {
        private readonly IWMSDbContext _context;
        public CustomerRepository(IWMSDbContext context) : base(context)
        {
            _context = context;
        }
    }
}
