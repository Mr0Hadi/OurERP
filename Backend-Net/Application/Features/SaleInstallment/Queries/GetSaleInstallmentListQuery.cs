using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.SaleInstallment.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;

namespace Application.Features.SaleInstallment.Queries
{
    public enum SaleInstallmentListSortEnum
    {
        DUE_DATE = 0,
        NUMBER = 1,
        AMOUNT = 2,
        STATUS = 3,
        PAID_AT = 4,
        INVOICE_NUMBER = 5,
        CUSTOMER_NAME = 6,
    }

    /// <summary>
    /// لیست تک‌تک اقساط در سطح کل سیستم. صفحه‌های «سررسیدگذشته» و «پرداخت‌های پیش‌رو» روی
    /// همین اندپوینت ساخته می‌شوند - اندپوینت جداگانه‌ای برای آن‌ها وجود ندارد:
    /// «سررسیدگذشته» یعنی <c>status = PENDING</c> و <c>toDueDate = امروز</c>، که سمت فرانت
    /// ساخته می‌شود.
    /// </summary>
    public class GetSaleInstallmentListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public int? CustomerId { get; set; }
        public int? SaleId { get; set; }
        public int? PlanId { get; set; }
        public SaleInstallmentStatusEnum? Status { get; set; }
        public DateTime? FromDueDate { get; set; }
        public DateTime? ToDueDate { get; set; }
        public DateTime? FromPaidAt { get; set; }
        public DateTime? ToPaidAt { get; set; }
        public SaleInstallmentListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetSaleInstallmentListQueryHandler : IRequestHandler<GetSaleInstallmentListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSaleInstallmentListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSaleInstallmentListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.SaleInstallments.AsQueryable();

            if (request.CustomerId.HasValue)
            {
                query = query.Where(x => x.Plan.Sale.CustomerId == request.CustomerId.Value);
            }

            if (request.SaleId.HasValue)
            {
                query = query.Where(x => x.Plan.SaleId == request.SaleId.Value);
            }

            if (request.PlanId.HasValue)
            {
                query = query.Where(x => x.SaleInstallmentPlanId == request.PlanId.Value);
            }

            if (request.Status.HasValue)
            {
                query = query.Where(x => x.Status == request.Status.Value);
            }

            if (request.FromDueDate.HasValue)
            {
                query = query.Where(x => x.DueDate >= request.FromDueDate.Value);
            }

            if (request.ToDueDate.HasValue)
            {
                query = query.Where(x => x.DueDate <= request.ToDueDate.Value);
            }

            if (request.FromPaidAt.HasValue)
            {
                query = query.Where(x => x.PaidAt >= request.FromPaidAt.Value);
            }

            if (request.ToPaidAt.HasValue)
            {
                query = query.Where(x => x.PaidAt <= request.ToPaidAt.Value);
            }

            // Default: earliest due date first.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.ASC);
            var sorted = request.SortBy switch
            {
                SaleInstallmentListSortEnum.NUMBER => query.SortBy(x => x.Number, direction),
                SaleInstallmentListSortEnum.AMOUNT => query.SortBy(x => x.Amount, direction),
                SaleInstallmentListSortEnum.STATUS => query.SortBy(x => x.Status, direction),
                SaleInstallmentListSortEnum.PAID_AT => query.SortBy(x => x.PaidAt, direction),
                SaleInstallmentListSortEnum.INVOICE_NUMBER => query.SortBy(x => x.Plan.Sale.InvoiceNumber, direction),
                SaleInstallmentListSortEnum.CUSTOMER_NAME => query.SortBy(x => x.Plan.Sale.Customer.FirstName + " " + x.Plan.Sale.Customer.LastName, direction),
                _ => query.SortBy(x => x.DueDate, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).Select(x => new SaleInstallmentListDto
            {
                InstallmentId = x.Id,
                Number = x.Number,
                DueDate = x.DueDate,
                Amount = x.Amount,
                Status = x.Status,
                PaidAt = x.PaidAt,
                PaymentType = x.PaymentType,
                PlanId = x.SaleInstallmentPlanId,
                SaleId = x.Plan.SaleId,
                InvoiceNumber = x.Plan.Sale.InvoiceNumber,
                CustomerId = x.Plan.Sale.CustomerId,
                CustomerName = x.Plan.Sale.Customer.FirstName + " " + x.Plan.Sale.Customer.LastName,
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            // GetDescription یک فراخوانی محلی است و به SQL ترجمه نمی‌شود، پس بعد از
            // materialize شدن صفحه پر می‌شود.
            foreach (var item in paged.Items)
                item.StatusTitle = item.Status.GetDescription();

            res.Data = new
            {
                SaleInstallmentList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست اقساط با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
