using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Purchase.Dtos;
using Common.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Queries
{
    public class GetPurchaseDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetPurchaseDetailQueryHandler : IRequestHandler<GetPurchaseDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetPurchaseDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetPurchaseDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            res.Data = await _context.Purchases.AsNoTracking()
                .Where(x => x.Id == request.Id)
                .Select(x => new PurchaseDto
                {
                    Id = x.Id,
                    InvoiceNumber = x.InvoiceNumber,
                    InvoiceDate = x.InvoiceDate,
                    Status = x.Status,
                    PaymentType = x.PaymentType,
                    TotalAmount = x.TotalAmount,
                    PaidAmount = x.PaidAmount,
                    Description = x.Description,
                    SupplierId = x.SupplierId,
                    SupplierName = x.Supplier.CompanyName,
                    Items = x.Items.Select(i => new PurchaseItemDto
                    {
                        Id = i.Id,
                        ProductId = i.ProductId,
                        ProductName = i.Product.Name,
                        ProductCode = i.Product.Code,
                        Quantity = i.Quantity,
                        UnitPrice = i.UnitPrice,
                        Discount = i.Discount,
                        ReceivedQuantity = i.ReceivedQuantity,
                        SettledQuantity = i.SettledQuantity
                    }).ToList(),
                    PaymentDetails = x.PaymentDetails.Select(p => new PaymentDetailDto
                    {
                        Id = p.Id,
                        Type = p.Type,
                        Amount = p.Amount,
                        CheckNumber = p.CheckNumber,
                        TransferRef = p.TransferRef
                    }).ToList(),
                    Drivers = x.Drivers.Select(d => new PurchaseDriverDto
                    {
                        Id = d.Id,
                        DriverFullName = d.DriverFullName,
                        DriverNationalCode = d.DriverNationalCode,
                        VehiclePlate = d.VehiclePlate,
                        CreatedAt = d.CreatedAt
                    }).ToList(),
                    ReceivingNotes = x.ReceivingNotes.Select(n => new PurchaseReceivingNoteDto
                    {
                        Id = n.Id,
                        Note = n.Note,
                        CreatedAt = n.CreatedAt
                    }).ToList()
                })
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("خرید مورد نظر یافت نشد.");

            res.Message = "اطلاعات خرید با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
