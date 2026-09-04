using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Customer.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Customer.Queries
{
    public class GetCustomerListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public int? Id { get; set; }
        public string? FullName { get; set; }
        public UInt64? MinBalance { get; set; }
        public UInt64? MaxBalance { get; set; }
        public BalanceTypeEnum? BalanceType { get; set; }
    }

    public class GetCustomerListQueryHandler : IRequestHandler<GetCustomerListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IObjectStorageService _objectStorageService;
        public GetCustomerListQueryHandler(IWMSDbContext context, IObjectStorageService objectStorageService)
        {
            _context = context;
            _objectStorageService = objectStorageService;
        }
        public async Task<ResponseDto> Handle(GetCustomerListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Customers.AsQueryable();

            if (request.Id.HasValue)
            {
                query = query.Where(x => x.Id == request.Id.Value);
            }

            if (!string.IsNullOrEmpty(request.FullName))
            {
                query = query
                    .Where(x =>
                    x.FirstName.Contains(request.FullName)
                    || x.LastName.Contains(request.FullName));
            }

            if (request.MinBalance.HasValue)
            {
                query = query.Where(x => x.Balance >= request.MinBalance.Value);
            }

            if (request.MaxBalance.HasValue)
            {
                query = query.Where(x => x.Balance <= request.MaxBalance.Value);
            }

            if (request.BalanceType.HasValue)
            {
                query = query.Where(x => x.BalanceType == request.BalanceType.Value);
            }

            var paged = await query.Select(x => new CustomerListDto
            {
                Id = x.Id,
                FirstName = x.FirstName,
                LastName = x.LastName,
                BalanceType = x.BalanceType,
                Balance = x.Balance,
                ImageKey = x.ImageUrl
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            // Signing happens after materialization - GetPresignedUrl is a local method call and
            // could not be translated into the SQL projection above.
            foreach (var item in paged.Items)
                item.ImageUrl = _objectStorageService.GetPresignedUrl(item.ImageKey);

            res.Data = new
            {
                CustomerList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };

            res.Message = "لیست مشتریان با موفقیت ارسال شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
