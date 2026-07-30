using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Queries
{
    public class GetSaleListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? InvoiceNumber { get; set; }
        public string? CustomerName { get; set; }
        public SalesStatusEnum? Status { get; set; }
        public PaymentTypeEnum? PaymentType { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetSaleListQueryHandler : IRequestHandler<GetSaleListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetSaleListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetSaleListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.Sales.AsQueryable();

            if (!string.IsNullOrEmpty(request.InvoiceNumber))
            {
                query = query.Where(x => x.InvoiceNumber.Contains(request.InvoiceNumber));
            }

            if (!string.IsNullOrEmpty(request.CustomerName))
            {
                query = query.Where(x =>
                    (x.Customer.FirstName + " " + x.Customer.LastName).Contains(request.CustomerName));
            }

            if (request.Status.HasValue)
            {
                query = query.Where(x => x.Status == request.Status.Value);
            }

            if (request.PaymentType.HasValue)
            {
                query = query.Where(x => x.PaymentType == request.PaymentType.Value);
            }

            if (request.FromDate.HasValue)
            {
                query = query.Where(x => x.InvoiceDate >= request.FromDate.Value);
            }

            if (request.ToDate.HasValue)
            {
                query = query.Where(x => x.InvoiceDate <= request.ToDate.Value);
            }

            var data = await query.Select(x => new SaleListDto
            {
                Id = x.Id,
                InvoiceNumber = x.InvoiceNumber,
                CustomerId = x.CustomerId,
                CustomerName = x.Customer.FirstName + " " + x.Customer.LastName,
                InvoiceDate = x.InvoiceDate,
                Status = x.Status,
                PaymentType = x.PaymentType,
                TotalAmount = x.TotalAmount,
                PaidAmount = x.PaidAmount
            }).ToPaged(request.Page, request.Take, out int pageCount, out int totalCount).ToListAsync();

            res.Data = new
            {
                SaleList = data,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = pageCount,
                    Take = request.Take,
                    Total = totalCount
                }
            };
            res.Message = "لیست فروش‌ها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
