using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Warehousing.Queries
{
    /// <summary>
    /// Every warehouse with its unit counts, default first then by name. Not paged (a business has a handful). Readable by every
    /// signed-in user: it feeds the warehouse pickers on receiving/shipping/return screens while multi-warehouse is on, and holds
    /// nothing sensitive.
    /// </summary>
    public class GetWarehouseListQuery : IRequest<ResponseDto>
    {
        public bool IncludeInactive { get; set; }
    }

    public class GetWarehouseListQueryHandler : IRequestHandler<GetWarehouseListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetWarehouseListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetWarehouseListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            res.Data = await _context.Warehouses.AsNoTracking()
                .Where(x => request.IncludeInactive || x.IsActive)
                .OrderByDescending(x => x.IsDefault).ThenBy(x => x.Name).ThenBy(x => x.Id)
                .Select(WarehouseReader.Projection(_context))
                .ToListAsync(cancellationToken);
            res.Message = "فهرست انبارها ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
