using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Supplier.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Supplier.Queries
{
    public class GetSupplierListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public UInt64? FromBalance { get; set; }
        public UInt64? ToBalance { get; set; }
        public string? CompanyNameOrContactName { get; set; }
        public BalanceTypeEnum? BalanceType { get; set; }
    }

    public class GetSupplierListQueryHandler : IRequestHandler<GetSupplierListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        public GetSupplierListQueryHandler(IWMSDbContext context, IObjectStorageService objectStorageService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
        }
        public async Task<ResponseDto> Handle(GetSupplierListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Suppliers.Where(x => x.IsActive).AsQueryable();

            if (!string.IsNullOrEmpty(request.CompanyNameOrContactName))
            {
                query = query
                    .Where(x => 
                    x.CompanyName.Contains(request.CompanyNameOrContactName) 
                    || x.FirstName.Contains(request.CompanyNameOrContactName)
                    || x.LastName.Contains(request.CompanyNameOrContactName));
            }

            if (request.FromBalance.HasValue)
            {
                query = query.Where(x => x.Balance >= request.FromBalance.Value);
            }

            if (request.ToBalance.HasValue)
            {
                query = query.Where(x => x.Balance <= request.ToBalance.Value);
            }

            if (request.BalanceType.HasValue)
            {
                query = query.Where(x => x.BalanceType == request.BalanceType.Value);
            }

            var paged = await query.Select(x => new SupplierListDto
            {
                Id = x.Id,
                CompanyName = x.CompanyName,
                FullName = x.FirstName + " " + x.LastName,
                BalanceType = x.BalanceType,
                Status = x.BalanceType.ToString(),
                ImageKey = x.ImageUrl
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            // Signing happens after materialization - GetPresignedUrl is a local method call and
            // could not be translated into the SQL projection above.
            foreach (var item in paged.Items)
                item.ImageUrl = _objectStorageService.GetPresignedUrl(item.ImageKey);

            res.Data = new
            {
                SupplierList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };

            res.Message = "لیست تامین کنندگان با موفقیت ارسال شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
