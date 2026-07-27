using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Supplier.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Supplier.Queries
{
    public class GetSupplierList : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public UInt64? FromBalance { get; set; }
        public UInt64? ToBalance { get; set; }
        public string? CompanyNameOrContactName { get; set; }
    }

    public class GetSupplierListHandler : IRequestHandler<GetSupplierList, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetSupplierListHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetSupplierList request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Suppliers.AsQueryable();

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

            var data = await query.Select(x => new SupplierListDto
            {
                Id = x.Id,
                CompanyName = x.CompanyName,
                FullName = x.FirstName + " " + x.LastName,
                BalanceType = x.BalanceType,
                Status = x.BalanceType.ToString()
            }).ToPaged(request.Page, request.Take, out int pageCount, out int totalCount).ToListAsync();

            res.Data = new
            {
                SupplierList = data,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = pageCount,
                    Take = request.Take,
                    Total = totalCount
                }
            };

            res.Message = "لیست تامین کنندگان با موفقیت ارسال شد";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
