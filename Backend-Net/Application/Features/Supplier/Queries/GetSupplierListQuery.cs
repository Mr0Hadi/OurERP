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
        public UInt64? MinBalance { get; set; }
        public UInt64? MaxBalance { get; set; }
        public string? CompanyNameOrContactName { get; set; }
        public int? Id { get; set; }
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

            if (request.Id.HasValue)
            {
                query = query.Where(x => x.Id == request.Id);
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

            var paged = await query.Select(x => new SupplierListDto
            {
                Id = x.Id,
                CompanyName = x.CompanyName,
                FirstName = x.FirstName,
                LastName = x.LastName,
                BalanceType = x.BalanceType,
                Balance = x.Balance,
                ImageKey = x.ImageUrl
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            // Signing and Status both happen after materialization - GetPresignedUrl and
            // GetDescription are local calls (reflection over a DescriptionAttribute) and could
            // not be translated into the SQL projection above. Status now goes through the
            // project's shared Common.Extensions.EnumExtensions.GetDescription() (2026-09-01,
            // see docs/frontend-enum-contract.fa.md section 5.3) instead of a raw ToString() -
            // it used to leak the English enum member name ("Creditor"); now it returns the same
            // localized Persian text BalanceTypeEnum's [Description] attributes already drive
            // everywhere else (e.g. Product.Unit.GetDescription() on the return queries). This
            // is still the one string-typed enum field in the API - the value just changed from
            // an English literal to the same display text used elsewhere in the app - so no
            // upstream consumer should be relying on the old "Creditor"/"Debtor"/"Balanced"
            // literal values.
            foreach (var item in paged.Items)
            {
                item.ImageUrl = _objectStorageService.GetPresignedUrl(item.ImageKey);
                item.Status = item.BalanceType.HasValue ? item.BalanceType.Value.GetDescription() : null;
            }

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
