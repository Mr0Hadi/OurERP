using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.SaleInstallment.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;

namespace Application.Features.SaleInstallment.Queries
{
    /// <summary>لیست قراردادهای اقساطی.</summary>
    public class GetSaleInstallmentPlanListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public int? CustomerId { get; set; }
        public int? SaleId { get; set; }
        public SaleInstallmentPlanStatusEnum? Status { get; set; }
        public DateTime? FromNextDueDate { get; set; }
        public DateTime? ToNextDueDate { get; set; }
        public DateTime? FromCreatedAt { get; set; }
        public DateTime? ToCreatedAt { get; set; }
    }

    public class GetSaleInstallmentPlanListQueryHandler : IRequestHandler<GetSaleInstallmentPlanListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSaleInstallmentPlanListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// شکل میانیِ سطر لیست. جمع‌ها به‌صورت <c>decimal</c> از SQL می‌آیند چون LINQ روی
        /// <c>UInt64</c> عملگر <c>Sum</c> ندارد؛ تبدیل به <c>UInt64</c> بعد از materialize شدن
        /// صفحه انجام می‌شود - همان‌جایی که امضای URL تصاویر هم انجام می‌شود.
        /// </summary>
        private class PlanRow
        {
            public int PlanId { get; set; }
            public int SaleId { get; set; }
            public string InvoiceNumber { get; set; } = string.Empty;
            public int CustomerId { get; set; }
            public string CustomerName { get; set; } = string.Empty;
            public decimal TotalAmount { get; set; }
            public decimal DownPaymentAmount { get; set; }
            public decimal PaidInstallmentsAmount { get; set; }
            public int InstallmentCount { get; set; }
            public int PaidInstallmentCount { get; set; }
            public DateTime? NextDueDate { get; set; }
            public DateTime? LastInstallmentPaidAt { get; set; }
            public DateTime CreatedAt { get; set; }
            public SaleInstallmentPlanStatusEnum Status { get; set; }
        }

        public async Task<ResponseDto> Handle(GetSaleInstallmentPlanListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.SaleInstallmentPlans.AsQueryable();

            if (request.CustomerId.HasValue)
            {
                query = query.Where(x => x.Sale.CustomerId == request.CustomerId.Value);
            }

            if (request.SaleId.HasValue)
            {
                query = query.Where(x => x.SaleId == request.SaleId.Value);
            }

            if (request.Status.HasValue)
            {
                query = query.Where(x => x.Status == request.Status.Value);
            }

            if (request.FromNextDueDate.HasValue)
            {
                query = query.Where(x => x.Installments
                    .Where(i => i.Status == SaleInstallmentStatusEnum.PENDING || i.Status == SaleInstallmentStatusEnum.OVERDUE)
                    .Min(i => (DateTime?)i.DueDate) >= request.FromNextDueDate.Value);
            }

            if (request.ToNextDueDate.HasValue)
            {
                query = query.Where(x => x.Installments
                    .Where(i => i.Status == SaleInstallmentStatusEnum.PENDING || i.Status == SaleInstallmentStatusEnum.OVERDUE)
                    .Min(i => (DateTime?)i.DueDate) <= request.ToNextDueDate.Value);
            }

            if (request.FromCreatedAt.HasValue)
            {
                query = query.Where(x => x.CreatedAt >= request.FromCreatedAt.Value);
            }

            if (request.ToCreatedAt.HasValue)
            {
                query = query.Where(x => x.CreatedAt <= request.ToCreatedAt.Value);
            }

            // roll-upهای [NotMapped] پلن به SQL ترجمه نمی‌شوند، پس جمع‌ها اینجا صریح نوشته شده‌اند.
            var paged = await query.OrderByDescending(x => x.Id).Select(x => new PlanRow
            {
                PlanId = x.Id,
                SaleId = x.SaleId,
                InvoiceNumber = x.Sale.InvoiceNumber,
                CustomerId = x.Sale.CustomerId,
                CustomerName = x.Sale.Customer.FirstName + " " + x.Sale.Customer.LastName,
                TotalAmount = (decimal)x.TotalAmount,
                DownPaymentAmount = (decimal)x.DownPaymentAmount,
                PaidInstallmentsAmount = x.Installments
                    .Where(i => i.Status == SaleInstallmentStatusEnum.PAID)
                    .Sum(i => (decimal)i.Amount),
                InstallmentCount = x.InstallmentCount,
                PaidInstallmentCount = x.Installments.Count(i => i.Status == SaleInstallmentStatusEnum.PAID),
                NextDueDate = x.Installments
                    .Where(i => i.Status == SaleInstallmentStatusEnum.PENDING || i.Status == SaleInstallmentStatusEnum.OVERDUE)
                    .Min(i => (DateTime?)i.DueDate),
                LastInstallmentPaidAt = x.Installments
                    .Where(i => i.Status == SaleInstallmentStatusEnum.PAID)
                    .Max(i => i.PaidAt),
                CreatedAt = x.CreatedAt,
                Status = x.Status,
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            var items = paged.Items.Select(row =>
            {
                var paidAmount = (UInt64)(row.DownPaymentAmount + row.PaidInstallmentsAmount);
                var totalAmount = (UInt64)row.TotalAmount;

                return new SaleInstallmentPlanListDto
                {
                    PlanId = row.PlanId,
                    SaleId = row.SaleId,
                    InvoiceNumber = row.InvoiceNumber,
                    CustomerId = row.CustomerId,
                    CustomerName = row.CustomerName,
                    TotalAmount = totalAmount,
                    PaidAmount = paidAmount,
                    RemainingAmount = totalAmount > paidAmount ? totalAmount - paidAmount : 0UL,
                    InstallmentCount = row.InstallmentCount,
                    PaidInstallmentCount = row.PaidInstallmentCount,
                    NextDueDate = row.NextDueDate,
                    // اگر هیچ قسطی پرداخت نشده باشد، آخرین پرداخت همان پیش‌پرداخت است - که
                    // هم‌زمان با ساخت پلن ثبت شده.
                    LastPaymentDate = row.LastInstallmentPaidAt ?? row.CreatedAt,
                    Status = row.Status,
                    StatusTitle = row.Status.GetDescription(),
                };
            }).ToList();

            res.Data = new
            {
                SaleInstallmentPlanList = items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست قراردادهای اقساطی با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
