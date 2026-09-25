using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Storage;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Customer.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Customer.Queries
{
    public enum CustomerListSortEnum
    {
        ID = 0,
        FIRST_NAME = 1,
        LAST_NAME = 2,
        BALANCE = 3,
        BALANCE_TYPE = 4,
    }

    public class GetCustomerListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public int? Id { get; set; }
        public string? FullName { get; set; }
        public UInt64? MinBalance { get; set; }
        public UInt64? MaxBalance { get; set; }
        public BalanceTypeEnum? BalanceType { get; set; }
        public CustomerListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
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

            var query = _context.Customers.Where(x => x.IsActive).AsQueryable().AsNoTracking();

            if (request.Id.HasValue)
            {
                query = query.Where(x => x.Id == request.Id);
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

            // Default: newest first.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.DESC);
            var sorted = request.SortBy switch
            {
                CustomerListSortEnum.FIRST_NAME => query.SortBy(x => x.FirstName, direction),
                CustomerListSortEnum.LAST_NAME => query.SortBy(x => x.LastName, direction),
                CustomerListSortEnum.BALANCE => query.SortBy(x => x.Balance, direction),
                CustomerListSortEnum.BALANCE_TYPE => query.SortBy(x => x.BalanceType, direction),
                _ => query.SortBy(x => x.Id, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).Select(x => new CustomerListDto
            {
                Id = x.Id,
                FirstName = x.FirstName,
                LastName = x.LastName,
                BalanceType = x.BalanceType,
                Balance = x.Balance
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            // After paging, one grouped query for the whole page - same place and reason as signed image URLs.
            var balances = await PartyLedger.CustomerBalancesAsync(_context, paged.Items.Select(x => x.Id).ToList(), cancellationToken);
            foreach (var item in paged.Items)
                item.LedgerBalance = balances.GetValueOrDefault(item.Id);

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
