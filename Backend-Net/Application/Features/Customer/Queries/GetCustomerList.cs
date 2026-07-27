using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Customer.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Customer.Queries
{
    public class GetCustomerList : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public int? Id { get; set; }
        public string? FullName { get; set; }
        public UInt64? MinBalance { get; set; }
        public UInt64? MaxBalance { get; set; }
    }

    public class GetCustomerListHandler : IRequestHandler<GetCustomerList, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetCustomerListHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetCustomerList request, CancellationToken cancellationToken)
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

            var data = await query.Select(x => new CustomerListDto
            {
                Id = x.Id,
                FullName = x.FirstName + " " + x.LastName,
                BalanceType = x.BalanceType,
                Balance = x.Balance
            }).ToPaged(request.Page, request.Take, out int pageCount, out int totalCount).ToListAsync();

            res.Data = new
            {
                CustomerList = data,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = pageCount,
                    Take = request.Take,
                    Total = totalCount
                }
            };

            res.Message = "لیست مشتریان با موفقیت ارسال شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
