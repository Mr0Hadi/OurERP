using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Queries
{
    /// <summary>
    /// The counts on the units page: units per status, quarantine per custody reason with its value, and how many units still need
    /// a label (IN_STOCK or QUARANTINED, never printed). One grouped query per figure; optionally for one product.
    /// </summary>
    public class GetProductUnitSummaryQuery : IRequest<ResponseDto>
    {
        public int? ProductId { get; set; }
    }

    public class ProductUnitSummaryDto
    {
        public List<ProductUnitStatusCountDto> ByStatus { get; set; } = new();
        public List<ProductUnitQuarantineReasonDto> QuarantineByReason { get; set; } = new();
        public decimal QuarantineValue { get; set; }
        public int UnprintedCount { get; set; }
    }

    public class ProductUnitStatusCountDto
    {
        public ProductUnitStatusEnum Status { get; set; }
        public int Count { get; set; }
    }

    public class ProductUnitQuarantineReasonDto
    {
        /// <summary>Null for quarantined units that carry no custody reason (none are created today; kept honest for old rows).</summary>
        public UnitCustodyReasonEnum? CustodyReason { get; set; }
        public int Count { get; set; }
        public decimal Value { get; set; }
    }

    public class GetProductUnitSummaryQueryHandler : IRequestHandler<GetProductUnitSummaryQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetProductUnitSummaryQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetProductUnitSummaryQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var units = _context.ProductUnits.AsNoTracking().Where(u => u.IsActive);
            if (request.ProductId.HasValue)
                units = units.Where(u => u.ProductId == request.ProductId);

            var byStatus = await units
                .GroupBy(u => u.Status)
                .Select(g => new ProductUnitStatusCountDto { Status = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var byReason = await units
                .Where(u => u.Status == ProductUnitStatusEnum.QUARANTINED)
                .GroupBy(u => u.CustodyReason)
                .Select(g => new ProductUnitQuarantineReasonDto { CustodyReason = g.Key, Count = g.Count(), Value = g.Sum(u => u.QuarantineCost ?? 0m) })
                .ToListAsync(cancellationToken);

            var unprinted = await units.CountAsync(u =>
                (u.Status == ProductUnitStatusEnum.IN_STOCK || u.Status == ProductUnitStatusEnum.QUARANTINED) && u.PrintCount == 0, cancellationToken);

            res.Data = new ProductUnitSummaryDto
            {
                ByStatus = byStatus.OrderBy(x => x.Status).ToList(),
                QuarantineByReason = byReason.OrderBy(x => x.CustodyReason).ToList(),
                QuarantineValue = byReason.Sum(x => x.Value),
                UnprintedCount = unprinted,
            };
            res.Message = "خلاصه‌ی دانه‌ها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
