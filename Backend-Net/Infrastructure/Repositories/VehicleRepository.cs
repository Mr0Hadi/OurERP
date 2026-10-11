using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class VehicleRepository : GenericRepository<Vehicle>, IVehicleRepository
    {
        private readonly IWMSDbContext _dbContext;
        public VehicleRepository(IWMSDbContext context) : base(context)
        {
            _dbContext = context;
        }

        public override async Task<Vehicle?> GetByIdAsync(object id, CancellationToken cancellationToken = default)
        {
            var vehicleId = Convert.ToInt32(id);
            return await _dbContext.Vehicles.Where(x => x.Id == vehicleId && x.IsActive).FirstOrDefaultAsync(cancellationToken);
        }
    }
}
