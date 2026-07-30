using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Sale.Dtos;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Queries
{
    public class GetSaleDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetSaleDetailQueryHandler : IRequestHandler<GetSaleDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetSaleDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetSaleDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales
                .Include(x => x.Customer)
                .Include(x => x.Item)
                .FirstOrDefaultAsync(x => x.Id == request.Id) ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            res.Data = new SaleDto
            {
                Id = sale.Id,
                InvoiceNumber = sale.InvoiceNumber,
                InvoiceDate = sale.InvoiceDate,
                Status = sale.Status,
                PaymentType = sale.PaymentType,
                TotalAmount = sale.TotalAmount,
                PaidAmount = sale.PaidAmount,
                Description = sale.Description,
                CustomerId = sale.CustomerId,
                CustomerName = sale.Customer.FirstName + " " + sale.Customer.LastName,
                CreatedAt = sale.CreatedAt,
                UpdatedAt = sale.UpdatedAt,
                Items = sale.Item.Select(x => new SaleItemDto
                {
                    ProductId = x.Id,
                    ProductName = x.Name
                }).ToList()
            };

            res.Message = "اطلاعات فروش با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
