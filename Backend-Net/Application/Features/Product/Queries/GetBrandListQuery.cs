using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Product.Queries
{
    /// <summary>
    /// The distinct brands of active products, with how many products carry each, for brand suggestions while typing
    /// (frontend-requests 15.2). Brand is free text on the product; this only reads what is already there. Not paged - the
    /// list of brands is short - but capped at <see cref="MaxRows"/>, most-used first.
    /// </summary>
    public class GetBrandListQuery : IRequest<ResponseDto>
    {
        public string? Search { get; set; }
    }

    public class BrandListDto
    {
        public string Brand { get; set; } = string.Empty;
        public int ProductCount { get; set; }
    }

    public class GetBrandListQueryHandler : IRequestHandler<GetBrandListQuery, ResponseDto>
    {
        public const int MaxRows = 200;

        private readonly IWMSDbContext _context;

        public GetBrandListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetBrandListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Products.Where(x => x.IsActive && x.Brand != null && x.Brand != "");
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.Brand.Contains(search));
            }

            res.Data = await query
                .GroupBy(x => x.Brand.Trim())
                .Select(g => new BrandListDto { Brand = g.Key, ProductCount = g.Count() })
                .OrderByDescending(x => x.ProductCount)
                .ThenBy(x => x.Brand)
                .Take(MaxRows)
                .ToListAsync(cancellationToken);

            res.Message = "لیست برندها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
